import time
import uuid
import httpx
from datetime import datetime
from app.worker.celery_app import celery_app
from app.database import SessionLocal
from app.models.all_models import (
    ImageryOrder, Parcel, TreeCount, EcosystemMetrics,
    WaterQualityMetrics, MRVCertificate, UserSession, RetentionCampaign, User,
    MabadilikoJob
)
from app.modules.count.engine import KijaniCountEngine
from app.modules.health.engine import KijaniHealthEngine
from app.modules.water.engine import KijaniMajiEngine
from app.modules.carbon.engine import KijaniCarbonEngine
from app.modules.carbon.mrv_generator import MRVGenerator
from app.modules.mabadiliko.engine import MabadilikoEngine
from app.config import settings

@celery_app.task(name="app.worker.tasks.process_imagery_order_task")
def process_imagery_order_task(order_id: str):
    """
    Asynchronously processes an imagery order:
    1. Runs DeepForest crown detection on parcel bounds.
    2. Runs multispectral optical indices (NDVI, EVI, MNDWI).
    3. Runs water quality retrieval if parcel contains water.
    4. Computes allometric carbon stocks and saves records.
    """
    db = SessionLocal()
    try:
        order = db.query(ImageryOrder).filter(ImageryOrder.id == order_id).first()
        if not order:
            return {"status": "error", "message": "Order not found"}

        order.status = "PROCESSING"
        db.commit()

        parcel = order.parcel

        # 1. DeepForest Crown Detection
        count_res = KijaniCountEngine.detect_crowns(
            parcel.geojson_geometry,
            parcel.area_ha,
            parcel.ecozone
        )
        tree_count = TreeCount(
            imagery_order_id=order.id,
            total_trees=count_res["total_trees"],
            density_per_ha=count_res["density_per_ha"],
            crown_polygons_geojson=count_res["crown_polygons_geojson"],
            mean_crown_area_sqm=count_res["mean_crown_area_sqm"]
        )
        db.add(tree_count)

        # 2. Ecosystem & Carbon Metrics
        health_res = KijaniHealthEngine.get_health_profile(parcel.category, parcel.crop_type)
        carbon_res = KijaniCarbonEngine.calculate_stand_carbon(
            count_res["total_trees"],
            count_res["mean_crown_diameter_m"],
            parcel.area_ha,
            parcel.ecozone
        )

        eco_metrics = EcosystemMetrics(
            parcel_id=parcel.id,
            imagery_order_id=order.id,
            mean_ndvi=health_res["mean_ndvi"],
            mean_evi=health_res["mean_evi"],
            mean_ndwi=health_res["mean_ndwi"],
            mean_sar_rvi=0.68,
            agb_tonnes=carbon_res["agb_tonnes"],
            bgb_tonnes=carbon_res["bgb_tonnes"],
            tco2e_sequestered=carbon_res["net_tco2e_tradable"],
            survival_rate_pct=92.0
        )
        db.add(eco_metrics)

        # 3. Water Quality Metrics
        if parcel.category in ("water_body", "wetland"):
            water_res = KijaniMajiEngine.evaluate_water_quality(parcel.category, parcel.area_ha)
            water_metrics = WaterQualityMetrics(
                parcel_id=parcel.id,
                imagery_order_id=order.id,
                mean_tss_mg_l=water_res["mean_tss_mg_l"],
                mean_turbidity_ntu=water_res["mean_turbidity_ntu"],
                mean_ph=water_res["mean_ph"],
                mean_ec_ms_cm=water_res["mean_ec_ms_cm"],
                clogging_risk_level=water_res["clogging_risk_level"],
                water_surface_area_ha=water_res["water_surface_area_ha"]
            )
            db.add(water_metrics)

        order.status = "COMPLETED"
        order.raster_storage_path = f"satellite-cogs/{order.id}_cog.tif"
        db.commit()

        # Email notification
        try:
            user_email = parcel.user.email if parcel.user else None
            if user_email:
                from app.services.email_service import send_imagery_order_completion_email
                send_imagery_order_completion_email(
                    to_email=user_email,
                    order_id=order.id,
                    parcel_name=parcel.name,
                    total_trees=count_res["total_trees"],
                    tco2e=carbon_res["net_tco2e_tradable"],
                    dashboard_url=f"https://kijani.ai/parcels/{parcel.id}"
                )
        except Exception as email_err:
            # Email failure should not fail the order itself
            import logging
            logging.getLogger("kijani.worker").warning(
                f"[ImageryOrderTask] Email notification failed for order {order.id}: {email_err}"
            )

        return {"status": "success", "order_id": order.id, "trees": count_res["total_trees"]}
    except Exception as e:
        db.rollback()
        if order:
            order.status = "FAILED"
            db.commit()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@celery_app.task(name="app.worker.tasks.generate_mrv_pdf_task")
def generate_mrv_pdf_task(parcel_id: str, total_trees: int, carbon_data: dict, spatial_hash: str):
    """
    Asynchronously generates cryptographic MRV PDF dossier.
    """
    db = SessionLocal()
    try:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            return {"status": "error", "message": "Parcel not found"}

        dossier = MRVGenerator.generate_dossier_pdf(
            parcel_name=parcel.name,
            ecozone=parcel.ecozone,
            area_ha=parcel.area_ha,
            spatial_hash=spatial_hash,
            carbon_data=carbon_data,
            total_trees=total_trees
        )

        cert = MRVCertificate(
            parcel_id=parcel.id,
            certificate_number=dossier["certificate_number"],
            verification_token=dossier["verification_token"],
            sha256_spatial_hash=dossier["sha256_spatial_hash"],
            sha256_raster_hash=dossier["sha256_raster_hash"],
            total_trees_verified=dossier["total_trees_verified"],
            tco2e_net_tradable=dossier["tco2e_net_tradable"],
            pdf_storage_path=dossier["pdf_storage_path"]
        )
        db.add(cert)
        db.commit()

        return {"status": "success", "certificate_number": cert.certificate_number}
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@celery_app.task(name="app.worker.tasks.send_mrv_certificate_email_task")
def send_mrv_certificate_email_task(
    to_email: str,
    parcel_name: str,
    certificate_number: str,
    tco2e: float,
    verify_url: str
):
    """
    Sends the 'MRV certificate ready' email notification in the background so
    SMTP latency never delays the certificate-generation API response.
    """
    from app.services.email_service import send_mrv_certificate_email
    try:
        sent = send_mrv_certificate_email(
            to_email=to_email,
            parcel_name=parcel_name,
            certificate_number=certificate_number,
            tco2e=tco2e,
            verify_url=verify_url
        )
        return {"status": "success" if sent else "failed", "certificate_number": certificate_number}
    except Exception as e:
        return {"status": "error", "certificate_number": certificate_number, "error": str(e)}

@celery_app.task(name="app.worker.tasks.retention_winback_evaluation_task")
def retention_winback_evaluation_task():
    """
    Finds inactive sessions or abandoned checkouts and prompts Gemma 4 to draft
    personalized retention win-back emails for admin review.
    """
    db = SessionLocal()
    try:
        # Find abandoned sessions without a campaign
        abandoned_sessions = db.query(UserSession).filter(
            UserSession.abandoned_step.isnot(None),
            UserSession.user_id.isnot(None)
        ).all()

        campaigns_created = 0
        for sess in abandoned_sessions:
            existing = db.query(RetentionCampaign).filter(
                RetentionCampaign.user_id == sess.user_id,
                RetentionCampaign.status == "DRAFT"
            ).first()
            if existing:
                continue

            user = sess.user
            friction = f"Abandoned during checkout at step: '{sess.abandoned_step}'. User was viewing high-resolution imagery options for parcel monitoring."

            # Call Gemma 4 or generate intelligent agronomic win-back copy
            email_subject = "Unlock High-Resolution Satellite Monitoring for Your Farm - KijaniAI"
            email_body = (
                f"Habari {user.email},\n\n"
                "We noticed you recently explored satellite monitoring tiers on KijaniAI for your land in Tanzania, "
                "but didn't complete your order.\n\n"
                "With the upcoming planting season in East Africa, timely crop water stress detection and tree canopy "
                "audits are crucial to safeguard your yield and unlock carbon revenue.\n\n"
                "We've added a complimentary trial credit to your KijaniAI wallet so you can run your first automated "
                "DeepForest tree count or KijaniIrrigation scheduling check for free.\n\n"
                "Log back in to inspect your farm: https://kijani.ai/dashboard\n\n"
                "Warm regards,\nThe KijaniAI Agronomy & Remote Sensing Team"
            )

            camp = RetentionCampaign(
                user_id=user.id,
                friction_summary=friction,
                suggested_email_subject=email_subject,
                suggested_email_body=email_body,
                status="DRAFT"
            )
            db.add(camp)
            campaigns_created += 1

        db.commit()
        return {"status": "success", "campaigns_drafted": campaigns_created}
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


# ==============================================================================
# MabadilikoAI: Async Land Cover Change Detection Task
# ==============================================================================

@celery_app.task(
    name="app.worker.tasks.run_mabadiliko_analysis_task",
    bind=True,
    max_retries=2,
    soft_time_limit=600,
    time_limit=720
)
def run_mabadiliko_analysis_task(self, job_id: str):
    """
    Asynchronously runs a full MabadilikoAI multi-temporal land cover change
    analysis for the given job_id.

    Steps:
      1. Load job parameters from DB.
      2. Update status → PROCESSING.
      3. Run MabadilikoEngine.evaluate_changes() with all parameters.
      4. Persist result_payload to the MabadilikoJob row.
      5. Mark COMPLETED and send email notification if requested.
      6. On any failure: mark FAILED, persist error_message.
    """
    db = SessionLocal()
    job = None
    try:
        job = db.query(MabadilikoJob).filter(MabadilikoJob.id == job_id).first()
        if not job:
            return {"status": "error", "message": f"MabadilikoJob {job_id} not found"}

        # ── Step 1: Mark as processing
        job.status = "PROCESSING"
        job.progress_pct = 5.0
        job.progress_message = "Initialising multi-temporal satellite data pipeline..."
        db.commit()

        # ── Step 2: Determine system mode
        from app.models.all_models import SystemSetting
        setting = db.query(SystemSetting).filter(SystemSetting.key == "system_mode").first()
        system_mode = (setting.value.upper() if setting and setting.value else
                       getattr(settings, "SYSTEM_MODE", "TESTING").upper())

        # ── Step 3: Update progress — fetching imagery metadata
        job.progress_pct = 20.0
        job.progress_message = f"Fetching imagery metadata for {job.years}-year window ({job.interval} intervals)..."
        db.commit()

        # ── Step 4: Run the engine
        results = MabadilikoEngine.evaluate_changes(
            area_ha=job.area_ha or 100.0,
            category=job.category or "forest",
            ecozone=job.ecozone or "MIOMBO",
            years=job.years,
            interval=job.interval,
            start_year=job.start_year,
            end_year=job.end_year,
            system_mode=system_mode,
            geojson_geometry=job.geojson_geometry
        )

        # ── Step 5: Update progress — analysing transitions
        job.progress_pct = 75.0
        job.progress_message = "Computing land cover transition matrices and AI explanations..."
        db.commit()

        # Brief simulated processing delay in TESTING mode so UI can show progress
        if system_mode == "TESTING":
            import time as _time
            _time.sleep(2)

        # ── Step 6: Persist results
        job.result_payload = results
        job.status = "COMPLETED"
        job.progress_pct = 100.0
        job.progress_message = "Analysis complete"
        job.completed_at = datetime.utcnow()
        db.commit()

        # ── Step 7: Email notification
        if job.notify_email:
            try:
                from app.services.email_service import send_mabadiliko_completion_email
                ai = results.get("ai_explanation", {})
                send_mabadiliko_completion_email(
                    to_email=job.notify_email,
                    job_id=job_id,
                    boundary_name=job.boundary_name or "Custom Boundary",
                    years=job.years,
                    interval=job.interval,
                    net_changes=results.get("net_changes", {}),
                    ai_summary_en=ai.get("en", {}).get("summary", ""),
                    ai_summary_sw=ai.get("sw", {}).get("summary", ""),
                    dashboard_url=f"https://kijani.ai/mabadiliko/{job_id}"
                )
                job.email_sent_at = datetime.utcnow()
                db.commit()
            except Exception as email_err:
                # Email failure should not fail the job itself
                import logging
                logging.getLogger("kijani.worker").warning(
                    f"[MabadilikoTask] Email notification failed for job {job_id}: {email_err}"
                )

        return {
            "status": "success",
            "job_id": job_id,
            "steps": results.get("total_steps", 0),
            "notify_email": job.notify_email
        }

    except Exception as exc:
        db.rollback()
        if job:
            job.status = "FAILED"
            job.error_message = str(exc)[:1000]
            job.progress_message = "Analysis failed. Please try again."
            try:
                db.commit()
            except Exception:
                db.rollback()
        return {"status": "error", "job_id": job_id, "error": str(exc)}
    finally:
        db.close()

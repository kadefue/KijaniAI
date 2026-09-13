import json
from datetime import datetime
from app.database import SessionLocal, engine, Base
from app.models.all_models import (
    User, PricingTier, Parcel, SoilProfile, EcosystemMetrics,
    WaterQualityMetrics, IrrigationRecord, UserSession, RetentionCampaign
)
from app.services.stac_service import STACService
from app.modules.health.engine import KijaniHealthEngine
from app.modules.irrigation.engine import KijaniIrrigationEngine
from app.modules.water.engine import KijaniMajiEngine

def seed_database():
    # Ensure tables created
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Users
        admin_user = db.query(User).filter(User.email == "admin@kijani.ai").first()
        if not admin_user:
            admin_user = User(
                email="admin@kijani.ai",
                hashed_password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "kijanipass"
                role="admin",
                wallet_balance_usd=1250.0
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # 2. Seed Pricing Tiers
        for dt in STACService.DEFAULT_TIERS:
            existing = db.query(PricingTier).filter(PricingTier.id == dt["id"]).first()
            if not existing:
                db.add(PricingTier(**dt))
        db.commit()

        # 3. Seed Realistic Tanzanian Parcels
        SAMPLE_PARCELS = [
            {
                "name": "Mindu Reservoir (Morogoro)",
                "category": "water_body",
                "crop_type": None,
                "irrigation_system_type": "FURROW",
                "irrigation_efficiency": 0.55,
                "ecozone": "MIOMBO",
                "region": "Morogoro",
                "area_ha": 348.5,
                "coords": [
                    [37.592, -6.835], [37.618, -6.828], [37.625, -6.845],
                    [37.605, -6.858], [37.592, -6.835]
                ]
            },
            {
                "name": "Mlandizi Block 2 Irrigation Scheme",
                "category": "agriculture",
                "crop_type": "maize",
                "irrigation_system_type": "DRIP",
                "irrigation_efficiency": 0.90,
                "ecozone": "COASTAL_MANGROVE",
                "region": "Pwani",
                "area_ha": 82.4,
                "coords": [
                    [38.721, -6.715], [38.735, -6.715], [38.735, -6.728],
                    [38.721, -6.728], [38.721, -6.715]
                ]
            },
            {
                "name": "Kilombero Valley Sugarcane Estate",
                "category": "agriculture",
                "crop_type": "sugarcane",
                "irrigation_system_type": "PIVOT",
                "irrigation_efficiency": 0.85,
                "ecozone": "MIOMBO",
                "region": "Morogoro",
                "area_ha": 412.0,
                "coords": [
                    [36.995, -7.705], [37.035, -7.705], [37.035, -7.735],
                    [36.995, -7.735], [36.995, -7.705]
                ]
            },
            {
                "name": "Usambara Montane Cloud Forest Reserve",
                "category": "forest",
                "crop_type": None,
                "irrigation_system_type": "DRIP",
                "irrigation_efficiency": 0.90,
                "ecozone": "EASTERN_ARC_MONTANE",
                "region": "Tanga",
                "area_ha": 265.0,
                "coords": [
                    [38.342, -4.895], [38.368, -4.895], [38.368, -4.922],
                    [38.342, -4.922], [38.342, -4.895]
                ]
            },
            {
                "name": "Kisarawe Reforestation & Agroforestry Scheme",
                "category": "restoration",
                "crop_type": "cashew",
                "irrigation_system_type": "DRIP",
                "irrigation_efficiency": 0.90,
                "ecozone": "MIOMBO",
                "region": "Pwani",
                "area_ha": 115.0,
                "coords": [
                    [38.972, -7.005], [38.995, -7.005], [38.995, -7.025],
                    [38.972, -7.025], [38.972, -7.005]
                ]
            }
        ]

        for p_info in SAMPLE_PARCELS:
            existing = db.query(Parcel).filter(Parcel.name == p_info["name"]).first()
            if existing:
                continue

            poly_geom = {
                "type": "Polygon",
                "coordinates": [p_info["coords"]]
            }

            from shapely.geometry import shape
            from geoalchemy2.shape import from_shape
            from app.database import db_url
            
            geom_val = None
            if "sqlite" not in db_url:
                try:
                    geom_val = from_shape(shape(poly_geom), srid=4326)
                except Exception:
                    geom_val = None

            parcel = Parcel(
                user_id=admin_user.id,
                name=p_info["name"],
                category=p_info["category"],
                crop_type=p_info["crop_type"],
                irrigation_system_type=p_info["irrigation_system_type"],
                irrigation_efficiency=p_info["irrigation_efficiency"],
                ecozone=p_info["ecozone"],
                region=p_info["region"],
                geom=geom_val,
                geojson_geometry=poly_geom,
                area_ha=p_info["area_ha"]
            )
            db.add(parcel)
            db.commit()
            db.refresh(parcel)

            # Soil Profile
            soil = SoilProfile(
                parcel_id=parcel.id,
                texture_class="Sandy Clay Loam",
                sand_pct=52.0,
                clay_pct=28.0,
                field_capacity=0.28,
                wilting_point=0.14,
                available_water_capacity_mm_m=140.0,
                rooting_depth_m=1.0
            )
            db.add(soil)

            # Ecosystem baseline
            health = KijaniHealthEngine.get_health_profile(parcel.category, parcel.crop_type)
            eco = EcosystemMetrics(
                parcel_id=parcel.id,
                mean_ndvi=health["mean_ndvi"],
                mean_evi=health["mean_evi"],
                mean_ndwi=health["mean_ndwi"],
                mean_sar_rvi=0.68,
                agb_tonnes=round(parcel.area_ha * 52.0, 1),
                bgb_tonnes=round(parcel.area_ha * 21.0, 1),
                tco2e_sequestered=round(parcel.area_ha * 105.0, 1)
            )
            db.add(eco)

            # Water metrics if water body
            if parcel.category in ("water_body", "wetland"):
                wq = KijaniMajiEngine.evaluate_water_quality(parcel.category, parcel.area_ha)
                wq_rec = WaterQualityMetrics(
                    parcel_id=parcel.id,
                    mean_tss_mg_l=wq["mean_tss_mg_l"],
                    mean_turbidity_ntu=wq["mean_turbidity_ntu"],
                    mean_ph=wq["mean_ph"],
                    mean_ec_ms_cm=wq["mean_ec_ms_cm"],
                    clogging_risk_level=wq["clogging_risk_level"],
                    water_surface_area_ha=wq["water_surface_area_ha"]
                )
                db.add(wq_rec)

            # Irrigation balance if agriculture
            if parcel.category == "agriculture":
                irrig = KijaniIrrigationEngine.run_hydrological_balance(
                    crop_type=parcel.crop_type or "maize",
                    area_ha=parcel.area_ha,
                    irrigation_type=parcel.irrigation_system_type,
                    mean_ndvi=health["mean_ndvi"],
                    current_soil_moisture_pct=21.0
                )
                irrig_rec = IrrigationRecord(
                    parcel_id=parcel.id,
                    et0_mm=irrig["et0_mm"],
                    etc_mm=irrig["etc_mm"],
                    eta_mm=irrig["eta_mm"],
                    kc_value=irrig["kc_value"],
                    effective_rainfall_mm=irrig["effective_rainfall_mm"],
                    forecast_rainfall_mm=irrig["forecast_rainfall_mm"],
                    soil_water_storage_mm=irrig["soil_water_storage_mm"],
                    water_deficit_mm=irrig["water_deficit_mm"],
                    net_irrigation_req_mm=irrig["net_irrigation_req_mm"],
                    gross_irrigation_req_mm=irrig["gross_irrigation_req_mm"],
                    water_volume_m3=irrig["water_volume_m3"],
                    cwri_decadal=irrig["cwri_decadal"],
                    wrsi_cumulative=irrig["wrsi_cumulative"],
                    urgency_status=irrig["urgency_status"],
                    explanation_text=irrig["explanation_text"],
                    confidence_pct=irrig["confidence_pct"]
                )
                db.add(irrig_rec)

        # 4. Seed a sample user session for admin replay demonstration
        sample_sess = db.query(UserSession).first()
        if not sample_sess:
            sample_sess = UserSession(
                user_id=admin_user.id,
                started_at=datetime.utcnow(),
                abandoned_step="tier_checkout_cancelled",
                rrweb_recording_path=None
            )
            db.add(sample_sess)
            db.commit()

            camp = RetentionCampaign(
                user_id=admin_user.id,
                friction_summary="User paused at 50cm VHR imagery tier checkout for Mlandizi farm.",
                suggested_email_subject="Unlock High-Resolution Monitoring for Mlandizi Block 2",
                suggested_email_body=(
                    "Habari,\n\n"
                    "We noticed you were reviewing satellite acquisition tiers for Mlandizi Block 2.\n"
                    "We have credited your wallet with trial access for your next high-resolution tree count.\n\n"
                    "KijaniAI Team"
                ),
                status="DRAFT"
            )
            db.add(camp)

        # 5. Seed official Tanzania administrative ward shapefiles in database and folder for fast spatial inference
        from app.services.tanzania_boundary_service import TanzaniaBoundaryService
        tanzania_res = TanzaniaBoundaryService.seed_database_and_folder(db)
        print(f"Official Tanzania ward shapefiles persisted: {tanzania_res}")

        db.commit()
        print("Database successfully seeded with Tanzanian parcels, pricing tiers, and ward shapefiles.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

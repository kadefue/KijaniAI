"""
MabadilikoAI Router
====================
Provides endpoints for:
  1. Synchronous instant analysis (existing parcel + quick custom boundary)
  2. Asynchronous long-running job submission (submit → poll → results)
  3. Email notification registration for long jobs
  4. Tanzania ecological basin benchmarks
"""
import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.all_models import Parcel, SystemSetting, MabadilikoJob
from app.modules.mabadiliko.engine import MabadilikoEngine
from app.services.geometry_parser import GeometryParser
from app.config import settings

router = APIRouter(prefix="/modules/mabadiliko", tags=["MabadilikoAI - Land Cover Change Dynamics"])


# ──────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────────────────────────────────────

class BoundaryAnalysisRequest(BaseModel):
    """Payload for synchronous (instant) boundary analysis."""
    name: Optional[str] = "Prescribed Boundary Area"
    category: Optional[str] = "forest"
    ecozone: Optional[str] = "MIOMBO"
    area_ha: Optional[float] = None
    geojson_geometry: Dict[str, Any]
    years: int = Field(default=10, ge=1, le=10)
    interval: str = Field(default="monthly", description="monthly | bi-monthly | quarterly | bi-annually | annually")
    start_year: Optional[int] = None
    end_year: Optional[int] = None


class AsyncJobRequest(BaseModel):
    """Payload for submitting a long-running MabadilikoAI analysis job."""
    boundary_name: Optional[str] = "Custom Boundary"
    boundary_type: Optional[str] = "custom"   # parcel | ward | district | region | forest_reserve | custom
    parcel_id: Optional[str] = None
    geojson_geometry: Dict[str, Any]
    area_ha: Optional[float] = None
    category: Optional[str] = "forest"
    ecozone: Optional[str] = "MIOMBO"
    years: int = Field(default=10, ge=1, le=10)
    interval: str = Field(default="monthly")
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    notify_email: Optional[str] = None   # If provided → sends email on completion


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_system_mode(db: Session) -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == "system_mode").first()
    if setting and setting.value:
        return setting.value.upper()
    return getattr(settings, "SYSTEM_MODE", "TESTING").upper()


def _job_to_response(job: MabadilikoJob) -> Dict[str, Any]:
    return {
        "job_id":           job.id,
        "celery_task_id":   job.celery_task_id,
        "boundary_name":    job.boundary_name,
        "boundary_type":    job.boundary_type,
        "years":            job.years,
        "interval":         job.interval,
        "status":           job.status,
        "progress_pct":     job.progress_pct,
        "progress_message": job.progress_message,
        "error_message":    job.error_message,
        "notify_email":     job.notify_email,
        "created_at":       job.created_at.isoformat() if job.created_at else None,
        "completed_at":     job.completed_at.isoformat() if job.completed_at else None,
        "result_payload":   job.result_payload if job.status == "COMPLETED" else None,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Metadata Endpoint
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/supported-intervals")
def get_supported_intervals():
    """Returns supported temporal sampling intervals and constraints for MabadilikoAI."""
    return {
        "max_years": MabadilikoEngine.MAX_YEARS,
        "supported_intervals": [
            {"id": "monthly",      "label_en": "Monthly (1 Mo)",       "label_sw": "Kila Mwezi",         "step_months": 1},
            {"id": "bi-monthly",   "label_en": "Bi-Monthly (2 Mo)",    "label_sw": "Kila Miezi 2",       "step_months": 2},
            {"id": "quarterly",    "label_en": "Quarterly (3 Mo)",     "label_sw": "Robo Mwaka",         "step_months": 3},
            {"id": "bi-annually",  "label_en": "Bi-Annually (6 Mo)",   "label_sw": "Nusu Mwaka",         "step_months": 6},
            {"id": "annually",     "label_en": "Annually (1 Yr)",      "label_sw": "Kila Mwaka",         "step_months": 12},
        ],
        "classes": [
            {"id": "vegetation_forest",    "label_en": "Vegetation & Forest Cover",        "label_sw": "Uoto wa Asili na Misitu",      "color": "#10b981"},
            {"id": "water_sources",        "label_en": "Water Sources & Wetlands",         "label_sw": "Vyanzo vya Maji na Mabwawa",   "color": "#0284c7"},
            {"id": "built_up_structures",  "label_en": "Built-Up Structures & Settlements","label_sw": "Makazi na Majengo",            "color": "#f59e0b"},
            {"id": "bare_soil",            "label_en": "Bare Soil & Degraded Ground",      "label_sw": "Ardhi Tupu na Iliyomomonyoka", "color": "#ef4444"},
        ]
    }


# ──────────────────────────────────────────────────────────────────────────────
# Synchronous (Instant) Endpoints — existing parcel & quick analysis
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{parcel_id}/changes")
def get_parcel_decadal_changes(
    parcel_id: str,
    years: int = Query(default=10, ge=1, le=10, description="Time window in years (max 10)"),
    interval: str = Query(default="monthly"),
    start_year: Optional[int] = Query(default=None),
    end_year: Optional[int] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Synchronous: Evaluates historical multi-temporal land cover changes for a registered parcel.
    Returns results immediately (no email notification).
    """
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    mode = _get_system_mode(db)

    try:
        results = MabadilikoEngine.evaluate_changes(
            area_ha=parcel.area_ha,
            category=parcel.category,
            ecozone=parcel.ecozone,
            years=years,
            interval=interval,
            start_year=start_year,
            end_year=end_year,
            system_mode=mode,
            geojson_geometry=parcel.geojson_geometry
        )
        return {"parcel_id": parcel.id, "parcel_name": parcel.name, "region": parcel.region, **results}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/analyze-boundary")
def analyze_custom_boundary_changes(
    payload: BoundaryAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Synchronous: Analyzes multi-temporal land cover changes for any prescribed boundary.
    Use this for fast instant results. For long jobs with email alerts use /jobs/submit.
    """
    mode = _get_system_mode(db)

    area_ha = payload.area_ha
    if not area_ha or area_ha <= 0:
        try:
            area_ha = GeometryParser.calculate_area_hectares(payload.geojson_geometry)
        except Exception:
            area_ha = 150.0

    try:
        results = MabadilikoEngine.evaluate_changes(
            area_ha=area_ha,
            category=payload.category or "forest",
            ecozone=payload.ecozone or "MIOMBO",
            years=payload.years,
            interval=payload.interval,
            start_year=payload.start_year,
            end_year=payload.end_year,
            system_mode=mode,
            geojson_geometry=payload.geojson_geometry
        )
        return {"boundary_name": payload.name, **results}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


# ──────────────────────────────────────────────────────────────────────────────
# Asynchronous Job Endpoints — Submit / Poll / Results
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/jobs/submit", status_code=202)
def submit_mabadiliko_job(
    payload: AsyncJobRequest,
    db: Session = Depends(get_db)
):
    """
    Submits a long-running MabadilikoAI analysis as a background Celery task.

    The client receives a job_id immediately (HTTP 202 Accepted) and should
    poll GET /jobs/{job_id}/status until status == COMPLETED | FAILED.

    If notify_email is provided, a bilingual (English + Swahili) HTML email
    will be sent to that address upon completion.
    """
    area_ha = payload.area_ha
    if not area_ha or area_ha <= 0:
        try:
            area_ha = GeometryParser.calculate_area_hectares(payload.geojson_geometry)
        except Exception:
            area_ha = 150.0

    # Persist the job row
    job = MabadilikoJob(
        id=str(uuid.uuid4()),
        boundary_name=payload.boundary_name,
        boundary_type=payload.boundary_type,
        parcel_id=payload.parcel_id,
        geojson_geometry=payload.geojson_geometry,
        area_ha=area_ha,
        category=payload.category,
        ecozone=payload.ecozone,
        years=payload.years,
        interval=payload.interval,
        start_year=payload.start_year,
        end_year=payload.end_year,
        notify_email=payload.notify_email,
        status="PENDING",
        progress_pct=0.0,
        progress_message="Job queued — waiting for worker"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Dispatch Celery task
    try:
        from app.worker.tasks import run_mabadiliko_analysis_task
        celery_result = run_mabadiliko_analysis_task.delay(job.id)
        job.celery_task_id = celery_result.id
        db.commit()
    except Exception as exc:
        # If Celery/Redis is unavailable, run synchronously inline
        import logging
        logging.getLogger("kijani.mabadiliko").warning(
            f"Celery unavailable, running inline for job {job.id}: {exc}"
        )
        from app.worker.tasks import run_mabadiliko_analysis_task
        run_mabadiliko_analysis_task(job.id)
        db.refresh(job)

    return {
        "message": "Analysis job submitted successfully",
        "job_id":  job.id,
        "status":  job.status,
        "notify_email": job.notify_email,
        "poll_url": f"/api/modules/mabadiliko/jobs/{job.id}/status"
    }


@router.get("/jobs/{job_id}/status")
def get_mabadiliko_job_status(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Polls the status of a submitted MabadilikoAI analysis job.
    When status == COMPLETED, result_payload is included in the response.
    """
    job = db.query(MabadilikoJob).filter(MabadilikoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return _job_to_response(job)


@router.get("/jobs/{job_id}/result")
def get_mabadiliko_job_result(
    job_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns the full analysis result payload for a COMPLETED job.
    """
    job = db.query(MabadilikoJob).filter(MabadilikoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if job.status != "COMPLETED":
        raise HTTPException(
            status_code=409,
            detail=f"Job is not yet complete (status: {job.status})"
        )
    return {
        "job_id":        job.id,
        "boundary_name": job.boundary_name,
        "years":         job.years,
        "interval":      job.interval,
        "completed_at":  job.completed_at.isoformat() if job.completed_at else None,
        **job.result_payload
    }


@router.patch("/jobs/{job_id}/notify")
def register_email_notification(
    job_id: str,
    notify_email: str = Query(..., description="Email address to notify on completion"),
    db: Session = Depends(get_db)
):
    """
    Registers (or updates) an email address for completion notification on
    an existing job. Works even if the job is already running.
    """
    job = db.query(MabadilikoJob).filter(MabadilikoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if job.status == "COMPLETED":
        # Job already done — send the email immediately
        try:
            from app.services.email_service import send_mabadiliko_completion_email
            ai = (job.result_payload or {}).get("ai_explanation", {})
            send_mabadiliko_completion_email(
                to_email=notify_email,
                job_id=job_id,
                boundary_name=job.boundary_name or "Custom Boundary",
                years=job.years,
                interval=job.interval,
                net_changes=(job.result_payload or {}).get("net_changes", {}),
                ai_summary_en=ai.get("en", {}).get("summary", ""),
                ai_summary_sw=ai.get("sw", {}).get("summary", "")
            )
            job.email_sent_at = datetime.utcnow()
        except Exception:
            pass
    job.notify_email = notify_email
    db.commit()
    return {"job_id": job_id, "notify_email": notify_email, "status": job.status}


# ──────────────────────────────────────────────────────────────────────────────
# Tanzania Basin Benchmarks (pre-computed summary)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/tanzania-basins-summary")
def get_tanzania_basins_summary(
    years: int = Query(default=10, ge=1, le=10),
    interval: str = Query(default="annually")
):
    """Pre-computed decadal benchmarks for key ecological basins across Tanzania."""
    basins = [
        {"name": "Mindu Reservoir Catchment (Morogoro)",         "category": "water_body",    "ecozone": "EASTERN_ARC_MONTANE",  "area_ha": 3500.0},
        {"name": "Kilombero Valley Ramsar Wetland (Morogoro)",    "category": "agriculture",   "ecozone": "FLOODPLAIN_ALLUVIAL",  "area_ha": 22000.0},
        {"name": "Usambara Montane Cloud Forest (Tanga)",         "category": "forest",        "ecozone": "EASTERN_ARC_MONTANE",  "area_ha": 14500.0},
        {"name": "Pugu-Kazimzumbwi Forest Corridor (Pwani)",      "category": "forest",        "ecozone": "COASTAL_MANGROVE",     "area_ha": 8900.0},
        {"name": "Lower Moshi Rice Irrigation Scheme (Kilimanjaro)","category": "agriculture", "ecozone": "DRY_SAVANNAH_AGRO",    "area_ha": 4200.0},
    ]
    benchmarks = []
    for b in basins:
        res = MabadilikoEngine.evaluate_changes(
            area_ha=b["area_ha"], category=b["category"], ecozone=b["ecozone"],
            years=years, interval=interval
        )
        benchmarks.append({
            "basin_name":    b["name"],
            "category":      b["category"],
            "ecozone":       b["ecozone"],
            "area_ha":       b["area_ha"],
            "net_changes":   res["net_changes"],
            "ai_summary_en": res["ai_explanation"]["en"]["summary"],
            "ai_summary_sw": res["ai_explanation"]["sw"]["summary"],
            "key_drivers":   res["key_drivers"]
        })

    return {
        "analysis_years": years,
        "interval":       interval,
        "total_basins":   len(benchmarks),
        "basins":         benchmarks
    }

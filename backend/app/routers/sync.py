from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Parcel, FieldSurvey, GroundTruthObservation, User
from app.schemas.schemas import FieldSurveySyncBatch
from app.modules.count.engine import KijaniCountEngine

router = APIRouter(prefix="/sync", tags=["Offline Field Ground-Truthing"])

@router.get("/parcels/{parcel_id}/pack")
def get_offline_field_pack(parcel_id: str, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    # Generate or fetch tree crowns
    crown_res = KijaniCountEngine.detect_crowns(parcel.geojson_geometry, parcel.area_ha, parcel.ecozone)

    return {
        "parcel_id": parcel.id,
        "name": parcel.name,
        "category": parcel.category,
        "crop_type": parcel.crop_type,
        "ecozone": parcel.ecozone,
        "region": parcel.region,
        "area_ha": parcel.area_ha,
        "geojson_geometry": parcel.geojson_geometry,
        "predicted_crowns": crown_res["crown_polygons_geojson"],
        "target_species": [
            "Teak (Tectona grandis)", "Eucalyptus", "Pine (Pinus patula)",
            "Cashew (Korosho)", "Coffee (Kahawa)", "Avocado",
            "Brachystegia (Miombo)", "Pterocarpus angolensis (Muninga)",
            "Rhizophora (Mangrove)"
        ],
        "edge_model_bundle": {
            "dbh_model": "onnx/trunk_edge_estimator_int8.onnx",
            "species_model": "onnx/tanzania_species_classifier_int8.onnx",
            "model_size_mb": 11.4
        },
        "packed_at": datetime.utcnow()
    }

@router.post("/observations")
def sync_field_observations(batch: FieldSurveySyncBatch, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.id == batch.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    user = db.query(User).first()
    survey = FieldSurvey(
        parcel_id=parcel.id,
        surveyor_user_id=user.id if user else "default_user",
        status="SYNCED",
        device_sync_timestamp=datetime.utcnow()
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)

    saved_observations = 0
    for obs in batch.observations:
        g_obs = GroundTruthObservation(
            survey_id=survey.id,
            matched_tree_id=obs.matched_tree_id,
            latitude=obs.latitude,
            longitude=obs.longitude,
            species_identified=obs.species_identified,
            measured_dbh_cm=obs.measured_dbh_cm,
            measured_height_m=obs.measured_height_m,
            edge_model_confidence=obs.edge_model_confidence or 0.90
        )
        db.add(g_obs)
        saved_observations += 1

    db.commit()

    return {
        "status": "SYNCED_SUCCESSFULLY",
        "survey_id": survey.id,
        "observations_saved": saved_observations,
        "message": f"Successfully ingested {saved_observations} edge-measured observations into central database."
    }

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Parcel, SoilProfile, User, EcosystemMetrics, IrrigationRecord, WaterQualityMetrics
from app.schemas.schemas import (
    ParcelOut, ParcelCreate, PredefinedSoilProfileOut, SoilProfileOut, SoilProfileUpdate,
    TanzaniaNBSInfoOut, QuickImportNBSWardRequest
)
from app.services.geometry_parser import GeometryParser
from app.services.tanzania_boundary_service import TanzaniaBoundaryService
from app.modules.health.engine import KijaniHealthEngine
from app.modules.irrigation.engine import KijaniIrrigationEngine
from app.modules.water.engine import KijaniMajiEngine

router = APIRouter(prefix="/parcels", tags=["Parcels & Boundaries"])

PREDEFINED_SOIL_PROFILES = [
    {
        "id": "sandy_clay_loam",
        "texture_class": "Sandy Clay Loam",
        "description": "Moderately fine texture with balanced water retention common across Miombo woodlands & Morogoro basin",
        "sand_pct": 52.0,
        "clay_pct": 28.0,
        "silt_pct": 20.0,
        "field_capacity": 0.28,
        "wilting_point": 0.14,
        "available_water_capacity_mm_m": 140.0,
        "rooting_depth_m": 1.0,
    },
    {
        "id": "clay_vertisol",
        "texture_class": "Clay / Vertisol (Mbuga)",
        "description": "Heavy cracking black soils with high water retention typical in Kilombero valley & Rufiji floodplains",
        "sand_pct": 20.0,
        "clay_pct": 55.0,
        "silt_pct": 25.0,
        "field_capacity": 0.40,
        "wilting_point": 0.22,
        "available_water_capacity_mm_m": 180.0,
        "rooting_depth_m": 1.2,
    },
    {
        "id": "sandy_loam",
        "texture_class": "Sandy Loam",
        "description": "Light, permeable soils with rapid infiltration common in Dodoma & central semi-arid plateaus",
        "sand_pct": 65.0,
        "clay_pct": 12.0,
        "silt_pct": 23.0,
        "field_capacity": 0.20,
        "wilting_point": 0.09,
        "available_water_capacity_mm_m": 110.0,
        "rooting_depth_m": 0.9,
    },
    {
        "id": "volcanic_loam",
        "texture_class": "Volcanic Loam (Andosol)",
        "description": "Rich volcanic soils with porous structure and high fertility around Kilimanjaro, Meru & Rungwe",
        "sand_pct": 40.0,
        "clay_pct": 20.0,
        "silt_pct": 40.0,
        "field_capacity": 0.32,
        "wilting_point": 0.15,
        "available_water_capacity_mm_m": 170.0,
        "rooting_depth_m": 1.5,
    },
    {
        "id": "silty_clay_loam",
        "texture_class": "Silty Clay Loam",
        "description": "Alluvial river floodplains and wetland margins with high moisture buffering capacity",
        "sand_pct": 15.0,
        "clay_pct": 35.0,
        "silt_pct": 50.0,
        "field_capacity": 0.35,
        "wilting_point": 0.18,
        "available_water_capacity_mm_m": 170.0,
        "rooting_depth_m": 1.1,
    },
    {
        "id": "loamy_sand",
        "texture_class": "Loamy Sand",
        "description": "Coarse coastal soils with rapid drainage in Pwani, Bagamoyo, and Dar es Salaam periphery",
        "sand_pct": 82.0,
        "clay_pct": 8.0,
        "silt_pct": 10.0,
        "field_capacity": 0.14,
        "wilting_point": 0.06,
        "available_water_capacity_mm_m": 80.0,
        "rooting_depth_m": 0.8,
    },
    {
        "id": "red_ferralsol",
        "texture_class": "Red Sandy Clay (Ferralsol)",
        "description": "Deep weathered tropical red soils with stable aggregate structure in Southern Highlands (Iringa, Mbeya)",
        "sand_pct": 45.0,
        "clay_pct": 40.0,
        "silt_pct": 15.0,
        "field_capacity": 0.30,
        "wilting_point": 0.16,
        "available_water_capacity_mm_m": 140.0,
        "rooting_depth_m": 1.3,
    }
]

@router.get("/soil-profiles/predefined", response_model=List[PredefinedSoilProfileOut])
def list_predefined_soil_profiles():
    """
    Returns calibrated predefined soil profiles matching Tanzanian agro-ecological zones and FAO classifications.
    """
    return PREDEFINED_SOIL_PROFILES

@router.get("", response_model=List[ParcelOut])
def list_parcels(db: Session = Depends(get_db)):
    return db.query(Parcel).order_by(Parcel.created_at.desc()).all()

@router.get("/{parcel_id}", response_model=ParcelOut)
def get_parcel(parcel_id: str, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel

@router.get("/{parcel_id}/soil-profile", response_model=SoilProfileOut)
def get_parcel_soil_profile(parcel_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the current soil profile and hydraulic parameters for the specified parcel.
    """
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    if not parcel.soil_profile:
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
        db.commit()
        db.refresh(soil)
        return soil

    return parcel.soil_profile

@router.put("/{parcel_id}/soil-profile", response_model=SoilProfileOut)
def update_parcel_soil_profile(parcel_id: str, payload: SoilProfileUpdate, db: Session = Depends(get_db)):
    """
    Updates the soil profile for the specified parcel with either predefined parameters or custom user-defined values.
    """
    parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    soil = parcel.soil_profile
    if not soil:
        soil = SoilProfile(parcel_id=parcel.id)
        db.add(soil)

    if payload.texture_class is not None:
        soil.texture_class = payload.texture_class
    if payload.sand_pct is not None:
        soil.sand_pct = payload.sand_pct
    if payload.clay_pct is not None:
        soil.clay_pct = payload.clay_pct
    if payload.field_capacity is not None:
        soil.field_capacity = payload.field_capacity
    if payload.wilting_point is not None:
        soil.wilting_point = payload.wilting_point
    if payload.rooting_depth_m is not None:
        soil.rooting_depth_m = payload.rooting_depth_m

    if payload.available_water_capacity_mm_m is not None:
        soil.available_water_capacity_mm_m = payload.available_water_capacity_mm_m
    elif soil.field_capacity is not None and soil.wilting_point is not None:
        soil.available_water_capacity_mm_m = round((soil.field_capacity - soil.wilting_point) * 1000.0, 1)

    db.commit()
    db.refresh(soil)
    return soil

@router.post("/upload", response_model=ParcelOut)
async def upload_parcel(
    name: str = Form(...),
    category: str = Form("agriculture"), # forest, agriculture, grassland, wetland, water_body, restoration
    crop_type: Optional[str] = Form("maize"),
    irrigation_system_type: Optional[str] = Form("DRIP"),
    irrigation_efficiency: Optional[float] = Form(0.90),
    ecozone: Optional[str] = Form("MIOMBO"),
    region: Optional[str] = Form("Morogoro"),
    file: Optional[UploadFile] = File(None),
    geojson_data: Optional[str] = Form(None),
    soil_profile_preset: Optional[str] = Form(None),
    soil_texture_class: Optional[str] = Form(None),
    soil_sand_pct: Optional[float] = Form(None),
    soil_clay_pct: Optional[float] = Form(None),
    soil_field_capacity: Optional[float] = Form(None),
    soil_wilting_point: Optional[float] = Form(None),
    soil_rooting_depth_m: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    # Ensure default user exists
    user = db.query(User).first()
    if not user:
        user = User(email="demo@kijani.ai", hashed_password="pw", role="admin", wallet_balance_usd=800.0)
        db.add(user)
        db.commit()
        db.refresh(user)

    geom_dict = None
    area_ha = 10.0
    spatial_hash = ""

    if file:
        filename = file.filename.lower()
        contents = await file.read()
        try:
            if filename.endswith(".zip"):
                geom_dict, area_ha, spatial_hash = GeometryParser.parse_shapefile_zip(contents)
            elif filename.endswith(".kml") or filename.endswith(".kmz"):
                geom_dict, area_ha, spatial_hash = GeometryParser.parse_kml_kmz(contents, filename)
            elif filename.endswith(".csv"):
                geom_dict, area_ha, spatial_hash = GeometryParser.parse_csv(contents.decode("utf-8", errors="ignore"))
            elif filename.endswith(".geojson") or filename.endswith(".json"):
                data = json.loads(contents.decode("utf-8", errors="ignore"))
                geom_dict, area_ha, spatial_hash = GeometryParser.parse_geojson(data)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format. Please upload Shapefile .zip, .kmz, .csv, or .geojson.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Geometry parsing error: {str(e)}")
    elif geojson_data:
        try:
            parsed_json = json.loads(geojson_data)
            geom_dict, area_ha, spatial_hash = GeometryParser.parse_geojson(parsed_json)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid GeoJSON: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Either a geometry file or geojson_data is required.")

    # Create parcel in DB
    from shapely.geometry import shape
    from geoalchemy2.shape import from_shape
    from app.database import db_url

    geom_val = None
    if "sqlite" not in db_url:
        try:
            geom_val = from_shape(shape(geom_dict), srid=4326)
        except Exception:
            geom_val = None

    parcel = Parcel(
        user_id=user.id,
        name=name,
        category=category,
        crop_type=crop_type if category == "agriculture" else None,
        irrigation_system_type=irrigation_system_type or "DRIP",
        irrigation_efficiency=irrigation_efficiency or 0.90,
        ecozone=ecozone or "MIOMBO",
        region=region or "Morogoro",
        geom=geom_val,
        geojson_geometry=geom_dict,
        area_ha=area_ha
    )
    db.add(parcel)
    db.commit()
    db.refresh(parcel)

    # Attach Soil Profile (from preset, custom, or default)
    texture_name = "Sandy Clay Loam"
    sand_val = 52.0
    clay_val = 28.0
    fc_val = 0.28
    pwp_val = 0.14
    rd_val = 1.0

    if soil_profile_preset:
        preset = next((p for p in PREDEFINED_SOIL_PROFILES if p["id"] == soil_profile_preset), None)
        if preset:
            texture_name = preset["texture_class"]
            sand_val = preset["sand_pct"]
            clay_val = preset["clay_pct"]
            fc_val = preset["field_capacity"]
            pwp_val = preset["wilting_point"]
            rd_val = preset["rooting_depth_m"]

    # Override with custom parameters if provided
    if soil_texture_class:
        texture_name = soil_texture_class
    if soil_sand_pct is not None:
        sand_val = soil_sand_pct
    if soil_clay_pct is not None:
        clay_val = soil_clay_pct
    if soil_field_capacity is not None:
        fc_val = soil_field_capacity
    if soil_wilting_point is not None:
        pwp_val = soil_wilting_point
    if soil_rooting_depth_m is not None:
        rd_val = soil_rooting_depth_m

    awc_val = round((fc_val - pwp_val) * 1000.0, 1)

    soil = SoilProfile(
        parcel_id=parcel.id,
        texture_class=texture_name,
        sand_pct=sand_val,
        clay_pct=clay_val,
        field_capacity=fc_val,
        wilting_point=pwp_val,
        available_water_capacity_mm_m=awc_val,
        rooting_depth_m=rd_val
    )
    db.add(soil)

    # Pre-generate baseline analytical records so dashboards are immediately active
    health = KijaniHealthEngine.get_health_profile(parcel.category, parcel.crop_type)
    eco = EcosystemMetrics(
        parcel_id=parcel.id,
        mean_ndvi=health["mean_ndvi"],
        mean_evi=health["mean_evi"],
        mean_ndwi=health["mean_ndwi"],
        mean_sar_rvi=0.65,
        agb_tonnes=round(parcel.area_ha * 48.0, 1),
        bgb_tonnes=round(parcel.area_ha * 18.0, 1),
        tco2e_sequestered=round(parcel.area_ha * 95.0, 1)
    )
    db.add(eco)

    # If agricultural, pre-generate initial hydrological balance with parcel soil profile
    if parcel.category == "agriculture":
        irrig_calc = KijaniIrrigationEngine.run_hydrological_balance(
            crop_type=parcel.crop_type or "maize",
            area_ha=parcel.area_ha,
            irrigation_type=parcel.irrigation_system_type,
            mean_ndvi=health["mean_ndvi"],
            current_soil_moisture_pct=21.5,
            forecast_rainfall_72h_mm=0.0,
            fc_mm_m=fc_val * 1000.0,
            pwp_mm_m=pwp_val * 1000.0,
            rooting_depth_m=rd_val
        )
        irrig_record = IrrigationRecord(
            parcel_id=parcel.id,
            et0_mm=irrig_calc["et0_mm"],
            etc_mm=irrig_calc["etc_mm"],
            eta_mm=irrig_calc["eta_mm"],
            kc_value=irrig_calc["kc_value"],
            effective_rainfall_mm=irrig_calc["effective_rainfall_mm"],
            forecast_rainfall_mm=irrig_calc["forecast_rainfall_mm"],
            soil_water_storage_mm=irrig_calc["soil_water_storage_mm"],
            water_deficit_mm=irrig_calc["water_deficit_mm"],
            net_irrigation_req_mm=irrig_calc["net_irrigation_req_mm"],
            gross_irrigation_req_mm=irrig_calc["gross_irrigation_req_mm"],
            water_volume_m3=irrig_calc["water_volume_m3"],
            cwri_decadal=irrig_calc["cwri_decadal"],
            wrsi_cumulative=irrig_calc["wrsi_cumulative"],
            urgency_status=irrig_calc["urgency_status"],
            explanation_text=irrig_calc["explanation_text"],
            confidence_pct=irrig_calc["confidence_pct"]
        )
        db.add(irrig_record)

    # If water body, pre-generate baseline water quality record
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

    db.commit()
    db.refresh(parcel)
    return parcel


# ==============================================================================
# OFFICIAL TANZANIA NBS 2022 CENSUS WARD BOUNDARIES
# ==============================================================================

@router.get("/tanzania-nbs/info", response_model=TanzaniaNBSInfoOut)
def get_tanzania_nbs_info():
    """
    Returns provenance and download metadata for official Tanzania 2022 Population 
    and Housing Census (PHC) Administrative Ward Shapefiles from NBS Tanzania.
    """
    return TanzaniaBoundaryService.get_dataset_metadata()


@router.get("/tanzania-nbs/catalog")
def get_tanzania_nbs_wards():
    """
    Returns pre-indexed representative Tanzanian wards (Kata) across key ecological 
    and agricultural zones for 1-click boundary importation into KijaniAI.
    """
    return {
        "source": TanzaniaBoundaryService.get_dataset_metadata()["dataset_title"],
        "download_url": TanzaniaBoundaryService.NBS_OFFICIAL_URL,
        "total_catalog_wards": len(TanzaniaBoundaryService.list_wards_catalog()),
        "wards": TanzaniaBoundaryService.list_wards_catalog()
    }


@router.get("/tanzania-nbs/wards")
def get_tanzania_nbs_db_wards(db: Session = Depends(get_db)):
    """
    Returns official Tanzania wards saved in the database with bounding boxes
    and centroids for fast inference.
    """
    wards = TanzaniaBoundaryService.get_all_wards_from_db(db)
    return {
        "count": len(wards),
        "wards": wards
    }


@router.get("/tanzania-nbs/infer-ward")
def infer_tanzania_ward_from_coordinate(
    lat: float = Query(..., description="Latitude of target coordinate (WGS84)"),
    lon: float = Query(..., description="Longitude of target coordinate (WGS84)"),
    db: Session = Depends(get_db)
):
    """
    Sub-millisecond point-in-polygon spatial inference:
    Resolves the exact administrative Ward (Kata), District, Region, and Ecozone
    for any GPS coordinate in Tanzania using database spatial indexing.
    """
    match = TanzaniaBoundaryService.infer_ward_by_coordinate(db, lat=lat, lon=lon)
    if not match:
        raise HTTPException(
            status_code=404,
            detail=f"Coordinate ({lat}, {lon}) could not be resolved to a Tanzania ward in the catalog."
        )
    return {
        "query_coordinate": {"lat": lat, "lon": lon},
        "ward": match
    }


@router.post("/tanzania-nbs/sync-storage")
def sync_tanzania_shapefiles_storage(db: Session = Depends(get_db)):
    """
    Synchronizes the official Tanzania 2022 PHC census ward shapefiles:
    1. Persists records to database 'tanzania_wards' table with spatial bounding boxes.
    2. Exports standard GeoJSON FeatureCollection and metadata to the shapefiles directory.
    """
    result = TanzaniaBoundaryService.seed_database_and_folder(db)
    return result


@router.post("/tanzania-nbs/quick-import", response_model=ParcelOut)
def quick_import_nbs_ward(req: QuickImportNBSWardRequest, db: Session = Depends(get_db)):
    """
    Imports an official 2022 PHC Tanzanian ward boundary directly as an active 
    monitored parcel in KijaniAI.
    """
    ward = TanzaniaBoundaryService.get_ward_by_name(req.ward_name)
    if not ward:
        raise HTTPException(
            status_code=404, 
            detail=f"Ward '{req.ward_name}' not found in representative NBS catalog. Please supply custom shapefile."
        )

    # Format GeoJSON polygon
    geojson_dict = {
        "type": "Polygon",
        "coordinates": ward["coordinates"]
    }

    final_geom, area_ha, spatial_hash = GeometryParser.parse_geojson(geojson_dict)

    user = db.query(User).first()
    user_id = user.id if user else "00000000-0000-0000-0000-000000000001"

    parcel_name = req.custom_name or f"{ward['ward_name']} Ward ({ward['district_name']})"

    parcel = Parcel(
        user_id=user_id,
        name=parcel_name,
        category=ward["category"],
        crop_type=req.crop_type,
        irrigation_system_type=req.irrigation_system_type,
        irrigation_efficiency=0.90 if req.irrigation_system_type == "DRIP" else 0.75,
        area_ha=area_ha,
        region=ward["region_name"],
        ecozone=ward["ecozone"],
        geojson_geometry=final_geom
    )
    db.add(parcel)
    db.flush()

    # Link soil profile default based on ecozone
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

    # Pre-generate baseline water quality if water body
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

    db.commit()
    db.refresh(parcel)
    return parcel

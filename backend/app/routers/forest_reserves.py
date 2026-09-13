from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.forest_reserves_service import ForestReservesService
from app.modules.map.engine import KijaniMapEngine
from app.modules.watch.engine import KijaniWatchEngine
from app.modules.health.engine import KijaniHealthEngine
from app.modules.carbon.engine import KijaniCarbonEngine
from app.routers.modules import _get_system_mode

router = APIRouter(prefix="/forest-reserves", tags=["Tanzania Forest Reserves & Conservation Monitoring"])

@router.get("")
def list_forest_reserves(
    search: Optional[str] = Query(None, description="Search by reserve name, authority or ID"),
    designation: Optional[str] = Query(None, description="Filter by designation: Nature Forest Reserve, Forest Reserve, Sanctuary"),
    iucn_category: Optional[str] = Query(None, description="Filter by IUCN category (II, IV, VI, etc.)"),
    min_ha: Optional[float] = Query(None, description="Minimum area in hectares"),
    max_ha: Optional[float] = Query(None, description="Maximum area in hectares"),
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns paginated list of official Tanzania Forest Reserves from the PostGIS database.
    """
    return ForestReservesService.get_reserves(
        db=db,
        search=search,
        designation=designation,
        iucn_category=iucn_category,
        min_ha=min_ha,
        max_ha=max_ha,
        limit=limit,
        skip=skip
    )

@router.get("/catalog")
def get_forest_reserves_catalog(db: Session = Depends(get_db)):
    """
    Returns nationwide summary statistics of Tanzania's 696 Forest Reserves network,
    including total hectares, designation distributions, and flagship Nature Reserves.
    """
    return ForestReservesService.get_catalog_summary(db)

@router.get("/geojson")
def get_forest_reserves_geojson(
    designation: Optional[str] = Query(None, description="Filter by designation"),
    limit: int = Query(150, ge=1, le=700),
    min_lon: Optional[float] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns an optimized GeoJSON FeatureCollection of forest reserves for MapLibre GL layer rendering.
    """
    bbox = None
    if min_lon is not None and min_lat is not None and max_lon is not None and max_lat is not None:
        bbox = (min_lon, min_lat, max_lon, max_lat)

    return ForestReservesService.get_geojson_feature_collection(
        db=db,
        designation=designation,
        limit=limit,
        bbox=bbox
    )

@router.post("/ingest")
def ingest_forest_reserves(
    force_reload: bool = Query(False, description="Whether to drop existing records and re-parse GeoJSON"),
    db: Session = Depends(get_db)
):
    """
    Loads or re-indexes all 696 official Tanzania Forest Reserves from data/tanzania_forest_reserves into PostGIS.
    """
    res = ForestReservesService.ingest_geojson_to_db(db, force_reload=force_reload)
    return res

@router.get("/{reserve_id}")
def get_forest_reserve_details(reserve_id: str, db: Session = Depends(get_db)):
    """
    Retrieves full details and complete GeoJSON polygon geometry for a specific forest reserve.
    """
    reserve = ForestReservesService.get_reserve_by_id(db, reserve_id)
    if not reserve:
        raise HTTPException(status_code=404, detail=f"Forest Reserve '{reserve_id}' not found.")

    return {
        "id": reserve.id,
        "wdpa_id": reserve.wdpa_id,
        "name": reserve.name,
        "orig_name": reserve.orig_name,
        "designation": reserve.designation,
        "designation_type": reserve.designation_type,
        "iucn_category": reserve.iucn_category,
        "status": reserve.status,
        "status_year": reserve.status_year,
        "governance_type": reserve.governance_type,
        "management_authority": reserve.management_authority,
        "sub_location": reserve.sub_location,
        "gis_area_km2": reserve.gis_area_km2,
        "area_ha": reserve.area_ha,
        "centroid": {"lat": reserve.centroid_lat, "lon": reserve.centroid_lon},
        "bbox": [reserve.bbox_min_lon, reserve.bbox_min_lat, reserve.bbox_max_lon, reserve.bbox_max_lat],
        "geojson_geometry": reserve.geojson_geometry,
        "created_at": reserve.created_at
    }

@router.post("/{reserve_id}/import-to-monitoring")
def import_reserve_as_monitored_parcel(reserve_id: str, db: Session = Depends(get_db)):
    """
    1-Click Import: Activates continuous Land Cover, Deforestation Watch,
    Vegetation Health & Carbon Accounting on an official Tanzania Forest Reserve.
    """
    try:
        res = ForestReservesService.import_reserve_as_monitored_parcel(db, reserve_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{reserve_id}/land-cover")
def get_reserve_land_cover_monitoring(reserve_id: str, db: Session = Depends(get_db)):
    """
    Directly computes land cover classification, vegetation phenology,
    and canopy disturbance alerts over the forest reserve's official boundary.
    """
    reserve = ForestReservesService.get_reserve_by_id(db, reserve_id)
    if not reserve:
        raise HTTPException(status_code=404, detail=f"Forest Reserve '{reserve_id}' not found.")

    mode = _get_system_mode(db)

    # 1. 5-Class LULC Classification
    lulc = KijaniMapEngine.classify_parcel_lulc(
        category="forest",
        area_ha=reserve.area_ha,
        system_mode=mode,
        geojson_geometry=reserve.geojson_geometry
    )

    # 2. Deforestation & Burn Scar Watch
    disturbances = KijaniWatchEngine.analyze_disturbances(
        area_ha=reserve.area_ha,
        category="forest",
        system_mode=mode,
        geojson_geometry=reserve.geojson_geometry
    )

    # 3. Multispectral Health Indices
    health = KijaniHealthEngine.get_health_profile(
        category="forest",
        crop_type=None,
        system_mode=mode,
        geojson_geometry=reserve.geojson_geometry
    )

    # 4. Stand Biomass & Carbon Estimate
    carbon = KijaniCarbonEngine.calculate_stand_carbon(
        total_trees=int(reserve.area_ha * 450), # 450 trees/ha typical dense montane canopy
        mean_crown_diameter_m=6.5,
        area_ha=reserve.area_ha,
        ecozone="EASTERN_ARC_MONTANE",
        system_mode=mode
    )

    return {
        "reserve_id": reserve.id,
        "name": reserve.name,
        "designation": reserve.designation,
        "area_ha": reserve.area_ha,
        "system_mode": mode,
        "land_cover_classification": lulc,
        "disturbance_alerts": disturbances,
        "vegetation_health": health,
        "carbon_metrics": carbon
    }

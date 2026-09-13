import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.tanzania_boundary_service import TanzaniaBoundaryService

client = TestClient(app)

def test_tanzania_boundary_service_metadata():
    meta = TanzaniaBoundaryService.get_dataset_metadata()
    assert "official_download_url" in meta
    assert "nbs.go.tz" in meta["official_download_url"]
    assert "TANZANIA_2022PHC_WARD_SHAPEFILES.zip" in meta["official_download_url"]
    assert meta["census_year"] == 2022
    assert "National Bureau of Statistics" in meta["publisher"]
    assert meta["supported_in_kijani"] is True

def test_tanzania_wards_catalog():
    catalog = TanzaniaBoundaryService.list_wards_catalog()
    assert len(catalog) >= 8
    ward_names = [w["ward_name"] for w in catalog]
    assert "Mindu" in ward_names
    assert "Mlandizi" in ward_names
    assert "Kidatu" in ward_names
    assert "Lushoto" in ward_names

    mindu = TanzaniaBoundaryService.get_ward_by_name("Mindu")
    assert mindu is not None
    assert mindu["region_name"] == "Morogoro"
    assert mindu["category"] == "water_body"
    assert len(mindu["coordinates"][0]) >= 4

def test_tanzania_nbs_info_endpoint():
    resp = client.get("/api/parcels/tanzania-nbs/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["census_year"] == 2022
    assert "https://www.nbs.go.tz" in data["official_download_url"]

def test_tanzania_nbs_catalog_endpoint():
    resp = client.get("/api/parcels/tanzania-nbs/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert "wards" in data
    assert len(data["wards"]) >= 8

def test_tanzania_nbs_quick_import_endpoint():
    payload = {
        "ward_name": "Mindu",
        "custom_name": "Mindu Reservoir 2022 PHC Boundary",
        "crop_type": "water",
        "irrigation_system_type": "DRIP"
    }
    resp = client.post("/api/parcels/tanzania-nbs/quick-import", json=payload)
    assert resp.status_code == 200
    parcel = resp.json()
    assert parcel["name"] == "Mindu Reservoir 2022 PHC Boundary"
    assert parcel["region"] == "Morogoro"
    assert parcel["area_ha"] > 0
    assert "geojson_geometry" in parcel
    assert parcel["geojson_geometry"]["type"] == "Polygon"


def test_tanzania_shapefiles_db_and_folder_storage():
    import os
    import json
    from app.database import SessionLocal
    from app.models.all_models import TanzaniaWard

    db = SessionLocal()
    try:
        res = TanzaniaBoundaryService.seed_database_and_folder(db)
        assert res["status"] == "success"
        assert res["seeded_in_db"] >= 8
        assert res["features_count"] >= 8
        assert os.path.exists(res["geojson_file"])

        # Check DB records
        ward = db.query(TanzaniaWard).filter(TanzaniaWard.ward_code == "TZ040101").first()
        assert ward is not None
        assert ward.ward_name == "Mindu"
        assert ward.region_name == "Morogoro"
        assert ward.centroid_lat < 0  # Southern hemisphere
        assert ward.centroid_lon > 30 # East Africa
        assert ward.bbox_min_lon <= ward.centroid_lon <= ward.bbox_max_lon
        assert ward.bbox_min_lat <= ward.centroid_lat <= ward.bbox_max_lat
        assert ward.geojson_geometry["type"] == "Polygon"

        # Check folder files
        shapefile_dir = TanzaniaBoundaryService.get_shapefiles_dir()
        geojson_path = os.path.join(shapefile_dir, "tanzania_wards_2022.geojson")
        catalog_path = os.path.join(shapefile_dir, "tanzania_wards_catalog.json")
        readme_path = os.path.join(shapefile_dir, "README.md")

        assert os.path.exists(geojson_path)
        assert os.path.exists(catalog_path)
        assert os.path.exists(readme_path)

        with open(geojson_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert data["type"] == "FeatureCollection"
            assert len(data["features"]) >= 8
            first_feat = data["features"][0]
            assert "ward_name" in first_feat["properties"]
            assert "coordinates" in first_feat["geometry"]
    finally:
        db.close()


def test_tanzania_fast_spatial_inference():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        # Mindu coordinates: lon 37.60, lat -6.85
        match = TanzaniaBoundaryService.infer_ward_by_coordinate(db, lat=-6.85, lon=37.60)
        assert match is not None
        assert match["ward_name"] == "Mindu"
        assert match["region_name"] == "Morogoro"
        assert match["match_type"] == "exact_containment"

        # Mlandizi coordinates: lon 38.725, lat -6.705
        match2 = TanzaniaBoundaryService.infer_ward_by_coordinate(db, lat=-6.705, lon=38.725)
        assert match2 is not None
        assert match2["ward_name"] == "Mlandizi"
        assert match2["region_name"] == "Pwani"

        # API endpoint testing
        resp = client.get("/api/parcels/tanzania-nbs/infer-ward?lat=-6.85&lon=37.60")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ward"]["ward_name"] == "Mindu"
        assert data["ward"]["region_name"] == "Morogoro"

        # Wards list endpoint
        resp_wards = client.get("/api/parcels/tanzania-nbs/wards")
        assert resp_wards.status_code == 200
        wards_data = resp_wards.json()
        assert wards_data["count"] >= 8

        # Sync storage endpoint
        resp_sync = client.post("/api/parcels/tanzania-nbs/sync-storage")
        assert resp_sync.status_code == 200
        sync_data = resp_sync.json()
        assert sync_data["status"] == "success"
    finally:
        db.close()


import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.services.forest_reserves_service import ForestReservesService
from app.models.all_models import TanzaniaForestReserve, Parcel

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_forest_reserves():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ForestReservesService.ingest_geojson_to_db(db)
    finally:
        db.close()

def test_forest_reserves_catalog():
    resp = client.get("/api/forest-reserves/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_forest_reserves"] == 696
    assert data["total_protected_area_ha"] > 9000000.0
    assert "designations_breakdown" in data
    assert len(data["designations_breakdown"]) >= 2
    assert "top_flagship_reserves" in data
    assert len(data["top_flagship_reserves"]) > 0

def test_forest_reserves_list_and_search():
    # 1. Default listing
    resp = client.get("/api/forest-reserves?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 696
    assert len(data["reserves"]) == 10
    first = data["reserves"][0]
    assert "id" in first
    assert "name" in first
    assert "area_ha" in first
    assert "centroid" in first
    assert "bbox" in first

    # 2. Search for Mount Hanang
    search_resp = client.get("/api/forest-reserves?search=Hanang")
    assert search_resp.status_code == 200
    s_data = search_resp.json()
    assert s_data["total"] >= 1
    found = any("Hanang" in r["name"] for r in s_data["reserves"])
    assert found is True

    # 3. Filter by Nature Forest Reserve designation
    desig_resp = client.get("/api/forest-reserves?designation=Nature%20Forest%20Reserve")
    assert desig_resp.status_code == 200
    d_data = desig_resp.json()
    assert d_data["total"] == 19
    for r in d_data["reserves"]:
        assert r["designation"] == "Nature Forest Reserve"

def test_forest_reserves_geojson_endpoint():
    resp = client.get("/api/forest-reserves/geojson?limit=25")
    assert resp.status_code == 200
    geojson = resp.json()
    assert geojson["type"] == "FeatureCollection"
    features = geojson["features"]
    assert len(features) == 25
    f0 = features[0]
    assert "geometry" in f0
    assert f0["geometry"]["type"] in ["Polygon", "MultiPolygon"]
    assert "properties" in f0
    assert "name" in f0["properties"]
    assert "area_ha" in f0["properties"]

def test_forest_reserve_details_by_id():
    # Fetch first reserve
    list_resp = client.get("/api/forest-reserves?limit=1")
    reserve_id = list_resp.json()["reserves"][0]["id"]

    resp = client.get(f"/api/forest-reserves/{reserve_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["id"] == reserve_id
    assert "geojson_geometry" in detail
    assert "area_ha" in detail
    assert detail["area_ha"] > 0
    assert "centroid" in detail

def test_forest_reserve_import_to_monitoring():
    # Find a flagship reserve e.g. Mount Hanang
    search_resp = client.get("/api/forest-reserves?search=Hanang")
    reserve = search_resp.json()["reserves"][0]
    reserve_id = reserve["id"]

    # Import into monitoring
    import_resp = client.post(f"/api/forest-reserves/{reserve_id}/import-to-monitoring")
    assert import_resp.status_code == 200
    res = import_resp.json()
    assert res["status"] in ["IMPORTED", "ALREADY_EXISTS"]
    parcel_id = res["parcel_id"]

    # Verify parcel exists in parcels list
    parcels_resp = client.get("/api/parcels")
    assert parcels_resp.status_code == 200
    parcels = parcels_resp.json()
    matching = [p for p in parcels if p["id"] == parcel_id]
    assert len(matching) == 1
    assert matching[0]["category"] == "forest"
    assert matching[0]["area_ha"] == reserve["area_ha"]

def test_forest_reserve_land_cover_monitoring():
    # Pick a reserve
    search_resp = client.get("/api/forest-reserves?limit=1")
    reserve = search_resp.json()["reserves"][0]
    reserve_id = reserve["id"]

    resp = client.get(f"/api/forest-reserves/{reserve_id}/land-cover")
    assert resp.status_code == 200
    data = resp.json()
    assert data["reserve_id"] == reserve_id
    assert "land_cover_classification" in data
    assert "breakdown" in data["land_cover_classification"]
    assert "disturbance_alerts" in data
    assert "burn_severity" in data["disturbance_alerts"]
    assert "vegetation_health" in data
    assert "mean_ndvi" in data["vegetation_health"]
    assert "carbon_metrics" in data
    assert data["carbon_metrics"]["gross_tco2e"] > 0

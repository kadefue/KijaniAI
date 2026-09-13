import pytest
from fastapi.testclient import TestClient
from shapely.geometry import shape, Point
from app.main import app
from app.config import settings
from app.modules.count.engine import KijaniCountEngine

client = TestClient(app)

def test_get_system_mode():
    resp = client.get("/api/admin/system-mode")
    assert resp.status_code == 200
    data = resp.json()
    assert "system_mode" in data
    assert data["system_mode"] in ["TESTING", "PRODUCTION"]
    assert "is_testing_mode" in data
    assert "is_production_mode" in data
    assert "label" in data
    assert "description" in data
    assert "deepforest_available" in data
    assert "active_features" in data
    assert isinstance(data["active_features"], list)
    assert len(data["active_features"]) > 0

def test_toggle_system_mode_transitions():
    # Toggle to PRODUCTION
    resp = client.put("/api/admin/system-mode", json={"system_mode": "PRODUCTION"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["system_mode"] == "PRODUCTION"
    assert data["is_production_mode"] is True
    assert data["is_testing_mode"] is False

    # Check GET confirms change
    resp_get = client.get("/api/admin/system-mode")
    assert resp_get.status_code == 200
    assert resp_get.json()["system_mode"] == "PRODUCTION"

    # Toggle back to TESTING
    resp = client.put("/api/admin/system-mode", json={"system_mode": "TESTING"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["system_mode"] == "TESTING"
    assert data["is_testing_mode"] is True
    assert data["is_production_mode"] is False

    # Test invalid mode rejection
    bad_resp = client.put("/api/admin/system-mode", json={"system_mode": "INVALID_MODE"})
    assert bad_resp.status_code == 400
    assert "Must be 'TESTING' or 'PRODUCTION'" in bad_resp.json()["detail"]

def test_kijani_count_engine_testing_mode():
    sample_parcel_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [37.5, -3.3],
                [37.52, -3.3],
                [37.52, -3.32],
                [37.5, -3.32],
                [37.5, -3.3],
            ]
        ],
    }

    result = KijaniCountEngine.detect_crowns(
        parcel_geojson=sample_parcel_geojson,
        ecozone="Eastern Arc Submontane",
        area_ha=15.0,
        system_mode="TESTING"
    )

    assert result["system_mode"] == "TESTING"
    assert result["total_trees"] > 0
    assert result["density_per_ha"] > 0
    assert result["mean_crown_diameter_m"] > 0
    assert "crown_polygons_geojson" in result

    features = result["crown_polygons_geojson"]["features"]
    assert len(features) > 0
    assert len(features) <= result["total_trees"]

    # Verify that all detected centroids fall strictly within the parcel polygon
    poly = shape(sample_parcel_geojson)
    for feat in features:
        pt = Point(feat["properties"]["centroid"])
        assert poly.contains(pt) or poly.touches(pt), f"Tree point {pt} is outside parcel polygon"
        props = feat["properties"]
        assert props["confidence"] >= 0.70
        assert "species" in props
        assert "diameter_m" in props
        assert "estimated_dbh_cm" in props
        assert "estimated_height_m" in props

def test_kijani_count_engine_production_mode():
    sample_parcel_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [37.5, -3.3],
                [37.52, -3.3],
                [37.52, -3.32],
                [37.5, -3.32],
                [37.5, -3.3],
            ]
        ],
    }

    result = KijaniCountEngine.detect_crowns(
        parcel_geojson=sample_parcel_geojson,
        ecozone="Miombo Woodland",
        area_ha=10.0,
        system_mode="PRODUCTION"
    )

    assert result["system_mode"] == "PRODUCTION"
    assert "deepforest_runtime" in result
    runtime = result["deepforest_runtime"]
    assert "installed" in runtime
    assert "model_architecture" in runtime

def test_modules_count_endpoint_reflects_system_mode():
    # Make sure we are in TESTING mode
    client.put("/api/admin/system-mode", json={"system_mode": "TESTING"})

    parcels_resp = client.get("/api/parcels")
    assert parcels_resp.status_code == 200
    parcels = parcels_resp.json()
    if not parcels:
        from app.seed.seed_data import seed_database
        seed_database()
        parcels = client.get("/api/parcels").json()
    assert len(parcels) > 0

    parcel_id = parcels[0]["id"]
    count_resp = client.get(f"/api/modules/count/{parcel_id}")
    assert count_resp.status_code == 200
    data = count_resp.json()
    assert data["total_trees"] > 0
    assert "crown_polygons_geojson" in data

def test_all_modules_system_mode_transitions():
    parcels_resp = client.get("/api/parcels")
    assert parcels_resp.status_code == 200
    parcels = parcels_resp.json()
    if not parcels:
        from app.seed.seed_data import seed_database
        seed_database()
        parcels = client.get("/api/parcels").json()
    assert len(parcels) > 0
    parcel_id = parcels[0]["id"]

    # 1. TESTING MODE
    client.put("/api/admin/system-mode", json={"system_mode": "TESTING"})
    
    # Irrigation
    irrig_resp = client.get(f"/api/modules/irrigation/{parcel_id}/status")
    assert irrig_resp.status_code == 200
    assert irrig_resp.json()["system_mode"] == "TESTING"
    assert "CALIBRATED" in irrig_resp.json()["operational_status"]

    # Water
    water_resp = client.get(f"/api/modules/water/{parcel_id}")
    assert water_resp.status_code == 200
    assert water_resp.json()["system_mode"] == "TESTING"

    # Health
    health_resp = client.get(f"/api/modules/health/{parcel_id}")
    assert health_resp.status_code == 200
    assert health_resp.json()["system_mode"] == "TESTING"
    assert health_resp.json()["is_simulated"] is True

    # Radar
    radar_resp = client.get(f"/api/modules/radar/{parcel_id}")
    assert radar_resp.status_code == 200
    assert radar_resp.json()["system_mode"] == "TESTING"
    assert radar_resp.json()["is_simulated"] is True

    # Watch
    watch_resp = client.get(f"/api/modules/watch/{parcel_id}")
    assert watch_resp.status_code == 200
    assert watch_resp.json()["system_mode"] == "TESTING"
    assert watch_resp.json()["is_simulated"] is True

    # Carbon
    carbon_resp = client.get(f"/api/modules/carbon/{parcel_id}")
    assert carbon_resp.status_code == 200
    assert carbon_resp.json()["system_mode"] == "TESTING"

    # Restore
    restore_resp = client.get(f"/api/modules/restore/{parcel_id}")
    assert restore_resp.status_code == 200
    assert restore_resp.json()["system_mode"] == "TESTING"

    # Map
    map_resp = client.get(f"/api/modules/map/{parcel_id}")
    assert map_resp.status_code == 200
    assert map_resp.json()["system_mode"] == "TESTING"

    # 2. PRODUCTION MODE
    client.put("/api/admin/system-mode", json={"system_mode": "PRODUCTION"})

    # Irrigation
    irrig_p = client.get(f"/api/modules/irrigation/{parcel_id}/status")
    assert irrig_p.status_code == 200
    assert irrig_p.json()["system_mode"] == "PRODUCTION"
    assert "LIVE" in irrig_p.json()["operational_status"]

    # Water
    water_p = client.get(f"/api/modules/water/{parcel_id}")
    assert water_p.status_code == 200
    assert water_p.json()["system_mode"] == "PRODUCTION"

    # Health
    health_p = client.get(f"/api/modules/health/{parcel_id}")
    assert health_p.status_code == 200
    assert health_p.json()["system_mode"] == "PRODUCTION"

    # Radar
    radar_p = client.get(f"/api/modules/radar/{parcel_id}")
    assert radar_p.status_code == 200
    assert radar_p.json()["system_mode"] == "PRODUCTION"

    # Watch
    watch_p = client.get(f"/api/modules/watch/{parcel_id}")
    assert watch_p.status_code == 200
    assert watch_p.json()["system_mode"] == "PRODUCTION"

    # Carbon
    carbon_p = client.get(f"/api/modules/carbon/{parcel_id}")
    assert carbon_p.status_code == 200
    assert carbon_p.json()["system_mode"] == "PRODUCTION"

    # Restore
    restore_p = client.get(f"/api/modules/restore/{parcel_id}")
    assert restore_p.status_code == 200
    assert restore_p.json()["system_mode"] == "PRODUCTION"

    # Map
    map_p = client.get(f"/api/modules/map/{parcel_id}")
    assert map_p.status_code == 200
    assert map_p.json()["system_mode"] == "PRODUCTION"

    # Reset to TESTING
    client.put("/api/admin/system-mode", json={"system_mode": "TESTING"})

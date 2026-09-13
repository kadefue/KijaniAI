import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.satellite_api_engine import SatelliteAPIEngine
from app.database import SessionLocal
from app.models.all_models import Parcel

client = TestClient(app)

def test_mask_key():
    assert SatelliteAPIEngine.mask_key(None) == ""
    assert SatelliteAPIEngine.mask_key("") == ""
    assert SatelliteAPIEngine.mask_key("short") == "••••••••"
    masked = SatelliteAPIEngine.mask_key("sk-planet-live-token-99887766")
    assert masked.startswith("sk-pla")
    assert masked.endswith("7766")
    assert "..." in masked

def test_get_all_configs():
    configs = SatelliteAPIEngine.get_all_configs()
    assert len(configs) >= 4
    tier_ids = [c["tier_id"] for c in configs]
    assert "tier_1" in tier_ids
    assert "tier_2" in tier_ids
    assert "tier_3" in tier_ids
    assert "tier_4" in tier_ids
    for c in configs:
        assert "api_endpoint" in c
        assert "api_key_masked" in c
        assert "has_api_key" in c

def test_build_planet_orders_payload():
    aoi = {
        "type": "Polygon",
        "coordinates": [[[37.5, -6.5], [37.6, -6.5], [37.6, -6.4], [37.5, -6.4], [37.5, -6.5]]]
    }
    payload = SatelliteAPIEngine.build_planet_orders_payload(aoi, ["test_item_123"])
    assert payload["products"][0]["item_ids"] == ["test_item_123"]
    assert payload["products"][0]["product_bundle"] == "analytic_8b_sr_udm2"
    tools = payload["tools"]
    clip_tool = next((t for t in tools if "clip" in t), None)
    assert clip_tool is not None
    assert clip_tool["clip"]["aoi"] == aoi
    reproject_tool = next((t for t in tools if "reproject" in t), None)
    assert reproject_tool is not None
    assert reproject_tool["reproject"]["projection"] == "EPSG:4326"

def test_save_and_retrieve_satellite_config():
    db = SessionLocal()
    try:
        updated = SatelliteAPIEngine.save_config(
            tier_id="tier_2",
            api_key="pl_live_secret_key_testing_987654321",
            api_endpoint="https://api.planet.com/compute/ops/orders/v2",
            db=db
        )
        assert updated["id"] == "tier_2"
        assert updated["api_key_masked"].startswith("pl_liv")

        configs = SatelliteAPIEngine.get_all_configs(db=db)
        tier_2 = next(c for c in configs if c["id"] == "tier_2")
        assert tier_2["has_api_key"] is True
        assert "987654321" not in tier_2["api_key_masked"]
    finally:
        db.close()

def test_admin_satellite_api_endpoints():
    # 1. GET list
    resp = client.get("/api/admin/satellite-apis")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 4

    # 2. POST update config
    save_resp = client.post("/api/admin/satellite-apis", json={
        "tier_id": "tier_3",
        "api_key": "up42_test_api_key_44332211",
        "secondary_secret": "proj_uuid_88776655",
        "api_endpoint": "https://api.up42.com/v2"
    })
    assert save_resp.status_code == 200
    assert save_resp.json()["id"] == "tier_3"

    # 3. POST test connection
    test_resp = client.post("/api/admin/satellite-apis/test-connection", json={
        "tier_id": "tier_1",
        "custom_endpoint": "https://planetarycomputer.microsoft.com/api/stac/v1"
    })
    assert test_resp.status_code == 200
    test_data = test_resp.json()
    assert test_data["tier_id"] == "tier_1"
    assert "success" in test_data
    assert "tested_endpoint" in test_data

def test_imagery_download_dataset_endpoint():
    db = SessionLocal()
    try:
        parcel = db.query(Parcel).first()
        if not parcel:
            # Seed test parcel if not present
            parcel = Parcel(
                user_id="test_user",
                name="Morogoro Irrigation Scheme Test",
                category="agriculture",
                irrigation_system_type="DRIP",
                irrigation_efficiency=0.90,
                ecozone="MIOMBO",
                region="Morogoro",
                area_ha=12.5,
                geojson_geometry={
                    "type": "Polygon",
                    "coordinates": [[[37.5, -6.5], [37.6, -6.5], [37.6, -6.4], [37.5, -6.4], [37.5, -6.5]]]
                }
            )
            db.add(parcel)
            db.commit()
            db.refresh(parcel)

        resp = client.post("/api/imagery/download-dataset", json={
            "parcel_id": parcel.id,
            "tier_id": "tier_1"
        })
        assert resp.status_code == 200
        result = resp.json()
        assert result["tier_id"] == "tier_1"
        assert result["clipped_to_aoi"] is True
        assert result["crs"] == "EPSG:4326"
        assert "storage_path" in result
        assert "tile_stream_url" in result
    finally:
        db.close()

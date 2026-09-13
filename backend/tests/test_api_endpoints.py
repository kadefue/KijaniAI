import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_healthcheck():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

def test_list_parcels():
    resp = client.get("/api/parcels")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_copilot_chat():
    resp = client.post("/api/copilot/chat", json={
        "messages": [{"role": "user", "content": "How much water does my farm need today?"}],
        "language": "en"
    })
    assert resp.status_code == 200
    assert "reply" in resp.json()
    assert len(resp.json()["reply"]) > 20

def test_dynamic_tile_rendering():
    resp = client.get("/api/tiles/preview/ndvi/10/580/512.png")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert len(resp.content) > 100

def test_get_predefined_soil_profiles():
    resp = client.get("/api/parcels/soil-profiles/predefined")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 7
    texture_classes = [p["texture_class"] for p in data]
    assert "Sandy Clay Loam" in texture_classes
    assert "Clay / Vertisol (Mbuga)" in texture_classes
    assert "Volcanic Loam (Andosol)" in texture_classes
    assert "Red Sandy Clay (Ferralsol)" in texture_classes
    
    first = data[0]
    assert "field_capacity" in first
    assert "wilting_point" in first
    assert "available_water_capacity_mm_m" in first
    assert "rooting_depth_m" in first

def test_parcel_soil_profile_get_and_custom_update():
    parcels_resp = client.get("/api/parcels")
    assert parcels_resp.status_code == 200
    parcels = parcels_resp.json()
    if not parcels:
        pytest.skip("No parcels available to test soil profile")
    
    parcel_id = parcels[0]["id"]
    
    # GET soil profile
    get_resp = client.get(f"/api/parcels/{parcel_id}/soil-profile")
    assert get_resp.status_code == 200
    soil = get_resp.json()
    assert "texture_class" in soil
    assert "field_capacity" in soil
    assert "wilting_point" in soil

    # PUT custom soil parameters defined by user
    custom_payload = {
        "texture_class": "Kilombero Custom Alluvial Clay",
        "sand_pct": 20.0,
        "clay_pct": 50.0,
        "field_capacity": 0.42,
        "wilting_point": 0.22,
        "available_water_capacity_mm_m": 200,
        "rooting_depth_m": 1.2
    }
    put_resp = client.put(f"/api/parcels/{parcel_id}/soil-profile", json=custom_payload)
    assert put_resp.status_code == 200
    updated = put_resp.json()
    assert updated["texture_class"] == "Kilombero Custom Alluvial Clay"
    assert updated["sand_pct"] == 20.0
    assert updated["clay_pct"] == 50.0
    assert updated["field_capacity"] == 0.42
    assert updated["wilting_point"] == 0.22
    assert updated["available_water_capacity_mm_m"] == 200
    assert updated["rooting_depth_m"] == 1.2

    # Verify irrigation module reflects updated soil hydraulic constants
    irr_resp = client.get(f"/api/modules/irrigation/status/{parcel_id}")
    assert irr_resp.status_code == 200
    irr_data = irr_resp.json()
    assert irr_data["field_capacity_mm"] == pytest.approx(504.0, rel=1e-2)
    assert irr_data["wilting_point_mm"] == pytest.approx(264.0, rel=1e-2)


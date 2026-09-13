import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.all_models import Parcel
from app.services.gee_engine import GEEEngine
from app.services.chirps_service import CHIRPSTanzaniaService
from app.services.weather_service import OpenWeatherMapService

client = TestClient(app)

def get_or_create_test_parcel():
    db = SessionLocal()
    try:
        parcel = db.query(Parcel).first()
        if not parcel:
            parcel = Parcel(
                user_id="test_user",
                name="Kilombero Sugar Valley Test",
                category="agriculture",
                irrigation_system_type="CENTER_PIVOT",
                irrigation_efficiency=0.85,
                ecozone="MIOMBO",
                region="Morogoro",
                area_ha=45.0,
                geojson_geometry={
                    "type": "Polygon",
                    "coordinates": [[[37.0, -7.5], [37.05, -7.5], [37.05, -7.45], [37.0, -7.45], [37.0, -7.5]]]
                }
            )
            db.add(parcel)
            db.commit()
            db.refresh(parcel)
        return parcel.id
    finally:
        db.close()

def test_get_free_tier_provider_settings():
    resp = client.get("/api/admin/free-tier-provider")
    assert resp.status_code == 200
    data = resp.json()
    assert "provider" in data
    assert data["provider"] in ["GEE", "PLANETARY_COMPUTER", "CDSE"]
    assert "available_providers" in data
    assert "GEE" in data["available_providers"]
    assert "PLANETARY_COMPUTER" in data["available_providers"]
    assert "CDSE" in data["available_providers"]
    assert "chirps_dataset_id" in data
    assert "UCSB-CHG/CHIRPS/DAILY" in data["chirps_dataset_id"]
    assert "openweathermap_has_key" in data

def test_update_free_tier_provider_settings():
    # Update to PLANETARY_COMPUTER
    resp = client.put("/api/admin/free-tier-provider", json={
        "provider": "PLANETARY_COMPUTER"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider"] == "PLANETARY_COMPUTER"

    # Update back to GEE with custom project ID
    resp2 = client.put("/api/admin/free-tier-provider", json={
        "provider": "GEE",
        "gee_project_id": "kijaniai-earth-engine-prod"
    })
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["provider"] == "GEE"
    assert data2["gee_project_id"] == "kijaniai-earth-engine-prod"

def test_test_connection_weather():
    resp = client.post("/api/admin/satellite-apis/test-connection", json={
        "tier_id": "weather"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["tier_id"] == "weather"
    assert "success" in data
    assert "latency_ms" in data

def test_test_connection_tier1_gee():
    resp = client.post("/api/admin/satellite-apis/test-connection", json={
        "tier_id": "tier_1"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["tier_id"] == "tier_1"
    assert "success" in data
    assert "tested_endpoint" in data

def test_parcel_weather_forecast_endpoint():
    parcel_id = get_or_create_test_parcel()
    resp = client.get(f"/api/modules/irrigation/{parcel_id}/weather-forecast")
    assert resp.status_code == 200
    data = resp.json()
    assert data["parcel_id"] == parcel_id
    assert "forecast_72h_precip_mm" in data
    assert "irrigation_gating_active" in data
    assert "daily_forecasts" in data
    assert len(data["daily_forecasts"]) == 5
    first_day = data["daily_forecasts"][0]
    assert "date" in first_day
    assert "temp_min_c" in first_day
    assert "temp_max_c" in first_day
    assert "rain_mm" in first_day
    assert "et0_mm" in first_day
    assert first_day["et0_mm"] > 0

def test_parcel_chirps_rainfall_endpoint():
    parcel_id = get_or_create_test_parcel()
    resp = client.get(f"/api/modules/irrigation/{parcel_id}/chirps-rainfall?days=14")
    assert resp.status_code == 200
    data = resp.json()
    assert data["parcel_id"] == parcel_id
    assert "0.05" in data["resolution"]
    assert "historical_rainfall_series" in data
    assert len(data["historical_rainfall_series"]) == 14
    assert "sum_rainfall_mm" in data
    assert data["sum_rainfall_mm"] >= 0

def test_gee_server_side_imagery_reduction():
    parcel_id = get_or_create_test_parcel()
    # Ensure GEE provider is set
    client.put("/api/admin/free-tier-provider", json={"provider": "GEE"})

    resp = client.post("/api/imagery/download-dataset", json={
        "parcel_id": parcel_id,
        "tier_id": "tier_1"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["tier_id"] == "tier_1"
    assert data["provider"] == "GEE"
    assert "gee_server_side_computations" in data
    calcs = data["gee_server_side_computations"]
    assert "optical_indices" in calcs
    assert "ndvi" in calcs["optical_indices"]
    assert "sar_polarimetry" in calcs
    assert "chirps_rainfall_14d_mm" in calcs

def test_gee_engine_direct():
    engine = GEEEngine()
    geojson = {
        "type": "Polygon",
        "coordinates": [[[37.0, -7.5], [37.05, -7.5], [37.05, -7.45], [37.0, -7.45], [37.0, -7.5]]]
    }
    results = engine.compute_sentinel2_indices(geojson)
    assert "ndvi" in results
    assert "ndwi" in results
    assert "cloud_cover_pct" in results
    assert 0.0 <= results["ndvi"] <= 1.0

    sar = engine.compute_sentinel1_sar(geojson)
    assert "vv_db" in sar
    assert "vh_db" in sar
    assert "soil_moisture_m3_m3" in sar

def test_chirps_service_direct():
    chirps = CHIRPSTanzaniaService()
    geojson = {
        "type": "Polygon",
        "coordinates": [[[37.0, -7.5], [37.05, -7.5], [37.05, -7.45], [37.0, -7.45], [37.0, -7.5]]]
    }
    res = chirps.get_rainfall_history(geojson, days=14)
    assert "daily_series" in res
    series = res["daily_series"]
    assert len(series) == 14
    for entry in series:
        assert "date" in entry
        assert "rainfall_mm" in entry
        assert entry["rainfall_mm"] >= 0.0
    assert "cumulative_rainfall_mm" in res
    assert res["cumulative_rainfall_mm"] >= 0.0

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.all_models import Parcel, User
from app.modules.mabadiliko.engine import MabadilikoEngine

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Ensure test user and test parcel
    user = db.query(User).filter(User.email == "mabadiliko_test@kijaniai.or.tz").first()
    if not user:
        user = User(
            email="mabadiliko_test@kijaniai.or.tz",
            hashed_password="hashed_pw_test",
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    parcel = db.query(Parcel).filter(Parcel.name == "Mabadiliko Test Basin").first()
    if not parcel:
        parcel = Parcel(
            user_id=user.id,
            name="Mabadiliko Test Basin",
            category="forest",
            ecozone="EASTERN_ARC_MONTANE",
            region="Morogoro",
            area_ha=1200.0,
            geojson_geometry={
                "type": "Polygon",
                "coordinates": [[[37.60, -6.82], [37.65, -6.82], [37.65, -6.86], [37.60, -6.86], [37.60, -6.82]]]
            }
        )
        db.add(parcel)
        db.commit()
    db.close()
    yield

def test_mabadiliko_engine_10_years_monthly():
    res = MabadilikoEngine.evaluate_changes(
        area_ha=1000.0,
        category="forest",
        years=10,
        interval="monthly",
        system_mode="TESTING"
    )
    assert res["time_horizon"]["years"] == 10
    assert res["time_horizon"]["interval"] == "monthly"
    assert len(res["timeline"]) > 100
    assert "vegetation_forest" in res["net_changes"]
    assert "water_sources" in res["net_changes"]
    assert "built_up_structures" in res["net_changes"]
    assert "bare_soil" in res["net_changes"]
    assert len(res["transition_matrix"]) == 4
    assert "en" in res["ai_explanation"]
    assert "sw" in res["ai_explanation"]
    assert "Tathmini ya Mabadiliko" in res["ai_explanation"]["sw"]["title"]
    assert len(res["key_drivers"]) >= 1

def test_mabadiliko_engine_custom_years_and_intervals():
    # 5 years quarterly
    res_q = MabadilikoEngine.evaluate_changes(
        area_ha=500.0,
        category="agriculture",
        years=5,
        interval="quarterly"
    )
    assert res_q["time_horizon"]["years"] == 5
    assert res_q["time_horizon"]["interval"] == "quarterly"
    assert len(res_q["timeline"]) >= 20

    # 3 years annually
    res_a = MabadilikoEngine.evaluate_changes(
        area_ha=800.0,
        category="water_body",
        years=3,
        interval="annually"
    )
    assert res_a["time_horizon"]["years"] == 3
    assert res_a["time_horizon"]["interval"] == "annually"
    assert len(res_a["timeline"]) >= 3

def test_mabadiliko_engine_max_years_enforcement():
    with pytest.raises(ValueError) as exc:
        MabadilikoEngine.evaluate_changes(
            area_ha=100.0,
            years=15
        )
    assert "cannot exceed 10 years" in str(exc.value)

def test_supported_intervals_endpoint():
    resp = client.get("/api/modules/mabadiliko/supported-intervals")
    assert resp.status_code == 200
    data = resp.json()
    assert data["max_years"] == 10
    assert len(data["supported_intervals"]) == 5
    assert any(i["id"] == "monthly" for i in data["supported_intervals"])
    assert any(i["id"] == "quarterly" for i in data["supported_intervals"])

def test_parcel_decadal_changes_endpoint():
    db = SessionLocal()
    parcel = db.query(Parcel).filter(Parcel.name == "Mabadiliko Test Basin").first()
    db.close()
    assert parcel is not None

    resp = client.get(f"/api/modules/mabadiliko/{parcel.id}/changes?years=7&interval=quarterly")
    assert resp.status_code == 200
    data = resp.json()
    assert data["parcel_id"] == parcel.id
    assert data["time_horizon"]["years"] == 7
    assert data["time_horizon"]["interval"] == "quarterly"
    assert "ai_explanation" in data
    assert "sw" in data["ai_explanation"]

def test_analyze_custom_boundary_endpoint():
    payload = {
        "name": "Mindu Catchment Ward Boundary",
        "category": "forest",
        "ecozone": "EASTERN_ARC_MONTANE",
        "area_ha": 2500.0,
        "geojson_geometry": {
            "type": "Polygon",
            "coordinates": [[[37.58, -6.83], [37.64, -6.83], [37.64, -6.87], [37.58, -6.87], [37.58, -6.83]]]
        },
        "years": 4,
        "interval": "bi-monthly"
    }
    resp = client.post("/api/modules/mabadiliko/analyze-boundary", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["boundary_name"] == "Mindu Catchment Ward Boundary"
    assert data["time_horizon"]["years"] == 4
    assert data["time_horizon"]["interval"] == "bi-monthly"
    assert len(data["timeline"]) >= 24

def test_tanzania_basins_summary_endpoint():
    resp = client.get("/api/modules/mabadiliko/tanzania-basins-summary?years=10&interval=annually")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_basins"] >= 5
    assert data["analysis_years"] == 10
    first_basin = data["basins"][0]
    assert "basin_name" in first_basin
    assert "ai_summary_sw" in first_basin

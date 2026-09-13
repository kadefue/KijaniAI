import pytest
from app.modules.irrigation.engine import KijaniIrrigationEngine

def test_fao56_penman_monteith():
    et0 = KijaniIrrigationEngine.calculate_fao56_et0(
        t_mean_c=28.0,
        t_max_c=32.0,
        t_min_c=24.0,
        rh_mean_pct=65.0,
        u2_m_s=2.0,
        solar_rad_mj_m2=22.0
    )
    assert et0 > 3.0
    assert et0 < 8.0

def test_dynamic_kc_calculation():
    # High NDVI (~0.75) -> high Kc
    kc_maize_high = KijaniIrrigationEngine.calculate_dynamic_kc("maize", 0.75)
    kc_maize_low = KijaniIrrigationEngine.calculate_dynamic_kc("maize", 0.20)
    assert kc_maize_high > kc_maize_low
    assert kc_maize_high > 1.0

def test_usda_effective_rainfall():
    assert KijaniIrrigationEngine.calculate_usda_effective_rainfall(0.0) == 0.0
    pe = KijaniIrrigationEngine.calculate_usda_effective_rainfall(50.0)
    assert pe > 0.0
    assert pe < 50.0

def test_irrigation_hydrological_balance_and_forecast_gating():
    # Case 1: Deficit with NO forecast rain -> Irrigation recommended/urgent
    res_dry = KijaniIrrigationEngine.run_hydrological_balance(
        crop_type="maize",
        area_ha=10.0,
        irrigation_type="DRIP",
        mean_ndvi=0.65,
        current_soil_moisture_pct=15.0, # Depleted
        forecast_rainfall_72h_mm=0.0
    )
    assert res_dry["net_irrigation_req_mm"] > 0
    assert res_dry["water_volume_m3"] > 0
    assert res_dry["forecast_gated"] is False
    assert res_dry["urgency_status"] in ("RECOMMENDED", "URGENT")

    # Case 2: Deficit BUT upcoming forecast rain >= NIR -> Postponed
    res_gated = KijaniIrrigationEngine.run_hydrological_balance(
        crop_type="maize",
        area_ha=10.0,
        irrigation_type="DRIP",
        mean_ndvi=0.65,
        current_soil_moisture_pct=15.0,
        forecast_rainfall_72h_mm=40.0 # Rain exceeds NIR
    )
    assert res_gated["forecast_gated"] is True
    assert res_gated["urgency_status"] == "MONITOR"
    assert "Irrigation postponed" in res_gated["explanation_text"]

def test_cwri_and_yield_loss_model():
    res = KijaniIrrigationEngine.run_hydrological_balance(
        crop_type="maize",
        area_ha=5.0,
        irrigation_type="DRIP",
        mean_ndvi=0.60
    )
    assert 0 <= res["cwri_decadal"] <= 100
    assert res["vulnerability_tier"] in ("LOW", "MODERATE", "SEVERE", "CATASTROPHIC")

def test_custom_soil_profile_hydraulic_balance():
    # Test sandy soil with low water holding capacity (FC=140 mm/m, PWP=60 mm/m, Zr=0.8m)
    # Root zone capacity: FC_rz = 140 * 0.8 = 112.0 mm, PWP_rz = 60 * 0.8 = 48.0 mm
    res_sandy = KijaniIrrigationEngine.run_hydrological_balance(
        crop_type="maize",
        area_ha=5.0,
        irrigation_type="DRIP",
        mean_ndvi=0.65,
        current_soil_moisture_pct=10.0,
        fc_mm_m=140.0,
        pwp_mm_m=60.0,
        rooting_depth_m=0.8
    )
    assert res_sandy["field_capacity_mm"] == 112.0
    assert res_sandy["wilting_point_mm"] == 48.0
    # TAW = (140 - 60) * 0.8 = 64.0 mm, RAW (p=0.55) = 35.2 mm
    assert res_sandy["raw_mm"] == pytest.approx(35.2, rel=1e-2)

    # Test heavy vertisol clay with high water holding capacity (FC=400 mm/m, PWP=220 mm/m, Zr=1.2m)
    # Root zone capacity: FC_rz = 400 * 1.2 = 480.0 mm, PWP_rz = 220 * 1.2 = 264.0 mm
    res_clay = KijaniIrrigationEngine.run_hydrological_balance(
        crop_type="maize",
        area_ha=5.0,
        irrigation_type="DRIP",
        mean_ndvi=0.65,
        current_soil_moisture_pct=10.0,
        fc_mm_m=400.0,
        pwp_mm_m=220.0,
        rooting_depth_m=1.2
    )
    assert res_clay["field_capacity_mm"] == 480.0
    assert res_clay["wilting_point_mm"] == 264.0
    # TAW = (400 - 220) * 1.2 = 216.0 mm, RAW (p=0.55) = 118.8 mm
    assert res_clay["raw_mm"] == pytest.approx(118.8, rel=1e-2)
    assert res_clay["raw_mm"] > res_sandy["raw_mm"]



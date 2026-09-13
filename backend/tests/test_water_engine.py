import pytest
import numpy as np
from app.modules.water.engine import KijaniMajiEngine

def test_mndwi_calculation():
    green = np.array([0.3, 0.1])
    swir = np.array([0.1, 0.3])
    mndwi = KijaniMajiEngine.calculate_mndwi(green, swir)
    assert mndwi[0] == pytest.approx(0.5, abs=0.01)
    assert mndwi[1] == pytest.approx(-0.5, abs=0.01)

def test_mindu_reservoir_regressions():
    # Mindu equations:
    # TSS (mg/L) = 0.8046x + 5.5561
    # Turbidity (NTU) = 0.7214x + 16.255
    # pH = 0.7394x + 2.1609
    # EC = 0.6835x + 0.0587
    eval_res = KijaniMajiEngine.evaluate_water_quality(
        category="water_body",
        area_ha=100.0,
        simulated_spectral_values={
            "ndssi": 20.0,
            "ndti": 15.0,
            "ph_index": 7.0,
            "ec_index": 0.50
        }
    )

    expected_tss = 0.8046 * 20.0 + 5.5561 # 21.6481
    expected_turb = 0.7214 * 15.0 + 16.255 # 27.076
    expected_ph = 0.7394 * 7.0 + 2.1609 # 7.3367
    expected_ec = 0.6835 * 0.50 + 0.0587 # 0.40045

    assert eval_res["has_water_detected"] is True
    assert eval_res["mean_tss_mg_l"] == pytest.approx(expected_tss, abs=0.05)
    assert eval_res["mean_turbidity_ntu"] == pytest.approx(expected_turb, abs=0.05)
    assert eval_res["mean_ph"] == pytest.approx(expected_ph, abs=0.05)
    assert eval_res["mean_ec_ms_cm"] == pytest.approx(expected_ec, abs=0.01)

def test_water_mask_zero_water_check():
    eval_res = KijaniMajiEngine.evaluate_water_quality(
        category="forest",
        area_ha=50.0
    )
    assert eval_res["has_water_detected"] is False
    assert "No significant open water pixels detected" in eval_res["notification"]
    assert eval_res["water_surface_area_ha"] == 0.0

def test_fao_clogging_risk_classification():
    severe = KijaniMajiEngine.evaluate_water_quality(
        category="water_body",
        area_ha=50.0,
        simulated_spectral_values={"ndssi": 130.0, "ndti": 10.0, "ph_index": 7.0, "ec_index": 0.5}
    )
    assert severe["clogging_risk_level"] == "SEVERE"

import pytest
from app.modules.carbon.engine import KijaniCarbonEngine
from app.modules.carbon.mrv_generator import MRVGenerator

def test_single_tree_biomass_allometrics():
    # Miombo: AGB = 0.095 * CD^2.45
    miombo = KijaniCarbonEngine.calculate_single_tree_biomass(crown_diameter_m=4.5, ecozone="MIOMBO")
    assert miombo["agb_kg"] > 0
    assert miombo["bgb_kg"] == pytest.approx(miombo["agb_kg"] * 0.42, rel=1e-3)

    # Mangrove: R = 0.49
    mangrove = KijaniCarbonEngine.calculate_single_tree_biomass(crown_diameter_m=3.5, ecozone="COASTAL_MANGROVE")
    assert mangrove["bgb_kg"] == pytest.approx(mangrove["agb_kg"] * 0.49, rel=1e-3)

def test_stand_carbon_accounting_and_buffer_pool():
    res = KijaniCarbonEngine.calculate_stand_carbon(
        total_trees=1000,
        mean_crown_diameter_m=4.5,
        area_ha=10.0,
        ecozone="MIOMBO"
    )
    assert res["total_biomass_tonnes"] > 0
    assert res["gross_tco2e"] > 0
    # Net tradable should be gross minus 15% buffer
    assert res["net_tco2e_tradable"] == pytest.approx(res["gross_tco2e"] * 0.85, abs=0.1)

def test_mrv_dossier_generation():
    carbon_data = {
        "agb_tonnes": 120.0,
        "bgb_tonnes": 50.4,
        "total_biomass_tonnes": 170.4,
        "gross_tco2e": 293.6,
        "buffer_tco2e": 44.0,
        "net_tco2e_tradable": 249.6
    }
    dossier = MRVGenerator.generate_dossier_pdf(
        parcel_name="Usambara Test Stand",
        ecozone="EASTERN_ARC_MONTANE",
        area_ha=25.0,
        spatial_hash="a"*64,
        carbon_data=carbon_data,
        total_trees=5000
    )
    assert dossier["certificate_number"].startswith("KIJANI-MRV-")
    assert len(dossier["verification_token"]) == 24
    assert len(dossier["sha256_raster_hash"]) == 64
    assert "pdf_storage_path" in dossier

import math
from typing import Dict, Any, List

class KijaniCarbonEngine:
    """
    East African Eco-Zone Biomass & Carbon Accounting Engine.
    Converts individual tree crown dimensions into Above-Ground Biomass (AGB),
    Below-Ground Biomass (BGB), and net tradable tCO2e carbon credits.
    """

    CARBON_FRACTION = 0.47
    CO2_TO_C_RATIO = 44.0 / 12.0 # 3.6667
    BUFFER_POOL_DEDUCTION = 0.15 # 15% Verra/Plan Vivo buffer pool

    ECOZONE_SOC_BASELINE = {
        "MIOMBO": 45.0,                  # tC/ha
        "EASTERN_ARC_MONTANE": 82.0,
        "COASTAL_MANGROVE": 120.0,
        "DRY_SAVANNAH_AGRO": 28.0
    }

    @classmethod
    def calculate_single_tree_biomass(cls, crown_diameter_m: float, ecozone: str = "MIOMBO") -> Dict[str, float]:
        """
        Calculates AGB and BGB for a single tree crown based on eco-zone allometric models.
        """
        cd = max(0.5, crown_diameter_m)
        ecozone_key = ecozone.upper() if ecozone else "MIOMBO"

        if "EASTERN_ARC" in ecozone_key or "MONTANE" in ecozone_key:
            # ln(AGB_i) = -2.187 + 0.916 * ln(rho * CD^2 * H)
            rho = 0.61 # wood density g/cm3
            h = 1.34 * math.pow(cd, 0.71)
            vol_term = rho * (cd ** 2) * h
            ln_agb = -2.187 + 0.916 * math.log(max(0.1, vol_term))
            agb_kg = math.exp(ln_agb)
            r = 0.24 # root to shoot

        elif "MANGROVE" in ecozone_key or "COASTAL" in ecozone_key:
            # AGB_i = 0.251 * rho * (CD_i)^2.46
            rho = 0.68
            agb_kg = 0.251 * rho * math.pow(cd, 2.46)
            r = 0.49 if "MANGROVE" in ecozone_key else 0.28

        elif "SAVANNAH" in ecozone_key or "AGRO" in ecozone_key:
            # AGB_i = 0.138 * (CD_i)^2.21
            agb_kg = 0.138 * math.pow(cd, 2.21)
            r = 0.35

        else: # MIOMBO WOODLANDS
            # AGB_i = 0.095 * (CD_i)^2.45
            agb_kg = 0.095 * math.pow(cd, 2.45)
            r = 0.42

        bgb_kg = agb_kg * r
        return {
            "agb_kg": agb_kg,
            "bgb_kg": bgb_kg,
            "total_biomass_kg": agb_kg + bgb_kg
        }

    @classmethod
    def calculate_stand_carbon(
        cls,
        total_trees: int,
        mean_crown_diameter_m: float,
        area_ha: float,
        ecozone: str = "MIOMBO"
    ) -> Dict[str, Any]:
        """
        Aggregates stand-level carbon metrics, applies Verra non-permanence risk buffer deductions,
        and outputs net tradable carbon credits (tCO2e).
        """
        single = cls.calculate_single_tree_biomass(mean_crown_diameter_m, ecozone)
        total_agb_tonnes = round((single["agb_kg"] * total_trees) / 1000.0, 2)
        total_bgb_tonnes = round((single["bgb_kg"] * total_trees) / 1000.0, 2)
        stand_biomass_tonnes = round(total_agb_tonnes + total_bgb_tonnes, 2)

        # Carbon stock = Biomass * 0.47
        total_carbon_tonnes = stand_biomass_tonnes * cls.CARBON_FRACTION

        # Gross tCO2e = Carbon * (44/12)
        gross_tco2e = round(total_carbon_tonnes * cls.CO2_TO_C_RATIO, 2)

        # Buffer pool deduction (15%)
        buffer_tco2e = round(gross_tco2e * cls.BUFFER_POOL_DEDUCTION, 2)
        net_tradable_tco2e = round(gross_tco2e - buffer_tco2e, 2)

        # Soil Organic Carbon
        soc_baseline = cls.ECOZONE_SOC_BASELINE.get(ecozone.upper(), 45.0)
        total_soc_tonnes = round(soc_baseline * area_ha, 1)

        return {
            "ecozone": ecozone,
            "area_ha": round(area_ha, 2),
            "total_trees": total_trees,
            "mean_crown_diameter_m": round(mean_crown_diameter_m, 2),
            "agb_tonnes": total_agb_tonnes,
            "bgb_tonnes": total_bgb_tonnes,
            "total_biomass_tonnes": stand_biomass_tonnes,
            "gross_tco2e": gross_tco2e,
            "buffer_deduction_pct": cls.BUFFER_POOL_DEDUCTION * 100.0,
            "buffer_tco2e": buffer_tco2e,
            "net_tco2e_tradable": net_tradable_tco2e,
            "soc_baseline_t_per_ha": soc_baseline,
            "total_soc_tonnes": total_soc_tonnes,
            "uncertainty_range_pct": 16.5
        }

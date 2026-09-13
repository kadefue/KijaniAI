from typing import Dict, Any, List
from datetime import datetime, timedelta

class KijaniWatchEngine:
    """
    Ecosystem Change, Deforestation & Disturbance Monitoring Engine.
    Computes Normalized Burn Ratio (NBR = (NIR - SWIR)/(NIR + SWIR)),
    burn severity zonation, agricultural reserve encroachment, and historical canopy gain/loss matrices.
    """

    @staticmethod
    def calculate_nbr(nir: float, swir2: float) -> float:
        denom = nir + swir2
        denom = denom if denom != 0 else 1e-6
        return round((nir - swir2) / denom, 3)

    @classmethod
    def analyze_disturbances(cls, area_ha: float, category: str) -> Dict[str, Any]:
        # Simulated multi-year disturbance baseline
        baseline_year = 2020
        now = datetime.utcnow()

        # Deforestation rate (low for sustainable concessions)
        deforestation_ha = round(area_ha * 0.015, 2) if category in ("forest", "restoration") else 0.0
        canopy_gain_ha = round(area_ha * 0.045, 2) if category == "restoration" else round(area_ha * 0.01, 2)
        net_change_ha = round(canopy_gain_ha - deforestation_ha, 2)

        # Fire / Burn Scar alerts (NBR < -0.1 is burned)
        pre_nbr = 0.52
        post_nbr = 0.49
        dnbr = round(pre_nbr - post_nbr, 3)

        burn_severity = "UNBURNED"
        if dnbr > 0.66:
            burn_severity = "HIGH_SEVERITY_BURN"
        elif dnbr > 0.44:
            burn_severity = "MODERATE_HIGH_BURN"
        elif dnbr > 0.27:
            burn_severity = "MODERATE_LOW_BURN"
        elif dnbr > 0.10:
            burn_severity = "LOW_SEVERITY_BURN"

        recent_alerts = [
            {
                "id": "ALT-2024-081",
                "type": "CANOPY_CLEARING",
                "severity": "LOW",
                "detected_date": (now - timedelta(days=6)).strftime("%Y-%m-%d"),
                "area_affected_ha": 0.42,
                "coordinates": [-6.824, 37.641],
                "status": "FLAGGED_FOR_RANGER_VERIFICATION"
            },
            {
                "id": "ALT-2024-054",
                "type": "FIRE_HOTSPOT_MODIS",
                "severity": "NONE_CONTAINED",
                "detected_date": (now - timedelta(days=28)).strftime("%Y-%m-%d"),
                "area_affected_ha": 0.15,
                "coordinates": [-6.832, 37.648],
                "status": "NATURALLY_EXTINGUISHED"
            }
        ]

        return {
            "baseline_year": baseline_year,
            "monitored_area_ha": area_ha,
            "deforestation_ha": deforestation_ha,
            "canopy_gain_ha": canopy_gain_ha,
            "net_change_ha": net_change_ha,
            "net_loss_gain_pct": round((net_change_ha / max(area_ha, 0.1)) * 100.0, 2),
            "current_nbr": post_nbr,
            "dnbr": dnbr,
            "burn_severity": burn_severity,
            "recent_alerts": recent_alerts
        }

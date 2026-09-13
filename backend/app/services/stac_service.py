import datetime
from typing import Dict, Any, List
from app.models.all_models import PricingTier, Parcel

class STACService:
    """
    Satellite Imagery Catalog Search, STAC querying, and Dynamic Pricing Engine.
    """

    DEFAULT_TIERS = [
        {
            "id": "tier_1",
            "name": "Public Free (Sentinel-2 Optical & Sentinel-1 SAR)",
            "sensors": "Sentinel-2 MSI / Sentinel-1 C-SAR / Landsat 8-9",
            "resolution_label": "10m - 30m Free Public Open Data",
            "base_cost_per_ha": 0.0,
            "min_hectares": 1.0,
            "markup_pct": 0.0,
            "is_active": True
        },
        {
            "id": "tier_2",
            "name": "PlanetScope Daily Monitoring",
            "sensors": "PlanetScope SuperDove (8-band VNIR)",
            "resolution_label": "3.0m - 5.0m High Cadence",
            "base_cost_per_ha": 1.50,
            "min_hectares": 10.0,
            "markup_pct": 0.20,
            "is_active": True
        },
        {
            "id": "tier_3",
            "name": "Commercial Very High Resolution (SkySat / Pléiades)",
            "sensors": "SkySat / Pléiades 1A-1B / SPOT 6-7",
            "resolution_label": "50cm Sub-Meter Multispectral",
            "base_cost_per_ha": 6.50,
            "min_hectares": 25.0,
            "markup_pct": 0.20,
            "is_active": True
        },
        {
            "id": "tier_4",
            "name": "Ultra-High Resolution Precision (WorldView / Pléiades Neo)",
            "sensors": "WorldView-3 / WorldView-4 / Pléiades Neo",
            "resolution_label": "30cm Ultra-VHR Precision Crowns",
            "base_cost_per_ha": 14.00,
            "min_hectares": 50.0,
            "markup_pct": 0.25,
            "is_active": True
        }
    ]

    @staticmethod
    def calculate_order_quote(parcel_area_ha: float, tier: PricingTier, user_balance: float) -> Dict[str, Any]:
        """
        Total Cost = max(Parcel Area (ha), Tier Min Hectares) * Base Price/ha * (1 + Markup)
        """
        billable_ha = max(parcel_area_ha, tier.min_hectares)
        raw_cost = billable_ha * tier.base_cost_per_ha
        markup_amount = raw_cost * tier.markup_pct
        total_cost = round(raw_cost + markup_amount, 2)
        
        sufficient_funds = user_balance >= total_cost

        return {
            "parcel_area_ha": round(parcel_area_ha, 2),
            "billable_hectares": round(billable_ha, 2),
            "base_cost_per_ha": tier.base_cost_per_ha,
            "raw_cost_usd": round(raw_cost, 2),
            "markup_pct": round(tier.markup_pct, 2),
            "total_cost_usd": total_cost,
            "user_wallet_balance": round(user_balance, 2),
            "sufficient_funds": sufficient_funds
        }

    @staticmethod
    def search_scenes(parcel_geom: Dict[str, Any], tier_id: str) -> List[Dict[str, Any]]:
        """
        Mock/Live STAC discovery returning scenes available for order or processing.
        """
        now = datetime.datetime.utcnow()
        scenes = []
        for days_ago in [1, 4, 7, 12, 18]:
            acq_date = now - datetime.timedelta(days=days_ago)
            cloud_pct = round(2.0 + (days_ago * 1.5) % 15, 1)
            scenes.append({
                "scene_id": f"S2A_MSIL2A_{acq_date.strftime('%Y%m%d')}_T37MCT_R035",
                "acquisition_date": acq_date.isoformat(),
                "cloud_cover_pct": cloud_pct,
                "sensor": "Sentinel-2 MSI" if tier_id == "tier_1" else "PlanetScope",
                "resolution_m": 10.0 if tier_id == "tier_1" else 3.0,
                "thumbnail_url": f"/api/tiles/preview/{tier_id}/{acq_date.strftime('%Y%m%d')}.png",
                "usable": cloud_pct < 15.0
            })
        return scenes

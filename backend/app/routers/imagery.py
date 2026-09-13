from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Parcel, PricingTier, ImageryOrder, User
from app.schemas.schemas import (
    ImagerySearchRequest, ImageryQuoteRequest, ImageryQuoteResponse, ImageryOrderCreate,
    SatelliteDatasetDownloadRequest, SatelliteDatasetDownloadResponse
)
from app.services.stac_service import STACService
from app.services.satellite_api_engine import SatelliteAPIEngine
from app.worker.tasks import process_imagery_order_task

router = APIRouter(prefix="/imagery", tags=["Imagery & Acquisition"])

@router.post("/search")
def search_imagery(req: ImagerySearchRequest, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.id == req.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    
    scenes = STACService.search_scenes(parcel.geojson_geometry, req.tier_id)
    return {"parcel_id": parcel.id, "scenes": scenes}

@router.post("/quote", response_model=ImageryQuoteResponse)
def quote_imagery(req: ImageryQuoteRequest, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.id == req.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    
    tier = db.query(PricingTier).filter(PricingTier.id == req.tier_id).first()
    if not tier:
        # Fallback to default tier config if not seeded yet
        for dt in STACService.DEFAULT_TIERS:
            if dt["id"] == req.tier_id:
                tier = PricingTier(**dt)
                db.add(tier)
                db.commit()
                db.refresh(tier)
                break
    if not tier:
        raise HTTPException(status_code=404, detail="Pricing tier not found")

    user = parcel.user
    quote = STACService.calculate_order_quote(parcel.area_ha, tier, user.wallet_balance_usd)
    return {
        "parcel_id": parcel.id,
        "tier_id": tier.id,
        **quote
    }

@router.post("/order")
def create_order(order_in: ImageryOrderCreate, db: Session = Depends(get_db)):
    parcel = db.query(Parcel).filter(Parcel.id == order_in.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    
    tier = db.query(PricingTier).filter(PricingTier.id == order_in.tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Pricing tier not found")

    user = parcel.user
    quote = STACService.calculate_order_quote(parcel.area_ha, tier, user.wallet_balance_usd)
    
    if not quote["sufficient_funds"]:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance for this imagery tier.")

    # Deduct funds from wallet ledger
    user.wallet_balance_usd -= quote["total_cost_usd"]

    order = ImageryOrder(
        parcel_id=parcel.id,
        tier_id=tier.id,
        provider="PLANET" if tier.id == "tier_2" else ("UP42" if tier.id in ("tier_3", "tier_4") else "STAC"),
        status="PROCESSING",
        raw_cost_usd=quote["raw_cost_usd"],
        user_charge_usd=quote["total_cost_usd"],
        cloud_cover_pct=2.4
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Trigger async processing task or run synchronously in local mode
    try:
        process_imagery_order_task.delay(order.id)
    except Exception:
        # Immediate fallback if Celery/Redis not running
        process_imagery_order_task(order.id)

    return {
        "status": "ORDER_SUBMITTED",
        "order_id": order.id,
        "charged_usd": quote["total_cost_usd"],
        "remaining_wallet_balance": round(user.wallet_balance_usd, 2)
    }

@router.post("/webhooks/imagery-delivered")
def webhook_imagery_delivered(payload: Dict[str, Any], db: Session = Depends(get_db)):
    order_id = payload.get("order_id")
    if order_id:
        order = db.query(ImageryOrder).filter(ImageryOrder.id == order_id).first()
        if order:
            order.status = "COMPLETED"
            db.commit()
    return {"received": True}

@router.post("/download-dataset", response_model=SatelliteDatasetDownloadResponse)
def download_dataset(req: SatelliteDatasetDownloadRequest, db: Session = Depends(get_db)):
    """
    Triggers direct satellite database extraction, geometry clipping to parcel AOI,
    and ingestion into cloud-optimized GeoTIFF storage.
    """
    parcel = db.query(Parcel).filter(Parcel.id == req.parcel_id).first()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    result = SatelliteAPIEngine.download_and_clip_dataset(
        parcel_id=parcel.id,
        tier_id=req.tier_id,
        geojson_geometry=parcel.geojson_geometry,
        date_from=req.date_from,
        date_to=req.date_to,
        db=db
    )
    return result

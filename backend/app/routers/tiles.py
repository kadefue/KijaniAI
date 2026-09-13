from fastapi import APIRouter, Response
from app.services.raster_engine import RasterEngine

router = APIRouter(prefix="/tiles", tags=["Dynamic COG XYZ Tiles"])

@router.get("/{order_id}/{z}/{x}/{y}.png")
def get_order_tile(order_id: str, z: int, x: int, y: int):
    # Dynamic tile streaming
    tile_bytes = RasterEngine.generate_tile("rgb", z, x, y)
    return Response(content=tile_bytes, media_type="image/png")

@router.get("/preview/{layer}/{z}/{x}/{y}.png")
def get_preview_tile(layer: str, z: int, x: int, y: int):
    """
    Renders analytical surface tiles:
    layer: 'rgb', 'ndvi', 'water', 'sar', 'irrigation_stress'
    """
    tile_bytes = RasterEngine.generate_tile(layer.lower(), z, x, y)
    return Response(content=tile_bytes, media_type="image/png")

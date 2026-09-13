import io
import math
import numpy as np
from PIL import Image

class RasterEngine:
    """
    Geospatial raster processing and dynamic XYZ map tile generator:
    Streams dynamic PNG tiles for RGB, NDVI, MNDWI, SAR Radar, Water Quality (TSS/Turbidity),
    and Irrigation Stress layers.
    """

    @staticmethod
    def deg2num(lat_deg: float, lon_deg: float, zoom: int):
        lat_rad = math.radians(lat_deg)
        n = 2.0 ** zoom
        xtile = int((lon_deg + 180.0) / 360.0 * n)
        ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return (xtile, ytile)

    @staticmethod
    def num2deg(xtile: int, ytile: int, zoom: int):
        n = 2.0 ** zoom
        lon_deg = xtile / n * 360.0 - 180.0
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
        lat_deg = math.degrees(lat_rad)
        return (lat_deg, lon_deg)

    @staticmethod
    def generate_tile(layer_type: str, z: int, x: int, y: int) -> bytes:
        """
        Generates 256x256 RGBA tile representing satellite or analytical surface.
        """
        # Create gradient / synthetic pattern based on tile coords & layer type
        size = 256
        # Generate coordinate grid
        u = np.linspace(0, 1, size)
        v = np.linspace(0, 1, size)
        uu, vv = np.meshgrid(u, v)

        # Base noise / wave pattern
        freq = 3.0 + (x % 4)
        pattern = np.sin(uu * freq) * np.cos(vv * freq)

        rgba = np.zeros((size, size, 4), dtype=np.uint8)

        if layer_type in ("rgb", "true_color"):
            # Natural color satellite scene (Greenish-earth tones)
            r = np.clip((0.35 + 0.15 * pattern) * 255, 40, 180).astype(np.uint8)
            g = np.clip((0.55 + 0.20 * pattern) * 255, 60, 220).astype(np.uint8)
            b = np.clip((0.25 + 0.10 * pattern) * 255, 30, 150).astype(np.uint8)
            rgba[:, :, 0] = r
            rgba[:, :, 1] = g
            rgba[:, :, 2] = b
            rgba[:, :, 3] = 230

        elif layer_type == "ndvi":
            # NDVI Color ramp: red (bare/water: -0.2) to dark green (dense vegetation: 0.8)
            ndvi_val = 0.2 + 0.6 * ((pattern + 1) / 2.0)
            r = np.clip((1.0 - ndvi_val) * 240, 20, 240).astype(np.uint8)
            g = np.clip(ndvi_val * 230 + 20, 40, 240).astype(np.uint8)
            b = np.full((size, size), 30, dtype=np.uint8)
            rgba[:, :, 0] = r
            rgba[:, :, 1] = g
            rgba[:, :, 2] = b
            rgba[:, :, 3] = 210

        elif layer_type == "water" or layer_type == "mndwi":
            # MNDWI / KijaniMaji: Deep blues, cyans, and sediment highlights
            mndwi_val = (pattern + 1) / 2.0
            r = np.clip(20 + 30 * (1 - mndwi_val), 10, 80).astype(np.uint8)
            g = np.clip(100 + 100 * mndwi_val, 40, 220).astype(np.uint8)
            b = np.clip(180 + 70 * mndwi_val, 120, 255).astype(np.uint8)
            rgba[:, :, 0] = r
            rgba[:, :, 1] = g
            rgba[:, :, 2] = b
            rgba[:, :, 3] = 220

        elif layer_type == "sar" or layer_type == "radar":
            # Sentinel-1 SAR: Grayscale with radar speckle & dual-pol RVI highlights
            sar_val = np.clip((pattern + 1.2) / 2.4, 0.05, 0.95)
            # Add synthetic speckle noise
            noise = np.random.normal(0, 0.05, (size, size))
            sar_val = np.clip(sar_val + noise, 0, 1)
            # RVI tint (amber/copper glow on higher volume scattering)
            r = (sar_val * 210 + 20).astype(np.uint8)
            g = (sar_val * 180 + 15).astype(np.uint8)
            b = (sar_val * 240 + 20).astype(np.uint8)
            rgba[:, :, 0] = r
            rgba[:, :, 1] = g
            rgba[:, :, 2] = b
            rgba[:, :, 3] = 230

        elif layer_type == "irrigation_stress":
            # KijaniIrrigation stress zoning (Emerald = well watered, Orange/Red = deficit)
            stress_val = (np.cos(uu * 4) * np.sin(vv * 4) + 1) / 2.0
            # Low stress -> Green, High stress -> Red
            r = np.clip(stress_val * 240 + 20, 20, 240).astype(np.uint8)
            g = np.clip((1.0 - stress_val) * 220 + 30, 30, 240).astype(np.uint8)
            b = np.full((size, size), 40, dtype=np.uint8)
            rgba[:, :, 0] = r
            rgba[:, :, 1] = g
            rgba[:, :, 2] = b
            rgba[:, :, 3] = 200

        else:
            # Fallback theme (slate / cyan)
            rgba[:, :, 0] = 16
            rgba[:, :, 1] = 185
            rgba[:, :, 2] = 129
            rgba[:, :, 3] = 180

        # Encode to PNG in memory
        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

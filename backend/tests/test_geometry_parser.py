import pytest
from app.services.geometry_parser import GeometryParser

def test_parse_geojson_polygon():
    geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [37.60, -6.80],
                [37.61, -6.80],
                [37.61, -6.81],
                [37.60, -6.81],
                [37.60, -6.80]
            ]
        ]
    }
    geom, area_ha, spatial_hash = GeometryParser.parse_geojson(geojson)
    assert geom["type"] == "Polygon"
    assert area_ha > 100.0 # ~120 ha
    assert len(spatial_hash) == 64

def test_parse_csv_coordinates():
    csv_text = """latitude,longitude
-6.80,37.60
-6.80,37.61
-6.81,37.61
-6.81,37.60
"""
    geom, area_ha, spatial_hash = GeometryParser.parse_csv(csv_text)
    assert geom["type"] == "Polygon"
    assert area_ha > 0
    assert len(spatial_hash) == 64

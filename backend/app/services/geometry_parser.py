import io
import os
import zipfile
import hashlib
import json
import csv
import xml.etree.ElementTree as ET
from typing import Dict, Any, Tuple
import shapely
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.validation import make_valid
from shapely.ops import transform
import pyproj

class GeometryParser:
    """
    Universal boundary ingestion engine:
    Supports GeoJSON, zipped Shapefiles, KML/KMZ archives, and closed CSV coordinate sequences.
    Enforces topological validity, calculates precise geodesic area in hectares,
    and returns GeoJSON + spatial SHA-256 hash.
    """

    @staticmethod
    def parse_geojson(data: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        # Extract geometry from FeatureCollection, Feature, or pure Geometry
        if "type" in data:
            if data["type"] == "FeatureCollection":
                if not data.get("features"):
                    raise ValueError("Empty GeoJSON FeatureCollection provided.")
                geom_dict = data["features"][0]["geometry"]
            elif data["type"] == "Feature":
                geom_dict = data["geometry"]
            else:
                geom_dict = data
        else:
            raise ValueError("Invalid GeoJSON structure.")

        geom = shape(geom_dict)
        return GeometryParser._finalize_geometry(geom)

    @staticmethod
    def parse_csv(csv_content: str) -> Tuple[Dict[str, Any], float, str]:
        """
        Parses CSV coordinates (e.g. lat, lon or latitude, longitude).
        Automatically closes the polygon loop if the first and last points differ.
        """
        reader = csv.DictReader(io.StringIO(csv_content.strip()))
        coords = []
        for row in reader:
            # Case insensitive key search
            lat_key = next((k for k in row.keys() if k.lower() in ("lat", "latitude", "y")), None)
            lon_key = next((k for k in row.keys() if k.lower() in ("lon", "longitude", "lng", "x")), None)
            if lat_key and lon_key and row[lat_key] and row[lon_key]:
                coords.append((float(row[lon_key]), float(row[lat_key])))

        if len(coords) < 3:
            raise ValueError("CSV must contain at least 3 coordinates to form a polygon boundary.")

        # Ensure ring is closed
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        polygon = Polygon(coords)
        return GeometryParser._finalize_geometry(polygon)

    @staticmethod
    def parse_kml_kmz(file_bytes: bytes, filename: str) -> Tuple[Dict[str, Any], float, str]:
        """
        Extracts polygons from KML XML or zipped KMZ archives.
        """
        kml_content = None
        if filename.lower().endswith(".kmz"):
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                kml_names = [f for f in z.namelist() if f.lower().endswith(".kml")]
                if not kml_names:
                    raise ValueError("No .kml file found within KMZ archive.")
                kml_content = z.read(kml_names[0]).decode("utf-8", errors="ignore")
        else:
            kml_content = file_bytes.decode("utf-8", errors="ignore")

        # Parse KML XML coordinates
        # Namespace agnostic element search
        root = ET.fromstring(kml_content)
        coord_texts = []
        for elem in root.iter():
            if elem.tag.endswith("coordinates") and elem.text:
                coord_texts.append(elem.text.strip())

        if not coord_texts:
            raise ValueError("Could not find <coordinates> element in KML file.")

        coords = []
        for raw_point in coord_texts[0].split():
            parts = raw_point.split(",")
            if len(parts) >= 2:
                lon, lat = float(parts[0]), float(parts[1])
                coords.append((lon, lat))

        if len(coords) < 3:
            raise ValueError("KML coordinates do not contain enough points for a valid polygon.")

        if coords[0] != coords[-1]:
            coords.append(coords[0])

        polygon = Polygon(coords)
        return GeometryParser._finalize_geometry(polygon)

    @staticmethod
    def parse_shapefile_zip(zip_bytes: bytes) -> Tuple[Dict[str, Any], float, str]:
        """
        Ingests zipped Shapefile archive containing .shp, .shx, .dbf, .prj.
        """
        try:
            import geopandas as gpd
            with io.BytesIO(zip_bytes) as bio:
                gdf = gpd.read_file(bio)
            if gdf.empty:
                raise ValueError("Shapefile contains no geometries.")
            
            # Project to EPSG:4326 if not already
            if gdf.crs and gdf.crs.to_epsg() != 4326:
                gdf = gdf.to_crs(epsg=4326)
            
            geom = gdf.geometry.iloc[0]
            return GeometryParser._finalize_geometry(geom)
        except Exception as e:
            # Fallback if fiona/geopandas archive read fails
            raise ValueError(f"Failed to parse Shapefile archive: {str(e)}")

    @staticmethod
    def _finalize_geometry(geom: shapely.Geometry) -> Tuple[Dict[str, Any], float, str]:
        """
        Validates topology, ensures Polygon or MultiPolygon, calculates geodesic area in hectares,
        and computes deterministic SHA-256 hash.
        """
        if not geom.is_valid:
            geom = make_valid(geom)

        if not isinstance(geom, (Polygon, MultiPolygon)):
            raise ValueError(f"Geometry must be a Polygon or MultiPolygon, got {geom.geom_type}")

        # Area calculation using WGS84 Geodesic ellipsoidal model
        geod = pyproj.Geod(ellps="WGS84")
        # geod.geometry_area_perimeter returns (area_m2, perimeter_m)
        area_m2, _ = geod.geometry_area_perimeter(geom)
        area_ha = abs(area_m2) / 10000.0

        geojson_dict = mapping(geom)
        
        # Deterministic SHA-256 spatial boundary hash
        geom_canonical = json.dumps(geojson_dict, sort_keys=True)
        spatial_hash = hashlib.sha256(geom_canonical.encode("utf-8")).hexdigest()

        return geojson_dict, round(area_ha, 4), spatial_hash

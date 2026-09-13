# Official Tanzania Administrative Ward Shapefiles (NBS 2022 Census)

This directory caches official Tanzania administrative boundaries from the National Bureau of Statistics (NBS).

- **Dataset URL**: https://www.nbs.go.tz/uploads/statistics/documents/en-1714652282-TANZANIA_2022PHC_WARD_SHAPEFILES.zip
- **Administrative Level**: Level 3 (Wards / Kata)
- **Coordinate System**: WGS84 (EPSG:4326)
- **Database Table**: `tanzania_wards`
- **Optimization**: Precomputed bounding boxes (`bbox_min_lon`, `bbox_min_lat`, `bbox_max_lon`, `bbox_max_lat`) and centroids (`centroid_lat`, `centroid_lon`) for sub-millisecond point-in-polygon spatial inference.

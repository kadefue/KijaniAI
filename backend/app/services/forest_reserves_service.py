import os
import json
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.all_models import TanzaniaForestReserve, Parcel, EcosystemMetrics, User
from app.services.geometry_parser import GeometryParser

FOREST_RESERVES_GEOJSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "tanzania_forest_reserves",
    "Tanzania_Forest_Reserves.geojson"
)

class ForestReservesService:
    """
    Service for managing, querying, and ingesting official Tanzanian Forest Reserves
    (TFS / WDPA) into PostGIS and bridging them to Kijani Land Cover & Deforestation Monitoring.
    """

    @staticmethod
    def _compute_geometry_metrics(geom: Dict[str, Any]) -> Tuple[float, float, float, float, float, float]:
        """
        Extracts bbox (min_lon, min_lat, max_lon, max_lat) and centroid (lat, lon)
        from a Polygon or MultiPolygon GeoJSON geometry.
        """
        coords = geom.get("coordinates", [])
        lons: List[float] = []
        lats: List[float] = []

        def recurse(c):
            if isinstance(c, (list, tuple)) and len(c) >= 2 and isinstance(c[0], (int, float)):
                lons.append(float(c[0]))
                lats.append(float(c[1]))
            elif isinstance(c, (list, tuple)):
                for sub in c:
                    recurse(sub)

        recurse(coords)

        if not lons or not lats:
            return 0.0, 0.0, 0.0, 0.0, -6.0, 35.0

        min_lon = min(lons)
        min_lat = min(lats)
        max_lon = max(lons)
        max_lat = max(lats)
        centroid_lat = sum(lats) / len(lats)
        centroid_lon = sum(lons) / len(lons)

        return min_lon, min_lat, max_lon, max_lat, centroid_lat, centroid_lon

    @classmethod
    def ingest_geojson_to_db(cls, db: Session, geojson_path: Optional[str] = None, force_reload: bool = False) -> Dict[str, Any]:
        """
        Loads all 696 official Tanzania Forest Reserves into the PostGIS database.
        Idempotent: skips if table already populated unless force_reload=True.
        """
        path = geojson_path or FOREST_RESERVES_GEOJSON_PATH
        if not os.path.exists(path):
            return {"status": "ERROR", "message": f"GeoJSON file not found at {path}", "count": 0}

        existing_count = db.query(TanzaniaForestReserve).count()
        if existing_count > 0 and not force_reload:
            total_ha = db.query(func.sum(TanzaniaForestReserve.area_ha)).scalar() or 0.0
            return {
                "status": "ALREADY_POPULATED",
                "count": existing_count,
                "total_area_ha": round(float(total_ha), 2),
                "message": f"Database already contains {existing_count} forest reserves totaling {total_ha:,.1f} ha."
            }

        if force_reload and existing_count > 0:
            db.query(TanzaniaForestReserve).delete()
            db.commit()

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        features = data.get("features", [])
        records = []
        batch_size = 100
        total_inserted = 0
        total_ha_sum = 0.0

        for f_idx, feat in enumerate(features):
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            if not geom or not props:
                continue

            wdpa_id = props.get("WDPAID")
            fid = props.get("FID") or (f_idx + 1)
            reserve_id = f"FR-{wdpa_id}" if wdpa_id else f"FR-{fid}"

            min_lon, min_lat, max_lon, max_lat, c_lat, c_lon = cls._compute_geometry_metrics(geom)

            gis_km2 = float(props.get("GIS_AREA") or props.get("REP_AREA") or 0.0)
            area_ha = round(gis_km2 * 100.0, 2)
            if area_ha <= 0:
                shape_area = float(props.get("Shape__Area") or 0.0)
                area_ha = round(shape_area / 10000.0, 2) if shape_area > 0 else 50.0

            total_ha_sum += area_ha

            reserve = TanzaniaForestReserve(
                id=reserve_id,
                wdpa_id=wdpa_id,
                name=props.get("NAME") or f"Forest Reserve {fid}",
                orig_name=props.get("ORIG_NAME"),
                designation=props.get("DESIG") or "Forest Reserve",
                designation_type=props.get("DESIG_TYPE") or "National",
                iucn_category=props.get("IUCN_CAT") or "Not Reported",
                status=props.get("STATUS") or "Designated",
                status_year=int(props.get("STATUS_YR")) if props.get("STATUS_YR") else None,
                governance_type=props.get("GOV_TYPE"),
                management_authority=props.get("MANG_AUTH") or "Tanzania Forest Services (TFS) Agency",
                sub_location=props.get("SUB_LOC"),
                gis_area_km2=gis_km2,
                area_ha=area_ha,
                centroid_lat=c_lat,
                centroid_lon=c_lon,
                bbox_min_lon=min_lon,
                bbox_min_lat=min_lat,
                bbox_max_lon=max_lon,
                bbox_max_lat=max_lat,
                geojson_geometry=geom
            )
            records.append(reserve)

            if len(records) >= batch_size:
                db.bulk_save_objects(records)
                db.commit()
                total_inserted += len(records)
                records = []

        if records:
            db.bulk_save_objects(records)
            db.commit()
            total_inserted += len(records)

        return {
            "status": "SUCCESS",
            "count": total_inserted,
            "total_area_ha": round(total_ha_sum, 2),
            "message": f"Successfully loaded {total_inserted} Tanzania Forest Reserves into PostGIS database."
        }

    @classmethod
    def get_reserves(
        cls,
        db: Session,
        search: Optional[str] = None,
        designation: Optional[str] = None,
        iucn_category: Optional[str] = None,
        min_ha: Optional[float] = None,
        max_ha: Optional[float] = None,
        limit: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Queries forest reserves with multi-attribute filtering, search, and pagination.
        """
        query = db.query(TanzaniaForestReserve)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    TanzaniaForestReserve.name.ilike(s),
                    TanzaniaForestReserve.orig_name.ilike(s),
                    TanzaniaForestReserve.id.ilike(s),
                    TanzaniaForestReserve.management_authority.ilike(s)
                )
            )

        if designation and designation.lower() != "all":
            query = query.filter(TanzaniaForestReserve.designation.ilike(f"%{designation.strip()}%"))

        if iucn_category and iucn_category.lower() != "all":
            query = query.filter(TanzaniaForestReserve.iucn_category == iucn_category.strip())

        if min_ha is not None:
            query = query.filter(TanzaniaForestReserve.area_ha >= min_ha)

        if max_ha is not None:
            query = query.filter(TanzaniaForestReserve.area_ha <= max_ha)

        total = query.count()
        results = query.order_by(TanzaniaForestReserve.area_ha.desc()).offset(skip).limit(limit).all()

        items = []
        for r in results:
            items.append({
                "id": r.id,
                "wdpa_id": r.wdpa_id,
                "name": r.name,
                "orig_name": r.orig_name,
                "designation": r.designation,
                "designation_type": r.designation_type,
                "iucn_category": r.iucn_category,
                "status": r.status,
                "status_year": r.status_year,
                "governance_type": r.governance_type,
                "management_authority": r.management_authority,
                "sub_location": r.sub_location,
                "gis_area_km2": r.gis_area_km2,
                "area_ha": r.area_ha,
                "centroid": {"lat": r.centroid_lat, "lon": r.centroid_lon},
                "bbox": [r.bbox_min_lon, r.bbox_min_lat, r.bbox_max_lon, r.bbox_max_lat],
                "has_geometry": bool(r.geojson_geometry)
            })

        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "reserves": items
        }

    @classmethod
    def get_reserve_by_id(cls, db: Session, reserve_id: str) -> Optional[TanzaniaForestReserve]:
        return db.query(TanzaniaForestReserve).filter(
            or_(
                TanzaniaForestReserve.id == reserve_id,
                TanzaniaForestReserve.wdpa_id == int(reserve_id) if reserve_id.isdigit() else False
            )
        ).first()

    @classmethod
    def get_geojson_feature_collection(
        cls,
        db: Session,
        designation: Optional[str] = None,
        limit: int = 150,
        bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> Dict[str, Any]:
        """
        Returns a lightweight GeoJSON FeatureCollection optimized for vector rendering on MapLibre GL.
        """
        query = db.query(TanzaniaForestReserve)
        if designation and designation.lower() != "all":
            query = query.filter(TanzaniaForestReserve.designation.ilike(f"%{designation.strip()}%"))

        if bbox:
            min_lon, min_lat, max_lon, max_lat = bbox
            query = query.filter(
                TanzaniaForestReserve.bbox_max_lon >= min_lon,
                TanzaniaForestReserve.bbox_min_lon <= max_lon,
                TanzaniaForestReserve.bbox_max_lat >= min_lat,
                TanzaniaForestReserve.bbox_min_lat <= max_lat
            )

        reserves = query.order_by(TanzaniaForestReserve.area_ha.desc()).limit(limit).all()

        features = []
        for r in reserves:
            if not r.geojson_geometry:
                continue
            features.append({
                "type": "Feature",
                "id": r.id,
                "geometry": r.geojson_geometry,
                "properties": {
                    "id": r.id,
                    "name": r.name,
                    "designation": r.designation,
                    "iucn_category": r.iucn_category,
                    "status_year": r.status_year,
                    "area_ha": r.area_ha,
                    "management_authority": r.management_authority,
                    "centroid_lat": r.centroid_lat,
                    "centroid_lon": r.centroid_lon
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    @classmethod
    def get_catalog_summary(cls, db: Session) -> Dict[str, Any]:
        """
        Aggregates ecological and geographic statistics of Tanzania's forest reserves network.
        """
        total_count = db.query(TanzaniaForestReserve).count()
        total_area_ha = float(db.query(func.sum(TanzaniaForestReserve.area_ha)).scalar() or 0.0)

        # Count by designation
        desig_counts = db.query(
            TanzaniaForestReserve.designation,
            func.count(TanzaniaForestReserve.id),
            func.sum(TanzaniaForestReserve.area_ha)
        ).group_by(TanzaniaForestReserve.designation).all()

        designation_stats = [
            {
                "designation": d[0],
                "count": d[1],
                "total_area_ha": round(float(d[2] or 0.0), 1),
                "pct_of_total_reserves": round((d[1] / total_count * 100.0) if total_count else 0.0, 1)
            }
            for d in desig_counts
        ]

        # Top 10 prominent nature/forest reserves
        top_reserves = db.query(TanzaniaForestReserve).order_by(
            TanzaniaForestReserve.area_ha.desc()
        ).limit(10).all()

        top_list = [
            {
                "id": r.id,
                "name": r.name,
                "designation": r.designation,
                "area_ha": r.area_ha,
                "centroid": [r.centroid_lat, r.centroid_lon],
                "iucn": r.iucn_category
            }
            for r in top_reserves
        ]

        return {
            "total_forest_reserves": total_count,
            "total_protected_area_ha": round(total_area_ha, 1),
            "total_protected_area_km2": round(total_area_ha / 100.0, 1),
            "designations_breakdown": designation_stats,
            "top_flagship_reserves": top_list,
            "governing_agency": "Tanzania Forest Services (TFS) Agency",
            "country": "United Republic of Tanzania"
        }

    @classmethod
    def import_reserve_as_monitored_parcel(cls, db: Session, reserve_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        1-Click Import: Converts an official Tanzania Forest Reserve into an active
        monitored Parcel in the system with linked PostGIS geometry and initialized
        land cover & canopy tracking baseline.
        """
        reserve = cls.get_reserve_by_id(db, reserve_id)
        if not reserve:
            raise ValueError(f"Forest reserve with ID '{reserve_id}' not found.")

        # Check if already imported
        existing_parcel = db.query(Parcel).filter(
            Parcel.name == f"{reserve.name} ({reserve.designation})"
        ).first()
        if existing_parcel:
            return {
                "status": "ALREADY_EXISTS",
                "parcel_id": existing_parcel.id,
                "parcel_name": existing_parcel.name,
                "area_ha": existing_parcel.area_ha,
                "message": f"Forest reserve '{reserve.name}' is already being monitored as parcel '{existing_parcel.name}'."
            }

        # Determine best fitting ecozone based on centroid & designation
        ecozone = "EASTERN_ARC_MONTANE"
        if reserve.centroid_lat < -7.5:
            ecozone = "MIOMBO"
        elif reserve.centroid_lon > 38.5 and reserve.centroid_lat > -6.0:
            ecozone = "COASTAL_MANGROVE"
        elif "Nature" in reserve.designation or "Sanctuary" in reserve.designation:
            ecozone = "EASTERN_ARC_MONTANE"

        if not user_id:
            user = db.query(User).filter(User.role == "admin").first() or db.query(User).first()
            if user:
                user_id = user.id
            else:
                user = User(
                    email="admin@kijaniai.or.tz",
                    hashed_password="$2b$12$eX4mP1eHashedPasswordPlaceholderForSystemAdminUserKey",
                    role="admin"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                user_id = user.id

        new_parcel = Parcel(
            user_id=user_id,
            name=f"{reserve.name} ({reserve.designation})",
            category="forest",
            crop_type=None,
            irrigation_system_type="NONE",
            irrigation_efficiency=1.0,
            ecozone=ecozone,
            region=reserve.sub_location or "Tanzania",
            area_ha=reserve.area_ha,
            geojson_geometry=reserve.geojson_geometry
        )
        db.add(new_parcel)
        db.commit()
        db.refresh(new_parcel)

        # Initialize baseline ecosystem metrics
        metrics = EcosystemMetrics(
            parcel_id=new_parcel.id,
            mean_ndvi=0.74,
            mean_evi=0.62,
            mean_ndwi=0.38,
            mean_sar_rvi=0.55,
            agb_tonnes=round(reserve.area_ha * 185.0, 2)
        )
        db.add(metrics)
        db.commit()

        return {
            "status": "IMPORTED",
            "parcel_id": new_parcel.id,
            "parcel_name": new_parcel.name,
            "area_ha": new_parcel.area_ha,
            "ecozone": new_parcel.ecozone,
            "category": new_parcel.category,
            "centroid": {"lat": reserve.centroid_lat, "lon": reserve.centroid_lon},
            "message": f"Successfully activated Land Cover Monitoring for {reserve.name} ({reserve.area_ha:,.1f} ha)."
        }

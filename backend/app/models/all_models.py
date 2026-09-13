import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False) # 'admin', 'user', 'ranger'
    wallet_balance_usd = Column(Float, default=500.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    parcels = relationship("Parcel", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("RetentionCampaign", back_populates="user", cascade="all, delete-orphan")


class PricingTier(Base):
    __tablename__ = "pricing_tiers"

    id = Column(String(50), primary_key=True) # tier_1, tier_2, tier_3, tier_4
    name = Column(String(100), nullable=False)
    sensors = Column(String(255), nullable=False) # "Sentinel-2 / Sentinel-1"
    resolution_label = Column(String(100), nullable=False) # "10m - 30m"
    base_cost_per_ha = Column(Float, default=0.0, nullable=False) # $/ha
    min_hectares = Column(Float, default=1.0, nullable=False)
    markup_pct = Column(Float, default=0.20, nullable=False) # 20% platform markup
    is_active = Column(Boolean, default=True, nullable=False)


class Parcel(Base):
    __tablename__ = "parcels"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False) # forest, agriculture, grassland, wetland, water_body, restoration
    crop_type = Column(String(100), nullable=True) # maize, rice, sugarcane, etc.
    planting_date = Column(DateTime, nullable=True)
    irrigation_system_type = Column(String(50), default="DRIP", nullable=False) # DRIP, SPRINKLER, FURROW, PIVOT
    irrigation_efficiency = Column(Float, default=0.90, nullable=False)
    ecozone = Column(String(100), default="MIOMBO", nullable=False) # MIOMBO, EASTERN_ARC_MONTANE, COASTAL_MANGROVE, DRY_SAVANNAH_AGRO
    region = Column(String(100), default="Morogoro", nullable=False)
    
    # PostGIS geometry (with SQLite fallback for test suites and environments without running Postgres)
    from app.database import db_url, engine
    if "sqlite" in db_url or "sqlite" in str(engine.url):
        geom = Column(Text, nullable=True)
    else:
        geom = Column(Geometry(geometry_type="POLYGON", srid=4326, management=True), nullable=True)
    
    # GeoJSON fallback representation for simple DB storage and API serialization
    geojson_geometry = Column(JSON, nullable=False)
    
    area_ha = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="parcels")
    soil_profile = relationship("SoilProfile", back_populates="parcel", uselist=False, cascade="all, delete-orphan")
    imagery_orders = relationship("ImageryOrder", back_populates="parcel", cascade="all, delete-orphan")
    ecosystem_metrics = relationship("EcosystemMetrics", back_populates="parcel", cascade="all, delete-orphan")
    water_metrics = relationship("WaterQualityMetrics", back_populates="parcel", cascade="all, delete-orphan")
    irrigation_records = relationship("IrrigationRecord", back_populates="parcel", cascade="all, delete-orphan")
    mrv_certificates = relationship("MRVCertificate", back_populates="parcel", cascade="all, delete-orphan")
    field_surveys = relationship("FieldSurvey", back_populates="parcel", cascade="all, delete-orphan")


class SoilProfile(Base):
    __tablename__ = "soil_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parcel_id = Column(String(36), ForeignKey("parcels.id"), nullable=False, unique=True)
    texture_class = Column(String(100), default="Sandy Clay Loam", nullable=False)
    sand_pct = Column(Float, default=52.0, nullable=False)
    clay_pct = Column(Float, default=28.0, nullable=False)
    field_capacity = Column(Float, default=0.28, nullable=False) # m3/m3 or vol %
    wilting_point = Column(Float, default=0.14, nullable=False)
    available_water_capacity_mm_m = Column(Float, default=140.0, nullable=False)
    rooting_depth_m = Column(Float, default=1.0, nullable=False)

    parcel = relationship("Parcel", back_populates="soil_profile")


class ImageryOrder(Base):
    __tablename__ = "imagery_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parcel_id = Column(String(36), ForeignKey("parcels.id"), nullable=False)
    tier_id = Column(String(50), ForeignKey("pricing_tiers.id"), nullable=False)
    provider = Column(String(50), default="STAC", nullable=False) # STAC, PLANET, UP42
    status = Column(String(50), default="COMPLETED", nullable=False) # PENDING, PROCESSING, COMPLETED, FAILED
    raw_cost_usd = Column(Float, default=0.0, nullable=False)
    user_charge_usd = Column(Float, default=0.0, nullable=False)
    raster_storage_path = Column(String(500), nullable=True)
    sar_storage_path = Column(String(500), nullable=True)
    acquired_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    cloud_cover_pct = Column(Float, default=4.2, nullable=False)

    parcel = relationship("Parcel", back_populates="imagery_orders")
    tree_count = relationship("TreeCount", back_populates="order", uselist=False, cascade="all, delete-orphan")


class TreeCount(Base):
    __tablename__ = "tree_counts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    imagery_order_id = Column(String(36), ForeignKey("imagery_orders.id"), nullable=False, unique=True)
    total_trees = Column(Integer, nullable=False)
    density_per_ha = Column(Float, nullable=False)
    crown_polygons_geojson = Column(JSON, nullable=False) # FeatureCollection of crowns
    mean_crown_area_sqm = Column(Float, nullable=False)

    order = relationship("ImageryOrder", back_populates="tree_count")


class EcosystemMetrics(Base):
    __tablename__ = "ecosystem_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parcel_id = Column(String(36), ForeignKey("parcels.id"), nullable=False)
    imagery_order_id = Column(String(36), ForeignKey("imagery_orders.id"), nullable=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    mean_ndvi = Column(Float, nullable=False)
    mean_evi = Column(Float, nullable=False)
    mean_ndwi = Column(Float, nullable=False)
    mean_sar_rvi = Column(Float, nullable=False)
    
    agb_tonnes = Column(Float, default=0.0, nullable=False)
    bgb_tonnes = Column(Float, default=0.0, nullable=False)
    tco2e_sequestered = Column(Float, default=0.0, nullable=False)
    survival_rate_pct = Column(Float, default=100.0, nullable=False)
    
    # LULC breakdown
    cultivated_ha = Column(Float, default=0.0, nullable=False)
    forest_ha = Column(Float, default=0.0, nullable=False)
    grassland_ha = Column(Float, default=0.0, nullable=False)
    wetland_ha = Column(Float, default=0.0, nullable=False)
    water_ha = Column(Float, default=0.0, nullable=False)
    bare_soil_ha = Column(Float, default=0.0, nullable=False)

    parcel = relationship("Parcel", back_populates="ecosystem_metrics")


class WaterQualityMetrics(Base):
    __tablename__ = "water_quality_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parcel_id = Column(String(36), ForeignKey("parcels.id"), nullable=False)
    imagery_order_id = Column(String(36), ForeignKey("imagery_orders.id"), nullable=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    mean_tss_mg_l = Column(Float, nullable=False)
    mean_turbidity_ntu = Column(Float, nullable=False)
    mean_ph = Column(Float, nullable=False)
    mean_ec_ms_cm = Column(Float, nullable=False)
    clogging_risk_level = Column(String(50), default="NONE", nullable=False) # NONE, MODERATE, SEVERE
    water_surface_area_ha = Column(Float, nullable=False)
    raster_layer_path = Column(String(500), nullable=True)

    parcel = relationship("Parcel", back_populates="water_metrics")


class IrrigationRecord(Base):
    __tablename__ = "irrigation_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parcel_id = Column(String(36), ForeignKey("parcels.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    et0_mm = Column(Float, nullable=False)
    etc_mm = Column(Float, nullable=False)
    eta_mm = Column(Float, nullable=False)
    kc_value = Column(Float, nullable=False)
    effective_rainfall_mm = Column(Float, default=0.0, nullable=False)
    forecast_rainfall_mm = Column(Float, default=0.0, nullable=False)
    soil_water_storage_mm = Column(Float, nullable=False)
    water_deficit_mm = Column(Float, nullable=False)
    net_irrigation_req_mm = Column(Float, nullable=False)
    gross_irrigation_req_mm = Column(Float, nullable=False)
    water_volume_m3 = Column(Float, nullable=False)
    cwri_decadal = Column(Float, default=85.0, nullable=False)
    wrsi_cumulative = Column(Float, default=92.0, nullable=False)
    urgency_status = Column(String(50), default="NONE", nullable=False) # NONE, MONITOR, RECOMMENDED, URGENT
    explanation_text = Column(Text, nullable=False)
    confidence_pct = Column(Float, default=92.0, nullable=False)
    is_applied = Column(Boolean, default=False, nullable=False)

    parcel = relationship("Parcel", back_populates="irrigation_records")


class MRVCertificate(Base):
    __tablename__ = "mrv_certificates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parcel_id = Column(String(36), ForeignKey("parcels.id"), nullable=False)
    certificate_number = Column(String(100), unique=True, nullable=False)
    verification_token = Column(String(100), unique=True, index=True, nullable=False)
    sha256_spatial_hash = Column(String(64), nullable=False)
    sha256_raster_hash = Column(String(64), nullable=False)
    total_trees_verified = Column(Integer, nullable=False)
    tco2e_net_tradable = Column(Float, nullable=False)
    pdf_storage_path = Column(String(500), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)

    parcel = relationship("Parcel", back_populates="mrv_certificates")


class FieldSurvey(Base):
    __tablename__ = "field_surveys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parcel_id = Column(String(36), ForeignKey("parcels.id"), nullable=False)
    surveyor_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    device_sync_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="SYNCED", nullable=False) # DRAFT_LOCAL, SYNCED, VERIFIED

    parcel = relationship("Parcel", back_populates="field_surveys")
    observations = relationship("GroundTruthObservation", back_populates="survey", cascade="all, delete-orphan")


class GroundTruthObservation(Base):
    __tablename__ = "ground_truth_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    survey_id = Column(String(36), ForeignKey("field_surveys.id"), nullable=False)
    matched_tree_id = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    species_identified = Column(String(100), nullable=False)
    measured_dbh_cm = Column(Float, nullable=False)
    measured_height_m = Column(Float, nullable=False)
    photo_storage_path = Column(String(500), nullable=True)
    edge_model_confidence = Column(Float, default=0.92, nullable=False)

    survey = relationship("FieldSurvey", back_populates="observations")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    abandoned_step = Column(String(100), nullable=True) # e.g. "checkout_abandoned"
    rrweb_recording_path = Column(String(500), nullable=True)

    user = relationship("User", back_populates="sessions")


class RetentionCampaign(Base):
    __tablename__ = "retention_campaigns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    friction_summary = Column(Text, nullable=False)
    suggested_email_subject = Column(String(255), nullable=False)
    suggested_email_body = Column(Text, nullable=False)
    status = Column(String(50), default="DRAFT", nullable=False) # DRAFT, SENT, CONVERTED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="campaigns")


class SatelliteApiConfig(Base):
    __tablename__ = "satellite_api_configs"

    id = Column(String(50), primary_key=True) # e.g. tier_1, tier_2, tier_3, tier_4
    tier_id = Column(String(50), nullable=False) # tier_1, tier_2, tier_3, tier_4
    provider_name = Column(String(100), nullable=False)
    resolution_label = Column(String(100), nullable=False)
    api_endpoint = Column(String(500), nullable=False)
    secondary_endpoint = Column(String(500), nullable=True)
    api_key = Column(String(500), nullable=True)
    secondary_secret = Column(String(500), nullable=True) # client secret, project id, etc.
    is_enabled = Column(Boolean, default=True, nullable=False)
    last_tested_at = Column(DateTime, nullable=True)
    last_test_status = Column(String(50), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)  # e.g. "system_mode"
    value = Column(String(500), nullable=False)  # e.g. "TESTING" or "PRODUCTION"
    description = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = Column(String(100), default="admin", nullable=True)


class TanzaniaWard(Base):
    """
    Official Tanzania Administrative Ward Boundaries (NBS 2022 Census).
    Indexed with spatial bounding boxes and centroids for sub-millisecond
    candidate pruning before exact polygon point-in-polygon geometry inference.
    """
    __tablename__ = "tanzania_wards"

    id = Column(String(64), primary_key=True)  # e.g. "TZ-040101" or ward_code
    ward_code = Column(String(50), unique=True, index=True, nullable=False)
    ward_name = Column(String(100), index=True, nullable=False)
    district_name = Column(String(100), index=True, nullable=False)
    region_name = Column(String(100), index=True, nullable=False)
    zone = Column(String(100), nullable=True)
    ecozone = Column(String(100), nullable=False)
    category = Column(String(50), default="agriculture", nullable=False)
    primary_feature = Column(String(255), nullable=True)
    approx_area_ha = Column(Float, nullable=False)

    # Spatial indices for fast point-in-polygon inference
    centroid_lat = Column(Float, index=True, nullable=False)
    centroid_lon = Column(Float, index=True, nullable=False)
    bbox_min_lon = Column(Float, index=True, nullable=False)
    bbox_min_lat = Column(Float, index=True, nullable=False)
    bbox_max_lon = Column(Float, index=True, nullable=False)
    bbox_max_lat = Column(Float, index=True, nullable=False)

    # Full GeoJSON geometry for rendering and precision topological verification
    geojson_geometry = Column(JSON, nullable=False)

    from app.database import db_url, engine
    if "sqlite" in db_url or "sqlite" in str(engine.url):
        geom = Column(Text, nullable=True)
    else:
        geom = Column(Geometry("POLYGON", srid=4326), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class TanzaniaForestReserve(Base):
    """
    Official Tanzania Forest Reserves & Nature Reserves (TFS / WDPA).
    696 protected and gazetted forest reserves across Tanzania totaling ~9.57M hectares.
    Indexed with spatial bounding boxes, centroids, and PostGIS Geometry for
    fast spatial filtering, map rendering, and land cover / deforestation monitoring.
    """
    __tablename__ = "tanzania_forest_reserves"

    id = Column(String(64), primary_key=True)  # e.g. "FR-555697525" or "FR-301361"
    wdpa_id = Column(Integer, unique=True, index=True, nullable=True)
    name = Column(String(200), index=True, nullable=False)
    orig_name = Column(String(200), nullable=True)
    designation = Column(String(100), index=True, nullable=False)  # Nature Forest Reserve, Forest Reserve, Sanctuary
    designation_type = Column(String(50), default="National", nullable=True)
    iucn_category = Column(String(50), index=True, nullable=True)  # II, IV, VI, Ib, Not Reported
    status = Column(String(50), default="Designated", nullable=True)
    status_year = Column(Integer, nullable=True)
    governance_type = Column(String(150), nullable=True)
    management_authority = Column(String(150), nullable=True)  # Tanzania Forest Services (TFS) Agency
    sub_location = Column(String(50), nullable=True)  # Region code / SUB_LOC
    gis_area_km2 = Column(Float, nullable=False)
    area_ha = Column(Float, index=True, nullable=False)  # GIS_AREA * 100.0

    # Spatial indices for fast map pruning and point-in-polygon
    centroid_lat = Column(Float, index=True, nullable=False)
    centroid_lon = Column(Float, index=True, nullable=False)
    bbox_min_lon = Column(Float, index=True, nullable=False)
    bbox_min_lat = Column(Float, index=True, nullable=False)
    bbox_max_lon = Column(Float, index=True, nullable=False)
    bbox_max_lat = Column(Float, index=True, nullable=False)

    # Full GeoJSON geometry for vector rendering and satellite polygon reduction
    geojson_geometry = Column(JSON, nullable=False)

    from app.database import db_url, engine
    if "sqlite" in db_url or "sqlite" in str(engine.url):
        geom = Column(Text, nullable=True)
    else:
        geom = Column(Geometry("GEOMETRY", srid=4326), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)




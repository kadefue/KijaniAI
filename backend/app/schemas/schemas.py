from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# Auth
class UserRegister(BaseModel):
    email: str
    password: str
    role: Optional[str] = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: str
    email: str
    role: str
    wallet_balance_usd: float
    created_at: datetime

    class Config:
        from_attributes = True

# Pricing
class PricingTierOut(BaseModel):
    id: str
    name: str
    sensors: str
    resolution_label: str
    base_cost_per_ha: float
    min_hectares: float
    markup_pct: float
    is_active: bool

    class Config:
        from_attributes = True

class PricingTierUpdate(BaseModel):
    base_cost_per_ha: Optional[float] = None
    min_hectares: Optional[float] = None
    markup_pct: Optional[float] = None
    is_active: Optional[bool] = None

# Parcel & Boundary
class ParcelCreate(BaseModel):
    name: str
    category: str # forest, agriculture, grassland, wetland, water_body, restoration
    crop_type: Optional[str] = None
    irrigation_system_type: Optional[str] = "DRIP"
    irrigation_efficiency: Optional[float] = 0.90
    ecozone: Optional[str] = "MIOMBO"
    region: Optional[str] = "Morogoro"
    geojson_geometry: Dict[str, Any]

class ParcelOut(BaseModel):
    id: str
    user_id: str
    name: str
    category: str
    crop_type: Optional[str] = None
    planting_date: Optional[datetime] = None
    irrigation_system_type: str
    irrigation_efficiency: float
    ecozone: str
    region: str
    area_ha: float
    geojson_geometry: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Soil Profile
class PredefinedSoilProfileOut(BaseModel):
    id: str
    texture_class: str
    description: str
    sand_pct: float
    clay_pct: float
    silt_pct: float
    field_capacity: float
    wilting_point: float
    available_water_capacity_mm_m: float
    rooting_depth_m: float

class SoilProfileOut(BaseModel):
    id: str
    parcel_id: str
    texture_class: str
    sand_pct: float
    clay_pct: float
    field_capacity: float
    wilting_point: float
    available_water_capacity_mm_m: float
    rooting_depth_m: float

    class Config:
        from_attributes = True

class SoilProfileUpdate(BaseModel):
    texture_class: Optional[str] = None
    sand_pct: Optional[float] = None
    clay_pct: Optional[float] = None
    field_capacity: Optional[float] = None
    wilting_point: Optional[float] = None
    available_water_capacity_mm_m: Optional[float] = None
    rooting_depth_m: Optional[float] = None

# Imagery Order & Quoting
class ImagerySearchRequest(BaseModel):
    parcel_id: str
    tier_id: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    max_cloud_cover: Optional[float] = 20.0

class ImageryQuoteRequest(BaseModel):
    parcel_id: str
    tier_id: str

class ImageryQuoteResponse(BaseModel):
    parcel_id: str
    tier_id: str
    parcel_area_ha: float
    billable_hectares: float
    base_cost_per_ha: float
    raw_cost_usd: float
    markup_pct: float
    total_cost_usd: float
    user_wallet_balance: float
    sufficient_funds: bool

class ImageryOrderCreate(BaseModel):
    parcel_id: str
    tier_id: str

# KijaniMaji (Water Quality)
class WaterQualityOut(BaseModel):
    parcel_id: str
    date: datetime
    mean_tss_mg_l: float
    mean_turbidity_ntu: float
    mean_ph: float
    mean_ec_ms_cm: float
    clogging_risk_level: str
    water_surface_area_ha: float
    has_water_detected: bool
    standards: Dict[str, Any]

class PointExtractionRequest(BaseModel):
    points: List[Dict[str, float]] # [{"lat": -6.83, "lon": 37.64, "name": "Station A"}]

# KijaniIrrigation
class IrrigationStatusOut(BaseModel):
    parcel_id: str
    crop_type: Optional[str]
    date: datetime
    et0_mm: float
    etc_mm: float
    eta_mm: float
    kc_value: float
    effective_rainfall_mm: float
    forecast_rainfall_mm: float
    soil_water_storage_mm: float
    field_capacity_mm: float
    wilting_point_mm: float
    water_deficit_mm: float
    net_irrigation_req_mm: float
    gross_irrigation_req_mm: float
    water_volume_m3: float
    water_volume_liters: float
    cwri_decadal: float
    wrsi_cumulative: float
    pumping_hours_at_10m3h: float
    urgency_status: str
    explanation_text: str
    confidence_pct: float
    forecast_gated: bool

class IrrigationLogEvent(BaseModel):
    applied_volume_m3: float
    method: Optional[str] = "DRIP"
    notes: Optional[str] = None

# KijaniCarbon & MRV
class CarbonMetricsOut(BaseModel):
    parcel_id: str
    ecozone: str
    total_trees: int
    mean_crown_diameter_m: float
    agb_tonnes: float
    bgb_tonnes: float
    total_biomass_tonnes: float
    gross_tco2e: float
    buffer_deduction_pct: float
    net_tco2e_tradable: float
    soc_baseline_t_per_ha: float

class MRVCertificateOut(BaseModel):
    id: str
    parcel_id: str
    certificate_number: str
    verification_token: str
    sha256_spatial_hash: str
    sha256_raster_hash: str
    total_trees_verified: int
    tco2e_net_tradable: float
    verification_url: str
    download_pdf_url: str
    generated_at: datetime
    is_revoked: bool

# KijaniSync / Ground Truth
class GroundObservationCreate(BaseModel):
    matched_tree_id: Optional[str] = None
    latitude: float
    longitude: float
    species_identified: str
    measured_dbh_cm: float
    measured_height_m: float
    photo_base64: Optional[str] = None
    edge_model_confidence: Optional[float] = 0.90

class FieldSurveySyncBatch(BaseModel):
    parcel_id: str
    observations: List[GroundObservationCreate]

# Copilot
class CopilotMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class CopilotChatRequest(BaseModel):
    messages: List[CopilotMessage]
    parcel_id: Optional[str] = None
    language: Optional[str] = "en" # "en" or "sw"

# Telemetry
class TelemetryEvent(BaseModel):
    event_type: str
    details: Dict[str, Any]
    timestamp: Optional[datetime] = None

class SessionRecordingPayload(BaseModel):
    session_id: Optional[str] = None
    abandoned_step: Optional[str] = None
    rrweb_events: List[Dict[str, Any]]

# Satellite API Engine & Provider Configuration
class SatelliteApiConfigOut(BaseModel):
    id: str
    tier_id: str
    provider_name: str
    resolution_label: str
    api_endpoint: str
    secondary_endpoint: Optional[str] = None
    api_key_masked: str
    has_api_key: bool
    secondary_secret_masked: str
    has_secondary_secret: bool
    is_enabled: bool
    last_tested_at: Optional[datetime] = None
    last_test_status: Optional[str] = None
    updated_at: Optional[datetime] = None

class SatelliteApiConfigUpdate(BaseModel):
    tier_id: str
    api_key: Optional[str] = None
    secondary_secret: Optional[str] = None
    api_endpoint: Optional[str] = None
    secondary_endpoint: Optional[str] = None
    is_enabled: Optional[bool] = None

class SatelliteApiTestRequest(BaseModel):
    tier_id: str
    api_key: Optional[str] = None
    secondary_secret: Optional[str] = None
    custom_endpoint: Optional[str] = None

class SatelliteApiTestResponse(BaseModel):
    tier_id: str
    provider: str
    success: bool
    status_code: Optional[int] = None
    latency_ms: Optional[float] = None
    message: str
    tested_endpoint: str
    details: Optional[Dict[str, Any]] = None

class SatelliteDatasetDownloadRequest(BaseModel):
    parcel_id: str
    tier_id: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class SatelliteDatasetDownloadResponse(BaseModel):
    order_code: str
    tier_id: str
    sensor: str
    provider: str
    resolution_m: float
    cloud_cover_pct: float
    status: str
    clipped_to_aoi: bool
    crs: str
    storage_path: str
    tile_stream_url: str
    download_url: str
    ingested_at: datetime
    gee_server_side_computations: Optional[Dict[str, Any]] = None

# Free-Tier Service Selection & Climate Settings
class FreeTierSettingsOut(BaseModel):
    active_provider: str  # "GEE", "PLANETARY_COMPUTER", "CDSE"
    provider: Optional[str] = None
    available_providers: List[str]
    gee_project_id: Optional[str] = None
    gee_service_account_masked: Optional[str] = None
    has_gee_credentials: bool
    gee_status: Dict[str, Any]
    chirps_dataset_id: str
    openweathermap_api_key_masked: Optional[str] = None
    has_openweathermap_key: bool
    openweathermap_has_key: Optional[bool] = None
    openweathermap_base_url: str

class FreeTierSettingsUpdate(BaseModel):
    active_provider: Optional[str] = None  # "GEE", "PLANETARY_COMPUTER", "CDSE"
    provider: Optional[str] = None
    gee_project_id: Optional[str] = None
    gee_service_account: Optional[str] = None
    gee_private_key_json: Optional[str] = None
    openweathermap_api_key: Optional[str] = None


# System Operational Mode Schemas (Testing vs Production)
class SystemModeStatusOut(BaseModel):
    system_mode: str  # "TESTING" or "PRODUCTION"
    is_testing_mode: bool
    is_production_mode: bool
    label: str
    description: str
    deepforest_available: bool
    deepforest_status: Dict[str, Any]
    gee_available: bool
    active_features: List[str]
    last_updated_at: Optional[datetime] = None
    updated_by: Optional[str] = "admin"


class SystemModeUpdate(BaseModel):
    system_mode: str  # "TESTING" or "PRODUCTION"
    updated_by: Optional[str] = "admin"


# Official Tanzania NBS 2022 Census Boundaries Schemas
class TanzaniaNBSInfoOut(BaseModel):
    dataset_title: str
    dataset_title_sw: str
    publisher: str
    census_year: int
    official_download_url: str
    format: str
    coordinate_reference_system: str
    coverage: str
    administrative_level: str
    total_wards_approx: int
    file_size_bytes: int
    file_size_mb: float
    supported_in_kijani: bool
    kijani_ingestion_engine: str


class QuickImportNBSWardRequest(BaseModel):
    ward_name: str
    custom_name: Optional[str] = None
    crop_type: Optional[str] = "maize"
    irrigation_system_type: Optional[str] = "DRIP"


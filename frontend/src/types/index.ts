export type ParcelCategory = 'forest' | 'agriculture' | 'grassland' | 'wetland' | 'water_body' | 'restoration';

export interface Parcel {
  id: string;
  user_id: string;
  name: string;
  category: ParcelCategory;
  crop_type?: string | null;
  planting_date?: string | null;
  irrigation_system_type: 'DRIP' | 'SPRINKLER' | 'FURROW' | 'PIVOT';
  irrigation_efficiency: number;
  ecozone: 'MIOMBO' | 'EASTERN_ARC_MONTANE' | 'COASTAL_MANGROVE' | 'DRY_SAVANNAH_AGRO';
  region: string;
  area_ha: number;
  geojson_geometry: any;
  created_at: string;
}

export interface PricingTier {
  id: string;
  name: string;
  sensors: string;
  resolution_label: string;
  base_cost_per_ha: number;
  min_hectares: number;
  markup_pct: number;
  is_active: boolean;
}

export interface IrrigationStatus {
  parcel_id: string;
  crop_type?: string;
  date: string;
  et0_mm: number;
  etc_mm: number;
  eta_mm: number;
  kc_value: number;
  effective_rainfall_mm: number;
  forecast_rainfall_mm: number;
  soil_water_storage_mm: number;
  field_capacity_mm: number;
  wilting_point_mm: number;
  water_deficit_mm: number;
  net_irrigation_req_mm: number;
  gross_irrigation_req_mm: number;
  water_volume_m3: number;
  water_volume_liters: number;
  pumping_hours_at_10m3h: number;
  urgency_status: 'NONE' | 'MONITOR' | 'RECOMMENDED' | 'URGENT';
  explanation_text: string;
  confidence_pct: number;
  forecast_gated: boolean;
  cwri_decadal: number;
  wrsi_cumulative: number;
  yield_reduction_pct: number;
  vulnerability_tier: 'LOW' | 'MODERATE' | 'SEVERE' | 'CATASTROPHIC';
}

export interface WaterQuality {
  parcel_id: string;
  date: string;
  mean_tss_mg_l: number;
  mean_turbidity_ntu: number;
  mean_ph: number;
  mean_ec_ms_cm: number;
  clogging_risk_level: 'NONE' | 'MODERATE' | 'SEVERE';
  ph_clogging_hazard?: string;
  water_surface_area_ha: number;
  has_water_detected: boolean;
  notification?: string;
  standards: {
    fao_clogging: any;
    who_tanzania_drinking: any;
  };
}

export interface TreeCountData {
  total_trees: number;
  density_per_ha: number;
  crown_cover_pct: number;
  mean_crown_diameter_m: number;
  mean_crown_area_sqm: number;
  spacing_pattern: string;
  crown_polygons_geojson: any;
}

export interface CarbonMetrics {
  parcel_id: string;
  ecozone: string;
  area_ha: number;
  total_trees: number;
  mean_crown_diameter_m: number;
  agb_tonnes: number;
  bgb_tonnes: number;
  total_biomass_tonnes: number;
  gross_tco2e: number;
  buffer_deduction_pct: number;
  buffer_tco2e: number;
  net_tco2e_tradable: number;
  soc_baseline_t_per_ha: number;
  total_soc_tonnes: number;
  uncertainty_range_pct: number;
}

export interface UserSessionRecord {
  id: string;
  user_email: string;
  started_at: string;
  ended_at?: string;
  abandoned_step: string;
  has_recording: boolean;
}

export interface RetentionCampaign {
  id: string;
  user_id: string;
  user_email: string;
  friction_summary: string;
  suggested_email_subject: string;
  suggested_email_body: string;
  status: 'DRAFT' | 'SENT';
  created_at: string;
}

export interface SoilProfile {
  id: string;
  parcel_id: string;
  texture_class: string;
  sand_pct: number;
  clay_pct: number;
  field_capacity: number;
  wilting_point: number;
  available_water_capacity_mm_m: number;
  rooting_depth_m: number;
}

export interface PredefinedSoilProfile {
  id: string;
  texture_class: string;
  description: string;
  sand_pct: number;
  clay_pct: number;
  silt_pct: number;
  field_capacity: number;
  wilting_point: number;
  available_water_capacity_mm_m: number;
  rooting_depth_m: number;
}

export interface FreeTierSettings {
  active_provider: 'GEE' | 'PLANETARY_COMPUTER' | 'CDSE';
  available_providers: string[];
  gee_project_id?: string;
  gee_service_account_masked?: string;
  has_gee_credentials: boolean;
  gee_status: {
    library_installed: boolean;
    is_authenticated: boolean;
    project_id: string;
    has_service_account: boolean;
    status_message: string;
  };
  chirps_dataset_id: string;
  openweathermap_api_key_masked?: string;
  has_openweathermap_key: boolean;
  openweathermap_base_url: string;
}

export interface DailyWeatherForecast {
  date: string;
  rainfall_mm: number;
  temp_max_c: number;
  temp_min_c: number;
  temp_mean_c: number;
  humidity_mean_pct: number;
  wind_speed_ms: number;
  et0_fao56_mm: number;
  condition: string;
}

export interface ParcelWeatherForecast {
  parcel_id: string;
  latitude: number;
  longitude: number;
  provider: string;
  is_live: boolean;
  forecast_rainfall_72h_mm: number;
  will_rain_in_72h: boolean;
  rain_probability_pct: number;
  daily_forecasts: DailyWeatherForecast[];
  city_name: string;
}

export interface SystemModeStatus {
  system_mode: 'TESTING' | 'PRODUCTION';
  is_testing_mode: boolean;
  is_production_mode: boolean;
  label: string;
  description: string;
  deepforest_available: boolean;
  deepforest_status: {
    installed: boolean;
    version: string;
    model_architecture: string;
    device: string;
    cuda_available: boolean;
    weights_ready: boolean;
    confidence_threshold: number;
    supported_ecozones: string[];
    pipeline_state?: string;
  };
  gee_available: boolean;
  active_features: string[];
  last_updated_at?: string;
  updated_by?: string;
}


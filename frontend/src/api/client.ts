import { Parcel } from '../types';

const API_BASE = '/api';

export async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  getCurrentUser: () => fetchJson<any>('/auth/me'),

  // Parcels
  listParcels: () => fetchJson<any[]>('/parcels'),
  getParcel: (id: string) => fetchJson<any>(`/parcels/${id}`),
  uploadParcel: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/parcels/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to upload boundary');
    }
    return res.json();
  },

  // Imagery & Quoting
  getPricingTiers: () => fetchJson<any[]>('/admin/pricing-tiers'),
  quoteImagery: (parcelId: string, tierId: string) =>
    fetchJson<any>('/imagery/quote', {
      method: 'POST',
      body: JSON.stringify({ parcel_id: parcelId, tier_id: tierId }),
    }),
  orderImagery: (parcelId: string, tierId: string) =>
    fetchJson<any>('/imagery/order', {
      method: 'POST',
      body: JSON.stringify({ parcel_id: parcelId, tier_id: tierId }),
    }),

  // Modules
  getIrrigationStatus: (parcelId: string) => fetchJson<any>(`/modules/irrigation/${parcelId}/status`),
  getIrrigationWaterBalance: (parcelId: string) => fetchJson<any>(`/modules/irrigation/${parcelId}/water-balance`),
  getIrrigationCwri: (parcelId: string) => fetchJson<any>(`/modules/irrigation/${parcelId}/cwri`),
  logIrrigationEvent: (parcelId: string, appliedM3: number) =>
    fetchJson<any>(`/modules/irrigation/${parcelId}/log-event`, {
      method: 'POST',
      body: JSON.stringify({ applied_volume_m3: appliedM3 }),
    }),

  getWaterQuality: (parcelId: string) => fetchJson<any>(`/modules/water/${parcelId}`),
  getWaterTimeseries: (parcelId: string) => fetchJson<any>(`/modules/water/${parcelId}/timeseries`),
  extractWaterPointsCsv: async (parcelId: string, points: any[]) => {
    const res = await fetch(`${API_BASE}/modules/water/${parcelId}/extract-points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kijani_water_points_${parcelId.slice(0, 8)}.csv`;
    a.click();
  },

  getTreeCount: (parcelId: string) => fetchJson<any>(`/modules/count/${parcelId}`),
  getVegetationHealth: (parcelId: string) => fetchJson<any>(`/modules/health/${parcelId}`),
  getRadarProfile: (parcelId: string) => fetchJson<any>(`/modules/radar/${parcelId}`),
  getWatchDisturbances: (parcelId: string) => fetchJson<any>(`/modules/watch/${parcelId}`),
  getCarbonMetrics: (parcelId: string) => fetchJson<any>(`/modules/carbon/${parcelId}`),
  generateMrvCertificate: (parcelId: string) =>
    fetchJson<any>(`/modules/carbon/${parcelId}/generate-mrv`, { method: 'POST' }),
  recalibrateCarbon: (parcelId: string) =>
    fetchJson<any>(`/modules/carbon/${parcelId}/recalibrate`, { method: 'POST' }),
  getRestoreMetrics: (parcelId: string) => fetchJson<any>(`/modules/restore/${parcelId}`),
  getLulcMap: (parcelId: string) => fetchJson<any>(`/modules/map/${parcelId}`),

  // Sync
  syncObservations: (parcelId: string, observations: any[]) =>
    fetchJson<any>('/sync/observations', {
      method: 'POST',
      body: JSON.stringify({ parcel_id: parcelId, observations }),
    }),

  // Copilot
  chatCopilot: (messages: any[], parcelId?: string, language: string = 'en') =>
    fetchJson<any>('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, parcel_id: parcelId, language }),
    }),

  // Telemetry
  recordTelemetryEvent: (eventType: string, details: any) =>
    fetchJson<any>('/telemetry/events', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, details }),
    }),
  submitSessionRecording: (sessionId: string | null, abandonedStep: string | null, rrwebEvents: any[]) =>
    fetchJson<any>('/telemetry/session-recording', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, abandoned_step: abandonedStep, rrweb_events: rrwebEvents }),
    }),

  // Admin
  updatePricingTier: (tierId: string, data: any) =>
    fetchJson<any>(`/admin/pricing-tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listAdminSessions: () => fetchJson<any[]>('/admin/sessions'),
  getSessionReplay: (sessionId: string) => fetchJson<any>(`/admin/sessions/${sessionId}/replay`),
  listRetentionCampaigns: () => fetchJson<any[]>('/admin/retention/campaigns'),
  generateRetentionCampaign: (userId: string) =>
    fetchJson<any>(`/admin/retention/generate/${userId}`, { method: 'POST' }),
  sendRetentionCampaign: (campaignId: string) =>
    fetchJson<any>(`/admin/retention/send/${campaignId}`, { method: 'POST' }),

  // Satellite Provider APIs & Datasets
  getSatelliteApiConfigs: () => fetchJson<any[]>('/admin/satellite-apis'),
  saveSatelliteApiConfig: (data: {
    tier_id: string;
    api_key?: string;
    secondary_secret?: string;
    api_endpoint?: string;
    secondary_endpoint?: string;
    is_enabled?: boolean;
  }) =>
    fetchJson<any>('/admin/satellite-apis', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testSatelliteApiConnection: (data: {
    tier_id: string;
    api_key?: string;
    secondary_secret?: string;
    custom_endpoint?: string;
  }) =>
    fetchJson<any>('/admin/satellite-apis/test-connection', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  downloadDataset: (parcelId: string, tierId: string, dateFrom?: string, dateTo?: string) =>
    fetchJson<any>('/imagery/download-dataset', {
      method: 'POST',
      body: JSON.stringify({
        parcel_id: parcelId,
        tier_id: tierId,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    }),

  // Soil Profiles
  getPredefinedSoilProfiles: () => fetchJson<any[]>('/parcels/soil-profiles/predefined'),
  getParcelSoilProfile: (parcelId: string) => fetchJson<any>(`/parcels/${parcelId}/soil-profile`),
  updateParcelSoilProfile: (parcelId: string, data: {
    texture_class?: string;
    sand_pct?: number;
    clay_pct?: number;
    field_capacity?: number;
    wilting_point?: number;
    available_water_capacity_mm_m?: number;
    rooting_depth_m?: number;
  }) =>
    fetchJson<any>(`/parcels/${parcelId}/soil-profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Free-Tier Service Selection & Climate APIs (GEE, CHIRPS, OpenWeatherMap)
  getFreeTierSettings: () => fetchJson<any>('/admin/free-tier-provider'),
  updateFreeTierSettings: (data: {
    active_provider?: string;
    gee_project_id?: string;
    gee_service_account?: string;
    gee_private_key_json?: string;
    openweathermap_api_key?: string;
  }) =>
    fetchJson<any>('/admin/free-tier-provider', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getParcelWeatherForecast: (parcelId: string) =>
    fetchJson<any>(`/modules/irrigation/${parcelId}/weather-forecast`),
  getParcelChirpsRainfall: (parcelId: string, days: number = 14) =>
    fetchJson<any>(`/modules/irrigation/${parcelId}/chirps-rainfall?days=${days}`),

  // System Operational Mode (Testing Mode vs Production Mode)
  getSystemMode: () => fetchJson<any>('/admin/system-mode'),
  updateSystemMode: (systemMode: 'TESTING' | 'PRODUCTION') =>
    fetchJson<any>('/admin/system-mode', {
      method: 'PUT',
      body: JSON.stringify({ system_mode: systemMode }),
    }),

  // Official Tanzania NBS 2022 Census Ward Boundaries
  getTanzaniaNbsInfo: () => fetchJson<any>('/parcels/tanzania-nbs/info'),
  getTanzaniaNbsCatalog: () => fetchJson<any>('/parcels/tanzania-nbs/catalog'),
  quickImportNbsWard: (data: {
    ward_name: string;
    custom_name?: string;
    crop_type?: string;
    irrigation_system_type?: string;
  }) =>
    fetchJson<Parcel>('/parcels/tanzania-nbs/quick-import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};


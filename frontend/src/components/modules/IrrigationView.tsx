import React, { useState, useEffect } from 'react';
import { 
  Droplets, AlertCircle, Clock, CloudRain, Gauge, Activity, 
  Send, CheckCircle, HelpCircle, Sliders, Layers, RefreshCw,
  Settings2, Check, X, Sparkles, ChevronRight, Info, Globe, Cpu, Sun, Thermometer
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine 
} from 'recharts';
import { IrrigationStatus, Parcel, SoilProfile, PredefinedSoilProfile, ParcelWeatherForecast, FreeTierSettings } from '../../types';
import { api } from '../../api/client';

interface IrrigationViewProps {
  parcel: Parcel;
}

export const IrrigationView: React.FC<IrrigationViewProps> = ({ parcel }) => {
  const [status, setStatus] = useState<IrrigationStatus | null>(null);
  const [waterBalance, setWaterBalance] = useState<any[]>([]);
  const [cwriData, setCwriData] = useState<any | null>(null);
  const [soilProfile, setSoilProfile] = useState<SoilProfile | null>(null);
  const [predefinedProfiles, setPredefinedProfiles] = useState<PredefinedSoilProfile[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<ParcelWeatherForecast | null>(null);
  const [freeTierSettings, setFreeTierSettings] = useState<FreeTierSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [logVolume, setLogVolume] = useState<string>('50');
  const [logSuccess, setLogSuccess] = useState<string | null>(null);

  // Soil modal & edit state
  const [isSoilModalOpen, setIsSoilModalOpen] = useState<boolean>(false);
  const [soilMode, setSoilMode] = useState<'predefined' | 'custom'>('predefined');
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Sandy Clay Loam');
  const [customTexture, setCustomTexture] = useState<string>('Custom Soil');
  const [customSand, setCustomSand] = useState<number>(50);
  const [customClay, setCustomClay] = useState<number>(25);
  const [customFc, setCustomFc] = useState<number>(0.28);
  const [customPwp, setCustomPwp] = useState<number>(0.14);
  const [customRootDepth, setCustomRootDepth] = useState<number>(1.0);
  const [savingSoil, setSavingSoil] = useState<boolean>(false);
  const [soilSuccessMsg, setSoilSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [parcel.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, balanceRes, cwriRes, soilRes, presetsRes, weatherRes, freeRes] = await Promise.all([
        api.getIrrigationStatus(parcel.id),
        api.getIrrigationWaterBalance(parcel.id),
        api.getIrrigationCwri(parcel.id),
        api.getParcelSoilProfile(parcel.id).catch(() => null),
        api.getPredefinedSoilProfiles().catch(() => []),
        api.getParcelWeatherForecast(parcel.id).catch(() => null),
        api.getFreeTierSettings().catch(() => null),
      ]);
      setStatus(statusRes);
      setWaterBalance(balanceRes.water_balance_14d || []);
      setCwriData(cwriRes);
      if (weatherRes) {
        setWeatherForecast(weatherRes);
      }
      if (freeRes) {
        setFreeTierSettings(freeRes);
      }
      if (soilRes) {
        setSoilProfile(soilRes);
        setCustomTexture(soilRes.texture_class || 'Custom Soil');
        setCustomSand(soilRes.sand_pct || 50);
        setCustomClay(soilRes.clay_pct || 25);
        setCustomFc(soilRes.field_capacity || 0.28);
        setCustomPwp(soilRes.wilting_point || 0.14);
        setCustomRootDepth(soilRes.rooting_depth_m || 1.0);
        setSelectedPresetName(soilRes.texture_class || 'Sandy Clay Loam');
      }
      if (presetsRes) {
        setPredefinedProfiles(presetsRes);
      }
    } catch (e) {
      console.error('Failed to load irrigation data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPredefined = (preset: PredefinedSoilProfile) => {
    setSelectedPresetName(preset.texture_class);
    setCustomTexture(preset.texture_class);
    setCustomSand(preset.sand_pct);
    setCustomClay(preset.clay_pct);
    setCustomFc(preset.field_capacity);
    setCustomPwp(preset.wilting_point);
    setCustomRootDepth(preset.rooting_depth_m);
  };

  const handleSaveSoilProfile = async () => {
    setSavingSoil(true);
    try {
      let payload;
      if (soilMode === 'predefined') {
        const preset = predefinedProfiles.find(p => p.texture_class === selectedPresetName);
        if (preset) {
          payload = {
            texture_class: preset.texture_class,
            sand_pct: preset.sand_pct,
            clay_pct: preset.clay_pct,
            field_capacity: preset.field_capacity,
            wilting_point: preset.wilting_point,
            available_water_capacity_mm_m: preset.available_water_capacity_mm_m,
            rooting_depth_m: preset.rooting_depth_m,
          };
        } else {
          payload = {
            texture_class: selectedPresetName,
            field_capacity: customFc,
            wilting_point: customPwp,
            available_water_capacity_mm_m: Math.max(10, Math.round((customFc - customPwp) * 1000)),
            rooting_depth_m: customRootDepth,
          };
        }
      } else {
        const awc = Math.max(10, Math.round((customFc - customPwp) * 1000));
        payload = {
          texture_class: customTexture || 'Custom Defined Soil',
          sand_pct: customSand,
          clay_pct: customClay,
          field_capacity: customFc,
          wilting_point: customPwp,
          available_water_capacity_mm_m: awc,
          rooting_depth_m: customRootDepth,
        };
      }

      const updated = await api.updateParcelSoilProfile(parcel.id, payload);
      setSoilProfile(updated);
      setSoilSuccessMsg('Soil hydraulic profile updated! Recalculating water balance...');
      setTimeout(() => setSoilSuccessMsg(null), 3500);
      setIsSoilModalOpen(false);
      // Reload water balance with new soil parameters
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update soil profile');
    } finally {
      setSavingSoil(false);
    }
  };

  const handleLogEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const vol = parseFloat(logVolume);
    if (!vol || vol <= 0) return;
    try {
      const res = await api.logIrrigationEvent(parcel.id, vol);
      setLogSuccess(res.message);
      setTimeout(() => setLogSuccess(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error logging irrigation');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Calculating FAO-56 Penman-Monteith and root-zone water balance for {parcel.name}...
      </div>
    );
  }

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'URGENT':
        return {
          label: '🔴 URGENT IRRIGATION REQUIRED',
          badgeClass: 'bg-red-950/80 text-red-300 border-red-800 glow-red',
          color: 'text-red-400',
        };
      case 'RECOMMENDED':
        return {
          label: '🟠 IRRIGATION RECOMMENDED',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800 glow-amber',
          color: 'text-amber-400',
        };
      case 'MONITOR':
        return {
          label: '🟡 MONITOR (FORECAST GATED)',
          badgeClass: 'bg-yellow-950/80 text-yellow-300 border-yellow-800',
          color: 'text-yellow-400',
        };
      default:
        return {
          label: '🟢 NO IRRIGATION REQUIRED (SOIL WATER SUFFICIENT)',
          badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800 glow-emerald',
          color: 'text-emerald-400',
        };
    }
  };

  const badge = getUrgencyBadge(status?.urgency_status);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Prominent Operational Status Card */}
      <div className={`p-5 rounded-2xl border ${badge.badgeClass} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-xl`}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Droplets className={`w-5 h-5 ${badge.color} animate-bounce`} />
            <span className="text-sm font-extrabold tracking-wide uppercase">{badge.label}</span>
          </div>
          <p className="text-sm text-slate-200 font-medium max-w-3xl leading-relaxed">
            {status?.explanation_text}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs text-slate-400">Decadal CWRI Score</div>
            <div className="text-2xl font-black text-white">{status?.cwri_decadal.toFixed(1)}%</div>
          </div>
          <div className="h-10 w-px bg-slate-700/60" />
          <div className="text-right">
            <div className="text-xs text-slate-400">Yield Retention</div>
            <div className="text-2xl font-black text-emerald-400">
              {(100 - (status?.yield_reduction_pct || 0)).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* KPI Header Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-xs font-semibold text-slate-400">Net Water Deficit</div>
          <div className="text-xl font-bold text-white">{status?.net_irrigation_req_mm.toFixed(1)} mm</div>
          <div className="text-[11px] text-slate-400">Depletion above RAW</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-xs font-semibold text-slate-400">Gross Application (GIR)</div>
          <div className="text-xl font-bold text-cyan-400">{status?.gross_irrigation_req_mm.toFixed(1)} mm</div>
          <div className="text-[11px] text-slate-400">{parcel.irrigation_system_type} ({(parcel.irrigation_efficiency * 100).toFixed(0)}% eff)</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-xs font-semibold text-slate-400">Required Volume</div>
          <div className="text-xl font-bold text-emerald-400">{status?.water_volume_m3.toLocaleString()} m³</div>
          <div className="text-[11px] text-slate-400">{(status?.water_volume_liters || 0).toLocaleString()} Liters</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-xs font-semibold text-slate-400">Pumping Hours</div>
          <div className="text-xl font-bold text-amber-400 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{status?.pumping_hours_at_10m3h.toFixed(1)} hrs</span>
          </div>
          <div className="text-[11px] text-slate-400">At pump flow rate 10 m³/h</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-xs font-semibold text-slate-400">72h Forecast Rain</div>
          <div className="text-xl font-bold text-sky-400 flex items-center gap-1">
            <CloudRain className="w-4 h-4" />
            <span>{status?.forecast_rainfall_mm.toFixed(1)} mm</span>
          </div>
          <div className="text-[11px] text-slate-400">{status?.forecast_gated ? 'Forecast Gating Active' : 'No Rain Expected'}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-xs font-semibold text-slate-400">Dynamic Satellite Kc</div>
          <div className="text-xl font-bold text-purple-400">{status?.kc_value.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400">{status?.crop_type} Mid-Season</div>
        </div>
      </div>

      {/* Planetary Compute & Climate Intelligence Bar (GEE, CHIRPS, OpenWeatherMap) */}
      <div className="glass-panel p-4 rounded-2xl border border-purple-800/40 bg-gradient-to-r from-slate-900/90 via-purple-950/20 to-slate-900/90 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Planetary Compute:</span>
                <span className="text-purple-300 font-mono">
                  {freeTierSettings?.active_provider === 'GEE' ? 'Google Earth Engine (Server-Side)' : (freeTierSettings?.active_provider || 'Google Earth Engine')}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-700">
                  Free Tier
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Planetary-scale reductions for Sentinel-2, Sentinel-1 SAR & CHIRPS daily precipitation.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
            {status?.system_mode === 'PRODUCTION' ? (
              <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Production Mode (Live ET₀)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Testing Mode (Calibrated Simulation)</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
              <CloudRain className="w-3.5 h-3.5" />
              <span>CHIRPS (0.05°) Rainfall</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OpenWeatherMap 72h Gating</span>
            </div>
          </div>
        </div>

        {/* 5-Day OpenWeatherMap Forecast Grid */}
        {weatherForecast?.daily_forecasts && weatherForecast.daily_forecasts.length > 0 && (
          <div className="pt-2 border-t border-slate-800/60">
            <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                OpenWeatherMap 5-Day Micro-Meteorological & Penman-Monteith ET₀ Forecast
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {weatherForecast.city_name} • 72h Rain: {weatherForecast.forecast_rainfall_72h_mm.toFixed(1)} mm
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {weatherForecast.daily_forecasts.map((df) => (
                <div key={df.date} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 text-center">
                  <div className="text-[11px] font-semibold text-slate-300 font-mono">{df.date.slice(5)}</div>
                  <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    <span>{df.temp_max_c.toFixed(0)}° / {df.temp_min_c.toFixed(0)}°C</span>
                  </div>
                  <div className="text-[11px] font-bold text-cyan-400">
                    {df.rainfall_mm > 0 ? `🌧️ ${df.rainfall_mm.toFixed(1)} mm` : '☀️ 0.0 mm'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ET₀: <span className="font-semibold text-slate-200">{df.et0_fao56_mm.toFixed(1)} mm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Soil Hydraulic Profile & Agro-Pedological Configuration Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Soil Hydraulic Profile & Root-Zone Moisture Limits
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {soilProfile?.texture_class || 'Sandy Clay Loam'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Directly calibrates FAO-56 Penman-Monteith storage ($S_t$), Field Capacity ($FC$), Wilting Point ($PWP$), and depletion triggers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSoilModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Choose / Define Soil Profile</span>
          </button>
        </div>

        {soilSuccessMsg && (
          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{soilSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Texture & Fractions</div>
            <div className="text-sm font-bold text-white truncate">{soilProfile?.texture_class || 'Sandy Clay Loam'}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
              <span>S: {soilProfile?.sand_pct ?? 50}%</span>
              <span>•</span>
              <span>C: {soilProfile?.clay_pct ?? 25}%</span>
              <span>•</span>
              <span>Si: {100 - (soilProfile?.sand_pct ?? 50) - (soilProfile?.clay_pct ?? 25)}%</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Field Capacity (FC)</div>
            <div className="text-sm font-bold text-emerald-400">
              {(status?.field_capacity_mm || (soilProfile?.field_capacity ? soilProfile.field_capacity * 1000 : 280)).toFixed(0)} mm/m
            </div>
            <div className="text-[11px] text-slate-400">
              θ_FC: {(soilProfile?.field_capacity ?? (status?.field_capacity_mm ? status.field_capacity_mm / 1000 : 0.28)).toFixed(3)} m³/m³
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Wilting Point (PWP)</div>
            <div className="text-sm font-bold text-red-400">
              {(status?.wilting_point_mm || (soilProfile?.wilting_point ? soilProfile.wilting_point * 1000 : 140)).toFixed(0)} mm/m
            </div>
            <div className="text-[11px] text-slate-400">
              θ_PWP: {(soilProfile?.wilting_point ?? (status?.wilting_point_mm ? status.wilting_point_mm / 1000 : 0.14)).toFixed(3)} m³/m³
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Water (AWC)</div>
            <div className="text-sm font-bold text-cyan-400">
              {(soilProfile?.available_water_capacity_mm_m || 
                ((status?.field_capacity_mm || 280) - (status?.wilting_point_mm || 140))).toFixed(0)} mm/m
            </div>
            <div className="text-[11px] text-slate-400">Moisture retention window</div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Root Depth & Total TAW</div>
            <div className="text-sm font-bold text-purple-400">
              {soilProfile?.rooting_depth_m ?? 1.0} m
            </div>
            <div className="text-[11px] text-slate-400">
              TAW: {(
                (soilProfile?.available_water_capacity_mm_m || 140) * 
                (soilProfile?.rooting_depth_m ?? 1.0)
              ).toFixed(0)} mm total
            </div>
          </div>
        </div>
      </div>

      {/* Hydrological Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 14-Day Water Balance: St vs FC and PWP */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Dynamic Root-Zone Water Balance (14 Days)
            </h3>
            <span className="text-xs text-slate-400 font-mono">PWP ≤ St ≤ FC</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waterBalance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[100, 320]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReferenceLine y={status?.field_capacity_mm || 280} label="Field Capacity (FC)" stroke="#10b981" strokeDasharray="3 3" />
                <ReferenceLine y={status?.wilting_point_mm || 140} label="Wilting Point (PWP)" stroke="#ef4444" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="root_zone_storage_st_mm" name="Root Storage (St, mm)" stroke="#06b6d4" fill="url(#storageGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Evapotranspiration: ET0 vs ETc vs ETa */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Daily Evapotranspiration Flux (ET₀ vs. ET_c vs. ET_a)
            </h3>
            <span className="text-xs text-slate-400 font-mono">FAO-56 PM</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waterBalance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="et0_mm" name="Ref ET₀ (mm)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="etc_mm" name="Crop ET_c (mm)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="eta_mm" name="Actual ET_a (mm)" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Decadal CWRI & Crop Failure Trajectory + Action Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decadal CWRI Trajectory */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Decadal Crop Water Requirements Index (CWRI)</h3>
              <p className="text-xs text-slate-400">10-day step cumulative satisfaction index & failure risk</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              WRSI: {status?.wrsi_cumulative.toFixed(1)}%
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cwriData?.decadal_trajectory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="decade" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="cwri" name="CWRI (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Log Applied Water Action Console */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Droplets className="w-4 h-4 text-emerald-400" />
              Log Field Irrigation Event
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Apply actual meter reading to recalibrate dynamic root-zone water balance model.
            </p>
          </div>

          <form onSubmit={handleLogEvent} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Volume Applied (m³):</label>
              <input
                type="number"
                value={logVolume}
                onChange={(e) => setLogVolume(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none mt-1"
                placeholder="e.g. 100"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Record Application</span>
            </button>

            {logSuccess && (
              <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 p-2 rounded-lg bg-emerald-950/60 border border-emerald-800">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{logSuccess}</span>
              </div>
            )}
          </form>

          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Updates $S_t$ mass conservation and adjusts NIR deficit.</span>
          </div>
        </div>
      </div>

      {/* Soil Profile Configuration & Definition Modal */}
      {isSoilModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Configure Soil Profile & Moisture Retention
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Select a calibrated agro-pedological profile for East Africa or define custom hydraulic boundaries for <span className="text-white font-semibold">{parcel.name}</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSoilModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setSoilMode('predefined')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${
                  soilMode === 'predefined'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Predefined Soil Profiles ({predefinedProfiles.length || 7} Regional Presets)</span>
              </button>
              <button
                type="button"
                onClick={() => setSoilMode('custom')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${
                  soilMode === 'custom'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span>Define Custom Parameters (User-Specified)</span>
              </button>
            </div>

            {/* Predefined Soil Profiles List/Grid */}
            {soilMode === 'predefined' && (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {predefinedProfiles.map((preset) => {
                    const isSelected = selectedPresetName === preset.texture_class;
                    return (
                      <div
                        key={preset.texture_class}
                        onClick={() => handleSelectPredefined(preset)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                            : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{preset.texture_class}</span>
                              {isSelected && (
                                <span className="p-0.5 rounded-full bg-amber-500 text-slate-950">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-2">
                              {preset.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50 text-[11px]">
                          <div>
                            <span className="text-slate-400">Texture:</span>
                            <div className="font-semibold text-slate-200">
                              {preset.sand_pct}%S / {preset.clay_pct}%C
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">AWC:</span>
                            <div className="font-semibold text-cyan-400">
                              {preset.available_water_capacity_mm_m} mm/m
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">FC / PWP:</span>
                            <div className="font-semibold text-emerald-400">
                              {(preset.field_capacity * 1000).toFixed(0)} / {(preset.wilting_point * 1000).toFixed(0)} mm
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Soil Parameter Inputs */}
            {soilMode === 'custom' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300">Soil Texture Name / Description</label>
                    <input
                      type="text"
                      value={customTexture}
                      onChange={(e) => setCustomTexture(e.target.value)}
                      placeholder="e.g. Kilombero Alluvial Silt Loam"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Sand Percentage (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={customSand}
                      onChange={(e) => setCustomSand(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Clay Percentage (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={customClay}
                      onChange={(e) => setCustomClay(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">
                      Volumetric Field Capacity θ_FC (m³/m³)
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      min={0.05}
                      max={0.65}
                      value={customFc}
                      onChange={(e) => setCustomFc(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1"
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Equivalent to {(customFc * 1000).toFixed(0)} mm/m water depth
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">
                      Volumetric Wilting Point θ_PWP (m³/m³)
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      min={0.02}
                      max={0.45}
                      value={customPwp}
                      onChange={(e) => setCustomPwp(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1"
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Equivalent to {(customPwp * 1000).toFixed(0)} mm/m water depth
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Effective Rooting Depth Zr (m)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.2}
                      max={3.0}
                      value={customRootDepth}
                      onChange={(e) => setCustomRootDepth(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none mt-1"
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Maize: 0.8–1.2m, Avocado: 1.0–1.5m, Vegetables: 0.4–0.6m
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Computed Silt (%)</label>
                    <div className="w-full bg-slate-800/50 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-300 mt-1">
                      {Math.max(0, 100 - customSand - customClay)}% Silt
                    </div>
                  </div>
                </div>

                {/* Real-time Hydraulic Preview Callout */}
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Calculated Root-Zone Moisture Constants</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Available Water Capacity (AWC):</span>
                      <div className="text-sm font-bold text-cyan-400">
                        {Math.max(0, Math.round((customFc - customPwp) * 1000))} mm/m
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Available Water (TAW):</span>
                      <div className="text-sm font-bold text-emerald-400">
                        {Math.max(0, Math.round((customFc - customPwp) * 1000 * customRootDepth))} mm
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Readily Available Water (RAW, p=0.5):</span>
                      <div className="text-sm font-bold text-amber-400">
                        {Math.max(0, Math.round((customFc - customPwp) * 1000 * customRootDepth * 0.5))} mm
                      </div>
                    </div>
                  </div>
                  {customPwp >= customFc && (
                    <div className="text-xs text-red-400 font-semibold pt-1">
                      ⚠️ Wilting Point (θ_PWP) must be strictly less than Field Capacity (θ_FC).
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsSoilModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSoilProfile}
                disabled={savingSoil || (soilMode === 'custom' && customPwp >= customFc)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold transition shadow-lg shadow-amber-500/20"
              >
                {savingSoil ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Recalculating Hydrology...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Apply & Recalculate Water Balance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

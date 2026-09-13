import React, { useState, useEffect } from 'react';
import { 
  Waves, AlertTriangle, Download, ShieldCheck, Info, FileSpreadsheet, 
  Layers, CheckCircle 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';
import { WaterQuality, Parcel } from '../../types';
import { api } from '../../api/client';

interface MajiWaterViewProps {
  parcel: Parcel;
}

export const MajiWaterView: React.FC<MajiWaterViewProps> = ({ parcel }) => {
  const [data, setData] = useState<WaterQuality | null>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [activeParam, setActiveParam] = useState<'tss' | 'turbidity' | 'ph' | 'ec'>('tss');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [parcel.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wqRes, tsRes] = await Promise.all([
        api.getWaterQuality(parcel.id),
        api.getWaterTimeseries(parcel.id),
      ]);
      setData(wqRes);
      setTimeseries(tsRes.timeseries || []);
    } catch (e) {
      console.error('Failed to load water quality data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const samplePoints = [
        { name: 'Reservoir Intake Node 1', lat: -6.835, lon: 37.602 },
        { name: 'Spillway Sediment Station', lat: -6.842, lon: 37.615 },
        { name: 'Central Deep Zone', lat: -6.838, lon: 37.608 },
        { name: 'Upstream River Inflow', lat: -6.848, lon: 37.595 },
      ];
      await api.extractWaterPointsCsv(parcel.id, samplePoints);
    } catch (e) {
      alert('Failed to export point values CSV');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Retrieving Sentinel-2 MNDWI water mask & Mindu Reservoir regression parameters...
      </div>
    );
  }

  // Zero-water notification handling
  if (!data?.has_water_detected) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="p-5 rounded-2xl bg-amber-950/50 border border-amber-800 text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Water Body Check: No Significant Water Pixels</h4>
            <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
              {data?.notification || "The selected parcel's MNDWI mask (Green B3 - SWIR B11) returned no open water surfaces (>0). Remote sensing water quality parameter calculation is halted."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getCloggingRiskBadge = (level?: string) => {
    switch (level) {
      case 'SEVERE':
        return { label: 'SEVERE CLOGGING HAZARD', class: 'bg-red-950 text-red-300 border-red-800' };
      case 'MODERATE':
        return { label: 'MODERATE CLOGGING RISK', class: 'bg-amber-950 text-amber-300 border-amber-800' };
      default:
        return { label: 'LOW CLOGGING HAZARD', class: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
    }
  };

  const riskBadge = getCloggingRiskBadge(data.clogging_risk_level);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner & Empirical Regression Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
              Mindu Reservoir Empirical Calibration
            </span>
            <span className="text-xs text-slate-400">Sentinel-2 BOA Reflectance</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            KijaniMaji: Remote Sensing Water Quality & Clogging Diagnostics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitored Surface Area: <span className="text-emerald-400 font-bold">{data.water_surface_area_ha} ha</span> • MNDWI Dynamic Water Mask Verified
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 transition shadow-lg shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{exporting ? 'Extracting Points...' : 'Export Point Values (CSV)'}</span>
        </button>
      </div>

      {/* Parameter Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TSS Card */}
        <button
          onClick={() => setActiveParam('tss')}
          className={`p-4 rounded-xl text-left border transition-all ${
            activeParam === 'tss'
              ? 'bg-slate-800 border-sky-500 ring-2 ring-sky-500/20'
              : 'glass-panel border-slate-700 hover:bg-slate-800/60'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">Total Suspended Solids (TSS)</div>
          <div className="text-2xl font-black text-white mt-1">{data.mean_tss_mg_l.toFixed(1)} mg/L</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">y = 0.8046x + 5.5561</div>
        </button>

        {/* Turbidity Card */}
        <button
          onClick={() => setActiveParam('turbidity')}
          className={`p-4 rounded-xl text-left border transition-all ${
            activeParam === 'turbidity'
              ? 'bg-slate-800 border-sky-500 ring-2 ring-sky-500/20'
              : 'glass-panel border-slate-700 hover:bg-slate-800/60'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">Turbidity</div>
          <div className="text-2xl font-black text-white mt-1">{data.mean_turbidity_ntu.toFixed(1)} NTU</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">y = 0.7214x + 16.255</div>
        </button>

        {/* pH Card */}
        <button
          onClick={() => setActiveParam('ph')}
          className={`p-4 rounded-xl text-left border transition-all ${
            activeParam === 'ph'
              ? 'bg-slate-800 border-sky-500 ring-2 ring-sky-500/20'
              : 'glass-panel border-slate-700 hover:bg-slate-800/60'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">potential of Hydrogen (pH)</div>
          <div className="text-2xl font-black text-white mt-1">{data.mean_ph.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">y = 0.7394x + 2.1609</div>
        </button>

        {/* EC Card */}
        <button
          onClick={() => setActiveParam('ec')}
          className={`p-4 rounded-xl text-left border transition-all ${
            activeParam === 'ec'
              ? 'bg-slate-800 border-sky-500 ring-2 ring-sky-500/20'
              : 'glass-panel border-slate-700 hover:bg-slate-800/60'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium">Electrical Conductivity (EC)</div>
          <div className="text-2xl font-black text-white mt-1">{data.mean_ec_ms_cm.toFixed(3)} mS/cm</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">y = 0.6835x + 0.0587</div>
        </button>
      </div>

      {/* Compliance & Irrigation Clogging Standards Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FAO Drip Clogging Hazards */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              FAO / Ayers & Westcot Irrigation Clogging Assessment
            </h4>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${riskBadge.class}`}>
              {riskBadge.label}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded-lg bg-slate-800/60">
              <span className="text-slate-400">Suspended Solids Risk:</span>
              <span className="font-bold text-white">
                {data.mean_tss_mg_l > 100 ? 'Severe (>100 mg/L)' : (data.mean_tss_mg_l >= 50 ? 'Moderate (50-100 mg/L)' : 'None (<50 mg/L)')}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-800/60">
              <span className="text-slate-400">Alkaline Precipitation Risk (pH):</span>
              <span className="font-bold text-white">
                {data.mean_ph > 8.0 ? 'High Carbonate Precipitate' : (data.mean_ph >= 7.0 ? 'Moderate' : 'Normal')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              • Recommendation: Use 120-mesh disc filtration or hydrocyclone sand separator before discharging into localized drip lines.
            </p>
          </div>
        </div>

        {/* WHO / Tanzania Drinking Standards */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              WHO & Tanzania National Drinking Standards
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              TZS 789 / WHO
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 rounded-lg bg-slate-800/60">
              <span className="text-slate-400">Turbidity Target (&lt;5 NTU):</span>
              <span className={`font-bold ${data.mean_turbidity_ntu < 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {data.mean_turbidity_ntu < 5 ? 'Compliant' : `${data.mean_turbidity_ntu.toFixed(1)} NTU (Requires Coagulation)`}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-800/60">
              <span className="text-slate-400">pH Target (6.5 - 8.5):</span>
              <span className="font-bold text-emerald-400">
                {6.5 <= data.mean_ph && data.mean_ph <= 8.5 ? 'Compliant' : 'Exceeds Range'}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-800/60">
              <span className="text-slate-400">Salinity / EC (&lt;1.5 mS/cm):</span>
              <span className="font-bold text-emerald-400">
                {data.mean_ec_ms_cm < 1.5 ? 'Compliant (Freshwater)' : 'Elevated'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Monthly Timeseries Chart */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">
          Mindu Reservoir Seasonal Sediment & Turbidity Dynamics (12-Month Composite)
        </h3>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="tss_mg_l" name="TSS (mg/L)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="turbidity_ntu" name="Turbidity (NTU)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Flame, ShieldAlert, CheckCircle, ExternalLink } from 'lucide-react';
import { Parcel } from '../../types';
import { api } from '../../api/client';

interface WatchViewProps {
  parcel: Parcel;
}

export const WatchView: React.FC<WatchViewProps> = ({ parcel }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDisturbances();
  }, [parcel.id]);

  const loadDisturbances = async () => {
    setLoading(true);
    try {
      const res = await api.getWatchDisturbances(parcel.id);
      setData(res);
    } catch (e) {
      console.error('Failed to load disturbance alerts', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Running automated change detection & Normalized Burn Ratio (NBR) baseline comparison...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
              Automated Baseline Change Detection
            </span>
            {data?.system_mode === 'PRODUCTION' ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sentinel-2 NBR Delta (Production Mode)
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Calibrated Disturbance Model (Testing Mode)
              </span>
            )}
            <span className="text-xs text-slate-400">Baseline Year: {data?.baseline_year}</span>
          </div>
          <h2 className="text-xl font-black text-slate-50 mt-1">KijaniWatch: Deforestation & Burn Scar Alerts</h2>
        </div>
        <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
          NBR Status: {data?.burn_severity}
        </span>
      </div>

      {/* Net Change Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Canopy Clearing Detected</div>
          <div className="text-3xl font-black text-rose-400 mt-1">{data?.deforestation_ha} <span className="text-sm font-normal text-slate-400">ha</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Historical Baseline Loss</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Canopy Expansion</div>
          <div className="text-3xl font-black text-emerald-400 mt-1">+{data?.canopy_gain_ha} <span className="text-sm font-normal text-slate-400">ha</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Vegetation Regrowth</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Net Balance</div>
          <div className="text-3xl font-black text-cyan-400 mt-1">{data?.net_change_ha > 0 ? `+${data?.net_change_ha}` : data?.net_change_ha} <span className="text-sm font-normal text-slate-400">ha</span></div>
          <div className="text-[11px] text-slate-400 mt-1">{data?.net_loss_gain_pct}% Net Change</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Normalized Burn Ratio (NBR)</div>
          <div className="text-3xl font-black text-amber-400 mt-1">{data?.current_nbr}</div>
          <div className="text-[11px] text-slate-400 mt-1">ΔNBR: {data?.dnbr}</div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-slate-50 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          Active Disturbance & Clearing Alerts
        </h3>

        <div className="divide-y divide-slate-800">
          {(data?.recent_alerts || []).map((alt: any) => (
            <div key={alt.id} className="py-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-50 flex items-center gap-2">
                  <span className="font-mono text-slate-400">{alt.id}</span>
                  <span className="text-amber-300 font-bold">{alt.type}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {alt.severity}
                  </span>
                </div>
                <div className="text-slate-400">
                  Detected: {alt.detected_date} • Affected Area: {alt.area_affected_ha} ha • Coordinates: [{alt.coordinates.join(', ')}]
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
                {alt.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

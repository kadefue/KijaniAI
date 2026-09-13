import React, { useState, useEffect } from 'react';
import { RotateCcw, Sprout, TrendingUp, ShieldCheck } from 'lucide-react';
import { Parcel } from '../../types';
import { api } from '../../api/client';

interface RestoreViewProps {
  parcel: Parcel;
}

export const RestoreView: React.FC<RestoreViewProps> = ({ parcel }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRestore();
  }, [parcel.id]);

  const loadRestore = async () => {
    setLoading(true);
    try {
      const res = await api.getRestoreMetrics(parcel.id);
      setData(res);
    } catch (e) {
      console.error('Failed to load restoration metrics', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Retrieving afforestation survival rates and canopy expansion velocity...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* System Mode / Afforestation Pipeline Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Afforestation Tracking Pipeline:</span>
          <span className="text-[11px] text-slate-400 font-mono">({data?.data_source || 'Multi-temporal Growth Model'})</span>
        </div>
        {data?.system_mode === 'PRODUCTION' ? (
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Sentinel-2 Multi-Temporal Analytics (Production Mode)
          </span>
        ) : (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Calibrated Cohort Growth Simulator (Testing Mode)
          </span>
        )}
      </div>

      {/* KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Cohort Survival Rate</div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{data?.current_survival_rate_pct}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Planted: Year {data?.planting_year}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Canopy Expansion Velocity</div>
          <div className="text-3xl font-black text-cyan-400 mt-1">{data?.canopy_expansion_velocity_m2_yr} <span className="text-sm font-normal text-slate-400">m²/yr</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Growth per Tree</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Natural Regeneration Index</div>
          <div className="text-3xl font-black text-lime-400 mt-1">{data?.natural_regeneration_index}</div>
          <div className="text-[11px] text-slate-400 mt-1">Secondary Stand Emergence</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Stand Age</div>
          <div className="text-3xl font-black text-white mt-1">{data?.stand_age_years} <span className="text-sm font-normal text-slate-400">years</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Active Monitoring Cohort</div>
        </div>
      </div>

      {/* Cohort Growth Progression Stages */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-400" />
          Multi-Year Cohort Canopy Closure & Survival Progression
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {(data?.growth_stages || []).map((stg: any) => (
            <div key={stg.year} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Year {stg.year}</span>
                <span className="text-emerald-400 font-semibold">{stg.survival_pct}% Survival</span>
              </div>
              <div className="text-sm font-extrabold text-slate-200">{stg.stage}</div>
              <div className="text-xs text-slate-400">Canopy Cover: {stg.canopy_cover_pct}%</div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${stg.canopy_cover_pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

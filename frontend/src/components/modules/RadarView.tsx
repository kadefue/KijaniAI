import React, { useState, useEffect } from 'react';
import { Radio, Cloud, ShieldCheck, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Parcel } from '../../types';
import { api } from '../../api/client';

interface RadarViewProps {
  parcel: Parcel;
}

export const RadarView: React.FC<RadarViewProps> = ({ parcel }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadRadar();
  }, [parcel.id]);

  const loadRadar = async () => {
    setLoading(true);
    try {
      const res = await api.getRadarProfile(parcel.id);
      setData(res);
    } catch (e) {
      console.error('Failed to load radar data', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Calibrating Sentinel-1 C-SAR GRD backscatter and applying Lee speckle filtering...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Cloud-Free Status Banner */}
      <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">Sentinel-1 C-Band SAR Active Microwave</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900 text-amber-200">
                100% Cloud Penetration
              </span>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Continuous radar imaging through tropical monsoon cloud cover and nighttime passes.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
          Dual-Pol (VV + VH)
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Dual-Pol RVI</div>
          <div className="text-3xl font-black text-amber-400 mt-1">{data?.sar_rvi}</div>
          <div className="text-[11px] text-slate-400 mt-1">4×VH / (VV + VH)</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">VV Backscatter</div>
          <div className="text-3xl font-black text-white mt-1">{data?.sigma0_vv_mean_db} <span className="text-sm text-slate-400 font-normal">dB</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Vertical Copolarized</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">VH Cross-Polarization</div>
          <div className="text-3xl font-black text-white mt-1">{data?.sigma0_vh_mean_db} <span className="text-sm text-slate-400 font-normal">dB</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Canopy Volume Scattering</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">SAR Surface Soil Moisture</div>
          <div className="text-3xl font-black text-cyan-400 mt-1">{data?.sar_derived_soil_moisture_pct}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Top 5cm Volumetric Moisture</div>
        </div>
      </div>

      {/* SAR Timeseries */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          Uninterrupted SAR Backscatter Trajectory (12-Day Orbit Repeat)
        </h3>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.sar_timeseries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="sigma0_vv_db" name="VV Backscatter (dB)" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="sigma0_vh_db" name="VH Backscatter (dB)" stroke="#38bdf8" strokeWidth={2} />
              <Line type="monotone" dataKey="rvi" name="SAR RVI Index" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Leaf, Calendar, Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Parcel } from '../../types';
import { api } from '../../api/client';

interface HealthViewProps {
  parcel: Parcel;
}

export const HealthView: React.FC<HealthViewProps> = ({ parcel }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHealth();
  }, [parcel.id]);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await api.getVegetationHealth(parcel.id);
      setData(res);
    } catch (e) {
      console.error('Failed to load health metrics', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Extracting multispectral indices (NDVI, EVI, SAVI, NDWI) and Masika/Vuli calendar alignment...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Index Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Mean NDVI</div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{data?.mean_ndvi.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">(NIR - Red) / (NIR + Red)</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Enhanced Veg Index (EVI)</div>
          <div className="text-3xl font-black text-lime-400 mt-1">{data?.mean_evi.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Atmospheric Canopy Resistance</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Soil-Adjusted (SAVI)</div>
          <div className="text-3xl font-black text-teal-400 mt-1">{data?.mean_savi.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">L = 0.5 Background Subtraction</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Water Index (NDWI)</div>
          <div className="text-3xl font-black text-sky-400 mt-1">{data?.mean_ndwi.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Leaf Moisture Content</div>
        </div>
      </div>

      {/* Agro-Climatic Season Banner */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase">Tanzanian Agro-Climatic Calendar</div>
            <div className="text-sm font-extrabold text-white">{data?.current_season}</div>
          </div>
        </div>
        <span className="text-xs font-semibold text-emerald-300 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
          Active Season Window
        </span>
      </div>

      {/* Historical Phenological Curve */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Seasonal Crop Vigor & Moisture Trajectory (Masika vs. Vuli Cycles)
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.historical_timeseries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month_label" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="ndvi" name="NDVI Vigor" stroke="#10b981" strokeWidth={2.5} />
              <Line type="monotone" dataKey="evi" name="EVI" stroke="#a3e635" strokeWidth={1.5} />
              <Line type="monotone" dataKey="ndwi" name="NDWI Moisture" stroke="#38bdf8" strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

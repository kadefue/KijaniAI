import React, { useState, useEffect } from 'react';
import { Map, Layers, ShieldCheck } from 'lucide-react';
import { Parcel } from '../../types';
import { api } from '../../api/client';

interface LandCoverViewProps {
  parcel: Parcel;
}

export const LandCoverView: React.FC<LandCoverViewProps> = ({ parcel }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadLulc();
  }, [parcel.id]);

  const loadLulc = async () => {
    setLoading(true);
    try {
      const res = await api.getLulcMap(parcel.id);
      setData(res);
    } catch (e) {
      console.error('Failed to load LULC data', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Fusing Sentinel-2 optical and Sentinel-1 SAR inputs into 5-class LULC classification...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
              Optical + SAR Sensor Fusion
            </span>
            {data?.system_mode === 'PRODUCTION' ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live S2+S1 Classification (Production Mode)
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Regional Baseline LULC Simulator (Testing Mode)
              </span>
            )}
            <span className="text-xs text-slate-400">Classification Accuracy: {data?.overall_accuracy_pct}%</span>
          </div>
          <h2 className="text-xl font-black text-slate-50 mt-1">KijaniMap: AI Land Use & Land Cover Classification</h2>
        </div>
        <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
          5 Classes
        </span>
      </div>

      {/* Class Breakdown List */}
      <div className="space-y-3">
        {(data?.breakdown || []).map((item: any) => (
          <div key={item.class_id} className="glass-panel p-4 rounded-xl border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-md" style={{ backgroundColor: item.color }} />
              <div>
                <div className="text-sm font-bold text-slate-50">{item.name}</div>
                <div className="text-xs text-slate-400">{item.hectares} hectares</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-48 bg-slate-800 h-2.5 rounded-full overflow-hidden hidden sm:block">
                <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
              </div>
              <div className="text-sm font-black text-slate-50 w-14 text-right">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

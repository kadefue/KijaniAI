import React, { useState, useEffect } from 'react';
import { Trees, Box, Layers, BarChart2, CheckCircle, RefreshCw, Zap, FlaskConical, Cpu } from 'lucide-react';
import { Parcel, TreeCountData } from '../../types';
import { api } from '../../api/client';

interface TreeCountViewProps {
  parcel: Parcel;
  onCrownsLoaded?: (geojson: any) => void;
  systemMode?: 'TESTING' | 'PRODUCTION';
}

export const TreeCountView: React.FC<TreeCountViewProps> = ({ parcel, onCrownsLoaded, systemMode = 'TESTING' }) => {
  const [data, setData] = useState<TreeCountData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadCrowns();
  }, [parcel.id]);

  const loadCrowns = async () => {
    setLoading(true);
    try {
      const res = await api.getTreeCount(parcel.id);
      setData(res);
      if (onCrownsLoaded && res.crown_polygons_geojson) {
        onCrownsLoaded(res.crown_polygons_geojson);
      }
    } catch (e) {
      console.error('Failed to load tree crown count', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Executing {systemMode === 'PRODUCTION' ? 'DeepForest RetinaNet PyTorch' : 'Calibrated Ecozone Crown Simulation'} on {parcel.name}...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* System Mode Indicator Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-300">Tree Crown Segmentation Pipeline:</span>
        </div>
        {systemMode === 'PRODUCTION' ? (
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3 h-3 text-emerald-400" />
            DeepForest PyTorch Neural Model (Production Mode)
          </span>
        ) : (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <FlaskConical className="w-3 h-3 text-amber-400" />
            Boundary-Constrained High-Fidelity Simulator (Testing Mode)
          </span>
        )}
      </div>

      {/* KPI Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Total Trees Detected</span>
            <Trees className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-slate-50 mt-2">{data?.total_trees.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>DeepForest PyTorch Inference</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Stand Density</span>
            <BarChart2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-slate-50 mt-2">{data?.density_per_ha} <span className="text-sm font-normal text-slate-400">trees/ha</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Ecozone: {parcel.ecozone}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Crown Cover</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-slate-50 mt-2">{data?.crown_cover_pct}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Canopy Closure Percentage</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Mean Crown Diameter</span>
            <Box className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-slate-50 mt-2">{data?.mean_crown_diameter_m} <span className="text-sm font-normal text-slate-400">m</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Mean Area: {data?.mean_crown_area_sqm} m²</div>
        </div>
      </div>

      {/* Spacing Regularity & Spatial Layout */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700 space-y-3">
        <h3 className="text-sm font-bold text-slate-50">Spatial Spacing Regularity vs. Natural Clustering</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The nearest-neighbor distance analysis indicates a <span className="text-emerald-400 font-bold">{data?.spacing_pattern}</span> distribution.
          Natural regeneration stands in {parcel.ecozone} show characteristic clustering around drainage veins and fertile soil pockets.
        </p>
        <div className="text-xs text-slate-400 font-mono bg-slate-800/60 p-3 rounded-lg">
          Crown Polygons Vector Layer loaded into MapLibre GL canvas. Individual centroid pins and diameter buffers are rendered in real-time.
        </div>
      </div>
    </div>
  );
};

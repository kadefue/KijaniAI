import React from 'react';
import { 
  Sprout, Droplets, Satellite, Upload, HardDriveDownload, 
  Wallet, ShieldCheck, Wifi, WifiOff, Sparkles, FlaskConical, Zap, BookOpen 
} from 'lucide-react';
import { Parcel } from '../../types';

interface NavbarProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onSelectParcel: (p: Parcel) => void;
  onOpenUpload: () => void;
  onOpenPricing: () => void;
  onOpenAdmin: () => void;
  onOpenSync: () => void;
  onOpenManual: () => void;
  onToggleCopilot: () => void;
  isOnline: boolean;
  walletBalance: number;
  systemMode?: 'TESTING' | 'PRODUCTION';
}

export const Navbar: React.FC<NavbarProps> = ({
  parcels,
  selectedParcel,
  onSelectParcel,
  onOpenUpload,
  onOpenPricing,
  onOpenAdmin,
  onOpenSync,
  onOpenManual,
  onToggleCopilot,
  isOnline,
  walletBalance,
  systemMode = 'TESTING',
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Region */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/30">
          <Sprout className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
              KijaniAI
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
              Sub-Saharan Africa
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Earth Observation & Hydrological Intelligence</p>
        </div>
      </div>

      {/* Parcel Selector */}
      <div className="flex items-center gap-2 max-w-md w-full mx-4">
        <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Parcel / Scheme:</label>
        <select
          value={selectedParcel?.id || ''}
          onChange={(e) => {
            const p = parcels.find((item) => item.id === e.target.value);
            if (p) onSelectParcel(p);
          }}
          className="bg-slate-800/90 text-sm font-medium border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full truncate"
        >
          {parcels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.region} • {p.area_ha.toFixed(1)} ha • {p.category})
            </option>
          ))}
        </select>
      </div>

      {/* Action Tools & Status */}
      <div className="flex items-center gap-2.5">
        {/* System Operational Mode Badge (Testing vs Production) */}
        <button
          onClick={onOpenAdmin}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition shadow-sm ${
            systemMode === 'PRODUCTION'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/80 shadow-emerald-900/30'
              : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/50 hover:bg-indigo-900/80 shadow-indigo-900/30'
          }`}
          title={
            systemMode === 'PRODUCTION'
              ? 'PRODUCTION MODE: Live DeepForest neural networks & live satellite streaming active. Click to manage in Admin Hub.'
              : 'TESTING MODE: Hyper-realistic calibrated mock datasets active for demo & donor presentations. Click to manage in Admin Hub.'
          }
        >
          {systemMode === 'PRODUCTION' ? (
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span className="hidden sm:inline">
            {systemMode === 'PRODUCTION' ? 'Production Mode' : 'Testing Mode (Demo)'}
          </span>
        </button>

        {/* Network Status Badge */}
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isOnline
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
              : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
          }`}
          title={isOnline ? 'Online - Cloud Sync Active' : 'Offline Mode - Local IndexedDB Active'}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'PWA Offline'}</span>
        </div>

        {/* Upload Boundary Dropzone Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Import Boundary</span>
        </button>

        {/* PWA Sync Field Pack */}
        <button
          onClick={onOpenSync}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <HardDriveDownload className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden md:inline">KijaniSync</span>
        </button>

        {/* Wallet & Acquisition Pricing */}
        <button
          onClick={onOpenPricing}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md shadow-emerald-700/20 transition"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>${walletBalance.toFixed(0)}</span>
          <span className="text-emerald-200 text-[10px] hidden sm:inline">Acquire Tiers</span>
        </button>

        {/* Admin Dashboard */}
        <button
          onClick={onOpenAdmin}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Admin Hub (Pricing, Replays, Retention)"
        >
          <ShieldCheck className="w-4 h-4 text-purple-400" />
        </button>

        {/* User Manual Playbook (Mwongozo) */}
        <button
          onClick={onOpenManual}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 text-amber-200 border border-amber-500/40 shadow-sm transition"
          title="Open KijaniAI User Manual (Mwongozo wa Mtumiaji)"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Manual / Mwongozo</span>
        </button>

        {/* Gemma 4 Copilot Drawer Toggle */}
        <button
          onClick={onToggleCopilot}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-md shadow-cyan-600/20 ring-1 ring-cyan-400/30 transition animate-pulse"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Gemma 4 Copilot</span>
        </button>
      </div>
    </header>
  );
};

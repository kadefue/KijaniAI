import React from 'react';
import {
  Droplets, Waves, Trees, Leaf, Radio, Award, AlertTriangle,
  RotateCcw, Map, Smartphone, History, Settings as SettingsIcon
} from 'lucide-react';

export type ModuleTab =
  | 'irrigation'
  | 'water'
  | 'count'
  | 'health'
  | 'radar'
  | 'carbon'
  | 'watch'
  | 'restore'
  | 'map'
  | 'mabadiliko'
  | 'sync'
  | 'settings';

interface SidebarProps {
  activeTab: ModuleTab;
  onSelectTab: (tab: ModuleTab) => void;
  parcelCategory?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, parcelCategory }) => {
  const tabs: { id: ModuleTab; label: string; name: string; icon: any; color: string; badge?: string }[] = [
    {
      id: 'irrigation',
      name: 'KijaniIrrigation',
      label: 'Hydrological Scheduling',
      icon: Droplets,
      color: 'text-cyan-400',
      badge: 'FAO-56'
    },
    {
      id: 'water',
      name: 'KijaniMaji',
      label: 'Reservoir Water Quality',
      icon: Waves,
      color: 'text-sky-400',
      badge: 'Mindu'
    },
    {
      id: 'count',
      name: 'KijaniCount',
      label: 'Tree Crown Segmentation',
      icon: Trees,
      color: 'text-emerald-400',
      badge: 'DeepForest'
    },
    {
      id: 'health',
      name: 'KijaniHealth',
      label: 'Multispectral Vigor & Calendars',
      icon: Leaf,
      color: 'text-lime-400',
      badge: 'Masika/Vuli'
    },
    {
      id: 'radar',
      name: 'KijaniRadar',
      label: 'All-Weather Sentinel-1 SAR',
      icon: Radio,
      color: 'text-amber-400',
      badge: 'Cloud-Free'
    },
    {
      id: 'carbon',
      name: 'KijaniCarbon',
      label: 'Ecozone Biomass & MRV',
      icon: Award,
      color: 'text-teal-300',
      badge: 'Verra'
    },
    {
      id: 'watch',
      name: 'KijaniWatch',
      label: 'Disturbance & Fire Alerts',
      icon: AlertTriangle,
      color: 'text-red-400',
      badge: 'NBR'
    },
    {
      id: 'restore',
      name: 'KijaniRestore',
      label: 'Regeneration & Cohorts',
      icon: RotateCcw,
      color: 'text-green-400'
    },
    {
      id: 'map',
      name: 'KijaniMap',
      label: '5-Class Fused LULC',
      icon: Map,
      color: 'text-purple-400'
    },
    {
      id: 'mabadiliko',
      name: 'MabadilikoAI',
      label: 'Decadal Change Dynamics',
      icon: History,
      color: 'text-violet-400',
      badge: '1-10 Yrs'
    },
    {
      id: 'sync',
      name: 'KijaniSync',
      label: 'Offline Edge Vision PWA',
      icon: Smartphone,
      color: 'text-blue-400',
      badge: 'ONNX'
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col shrink-0 h-full">
      <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
        Analytical Engines
      </div>
      <nav className="flex-1 px-2 space-y-1 pb-4 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-slate-800/90 text-white shadow-md border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-slate-700/80 shadow-inner' : 'bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                    {tab.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{tab.label}</div>
                </div>
              </div>
              {tab.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                    isActive
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings - pinned below the analytical engines, not a data module */}
      <div className="p-2 border-t border-slate-800 shrink-0">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${
            activeTab === 'settings'
              ? 'bg-slate-800/90 text-white shadow-md border border-slate-700/80'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              activeTab === 'settings' ? 'bg-slate-700/80 shadow-inner' : 'bg-slate-800/40'
            }`}
          >
            <SettingsIcon className="w-4 h-4 text-slate-300" />
          </div>
          <span className="text-xs font-bold">Settings</span>
        </button>
      </div>
    </aside>
  );
};

import React from 'react';
import { Sun, Moon, Monitor, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          <SettingsIcon className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-50">Settings</h3>
          <p className="text-xs text-slate-400">Personal preferences for this device / browser</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Appearance</h4>
        <p className="text-xs text-slate-400">
          Choose how KijaniAI looks on this device. Your choice is saved locally and applied every time you open the app.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
              theme === 'dark'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-900/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Moon className="w-6 h-6" />
            <span className="text-sm font-bold">Dark</span>
            <span className={`text-[11px] ${theme === 'dark' ? 'text-indigo-200' : 'text-slate-500'}`}>
              Default KijaniAI look
            </span>
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
              theme === 'light'
                ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-900/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Sun className="w-6 h-6" />
            <span className="text-sm font-bold">Light</span>
            <span className={`text-[11px] ${theme === 'light' ? 'text-amber-100' : 'text-slate-500'}`}>
              Bright, high-contrast surfaces
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
          <Monitor className="w-3.5 h-3.5 shrink-0" />
          <span>The theme also applies to the map controls, modals, and the User Manual.</span>
        </div>
      </div>
    </div>
  );
};

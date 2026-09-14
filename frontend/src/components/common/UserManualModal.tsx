import React, { useState } from 'react';
import {
  X, BookOpen, Search, Sprout, ShieldCheck, TreePine, Droplets,
  Smartphone, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  Download, Layers, Compass, HelpCircle, ExternalLink, Globe, Cpu, CloudRain,
  History, Mail
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpload?: () => void;
  onOpenAdmin?: () => void;
  onOpenSync?: () => void;
  onToggleCopilot?: () => void;
}

type RoleTab = 'farmer' | 'admin' | 'carbon' | 'water' | 'ranger' | 'mabadiliko' | 'swahili';

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onOpenUpload,
  onOpenAdmin,
  onOpenSync,
  onToggleCopilot
}) => {
  const [activeRole, setActiveRole] = useState<RoleTab>('farmer');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const roles = [
    {
      id: 'farmer' as RoleTab,
      label: 'Farmers & Scheme Managers',
      swahili: 'Wakulima & Mameneja wa Umwagiliaji',
      icon: Sprout,
      color: 'from-emerald-500 to-green-700',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      desc: 'Irrigation scheduling, 72h rain gating, soil presets, and decadal CWRI yield risk'
    },
    {
      id: 'admin' as RoleTab,
      label: 'System Administrators',
      swahili: 'Wasimamizi wa Mfumo',
      icon: ShieldCheck,
      color: 'from-indigo-500 to-purple-700',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
      desc: 'Testing vs Production modes, satellite API keys (GEE, Planet, UP42), and session replays'
    },
    {
      id: 'carbon' as RoleTab,
      label: 'Carbon & MRV Auditors',
      swahili: 'Wasanidi Hewa ya Ukaa & Ukaguzi',
      icon: TreePine,
      color: 'from-amber-500 to-orange-700',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      desc: 'Verra VM0042 MRV generation, DeepForest tree counts, and cryptographic QR audit PDF dossiers'
    },
    {
      id: 'water' as RoleTab,
      label: 'Hydrologists & Dam Operators',
      swahili: 'Wahandisi wa Maji & Malambo',
      icon: Droplets,
      color: 'from-cyan-500 to-blue-700',
      badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
      desc: 'Mindu Reservoir empirical regressions (TSS, Turbidity, pH, EC) & FAO drip clogging risk'
    },
    {
      id: 'ranger' as RoleTab,
      label: 'Field Rangers & Extension',
      swahili: 'Maafisa Ugani & Walinzi wa Misitu',
      icon: Smartphone,
      color: 'from-teal-500 to-emerald-700',
      badgeBg: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
      desc: 'KijaniSync offline PWA pack, on-device smartphone camera AI for DBH & tree species'
    },
    {
      id: 'mabadiliko' as RoleTab,
      label: 'MabadilikoAI & Notifications',
      swahili: 'Mabadiliko ya Ardhi & Taarifa za Barua Pepe',
      icon: History,
      color: 'from-violet-500 to-purple-700',
      badgeBg: 'bg-violet-950/80 text-violet-300 border-violet-500/40',
      desc: 'Decadal (1-10 year) land cover change dynamics, bilingual AI narratives, and background email alerts'
    },
    {
      id: 'swahili' as RoleTab,
      label: 'Mwongozo wa Kiswahili',
      swahili: 'Masika, Vuli, Umwagiliaji & Istilahi',
      icon: Globe,
      color: 'from-rose-500 to-pink-700',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
      desc: 'Muhtasari kamili kwa lugha ya Kiswahili Sanifu na mifano ya maswali ya Gemma 4'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20 ring-2 ring-teal-400/30">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-50 tracking-tight">
                  KijaniAI User Manual & Playbook
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Interactive Guide
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Operational workflows for farmers, system admins, carbon auditors, hydrologists, and field rangers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Tab Switcher */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {roles.map((role) => {
            const Icon = role.icon;
            const isActive = activeRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border shrink-0 ${isActive
                    ? `bg-gradient-to-r ${role.color} text-white border-white/20 shadow-md`
                    : 'bg-slate-800/70 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{role.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Quick Action Bar */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/50 flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search instructions, formulas, or features..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 hidden md:inline">Quick Actions:</span>
            {onOpenUpload && (
              <button
                onClick={() => { onClose(); onOpenUpload(); }}
                className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900 transition font-semibold flex items-center gap-1"
              >
                <Sprout className="w-3 h-3" /> Import Boundary
              </button>
            )}
            {onToggleCopilot && (
              <button
                onClick={() => { onClose(); onToggleCopilot(); }}
                className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-900 transition font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Ask Copilot
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-200">
          {/* TAB 1: FARMERS & SCHEME MANAGERS */}
          {activeRole === 'farmer' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-gray-900 to-teal-950/60 border border-emerald-700/40">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-1">
                  <Sprout className="w-4 h-4" />
                  <span>Agronomic Water Intelligence & Scheduling (FAO-56 Penman-Monteith)</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  KijaniAI transforms raw satellite NDVI and micro-meteorological variables into actionable daily irrigation pumping hours, protecting crops against water stress while saving diesel fuel, electricity, and pumping wear.
                </p>
              </div>

              {/* Step by Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="text-sm font-bold text-slate-50">Import Your Boundary</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Upload a Shapefile (<code className="text-emerald-400">.zip</code>), KMZ, or CSV of your farm. Alternatively, use the <strong>1-Click Tanzania 2022 Census Ward selector</strong> (e.g. Mlandizi, Kidatu, Mazimbu) to auto-load official geometries.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="text-sm font-bold text-slate-50">Configure Soil & Irrigation</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select your soil type preset (Sandy Clay Loam, Clay Mbuga, Loam) or enter custom hydraulic properties. Set your irrigation system efficiency (Drip 90%, Sprinkler 75%, Pivot 82%, Furrow 55%).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="text-sm font-bold text-slate-50">Check Pumping Schedule</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Read the exact <strong>Gross Irrigation Requirement (GIR)</strong>, required water volume (<code className="text-cyan-400">m³</code>), and pump runtime duration. Always verify the 72h forecast alert before starting pumps!
                  </p>
                </div>
              </div>

              {/* Key Features & Calculations */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Core Engine Behaviors</h4>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                  <div className="flex items-start gap-3">
                    <CloudRain className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-amber-300">72-Hour Forecast Gating Logic</h5>
                      <p className="text-xs text-slate-300 mt-1">
                        If OpenWeatherMap precipitation forecast indicates rain $\ge$ Net Irrigation Requirement within 72 hours, KijaniAI displays an orange warning banner and advises postponing irrigation. This conserves fuel and prevents soil nitrogen leaching.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pt-3 border-t border-slate-700/40">
                    <Layers className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-emerald-300">Decadal Crop Water Requirements Index (CWRI)</h5>
                      <p className="text-xs text-slate-300 mt-1">
                        Calculated every 10 days (dekad): CWRI = (Sum ETa / Sum ETc) * 100. Scores above 90% indicate optimal growth; scores below 50% trigger a crop failure risk alert, predicting harvest yield penalties (Ky).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM ADMINISTRATORS */}
          {activeRole === 'admin' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-gray-900 to-purple-950/60 border border-indigo-700/40">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Platform Operations, Operational Modes & Commercial Satellite APIs</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Manage platform-wide settings including Testing vs Production mode switches, free-tier GEE reductions, commercial Planet/UP42 API keys, $/ha pricing configurations, and behavioral session replays.
                </p>
              </div>

              {/* Mode Comparison Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300">
                      Testing Mode (Demo)
                    </span>
                    <span className="text-xs text-slate-400">Recommended for Demos</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-50">High-Fidelity Simulated Models</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses calibrated ecozone simulators to generate realistic tree crown bounding boxes, water index regressions, and satellite catalogs. Does not require GPU infrastructure or consume commercial API credits.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300">
                      Production Mode (Live)
                    </span>
                    <span className="text-xs text-slate-400">Operational Real AI</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-50">Live DeepForest & STAC Orders</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Loads operational PyTorch RetinaNet weights for sub-meter tree crown segmentation. Dispatches live queries to Google Earth Engine, Planet Orders v2, and UP42 STAC catalogs.
                  </p>
                </div>
              </div>

              {/* Step by Step Admin Checklist */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Admin Operational Runbook</h4>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>1. Configure Free-Tier Engine:</strong> In Admin Hub, choose GEE, MS Planetary Computer, or CDSE. Click <em>Test Connection</em> to confirm latency and status.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>2. Add Commercial API Keys:</strong> Enter PlanetScope API key or UP42 Project ID. Keys are encrypted at rest and masked in UI.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>3. Sync Official Tanzania Boundaries:</strong> Execute shapefile sync to ensure all 2022 Census wards are indexed in the PostGIS database table <code className="text-indigo-400">tanzania_wards</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>4. Review UX Drop-offs:</strong> Use the embedded <code className="text-indigo-400">rrweb-player</code> to watch user sessions that abandoned checkout, and approve Gemma 4 win-back emails.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: CARBON & MRV AUDITORS */}
          {activeRole === 'carbon' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 via-gray-900 to-orange-950/60 border border-amber-700/40">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                  <TreePine className="w-4 h-4" />
                  <span>Verra VM0042 & Plan Vivo Automated Carbon MRV Engine</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Converts sub-meter satellite tree crown segmentation directly into stand-level Above-Ground Biomass (AGB), applies regional East African allometric models, withholds a 15% non-permanence risk buffer, and issues cryptographically signed PDF audit dossiers.
                </p>
              </div>

              {/* Allometrics Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <h5 className="text-xs font-bold text-amber-400">Miombo Woodlands (Root-to-Shoot R = 0.42)</h5>
                  <p className="text-[11px] font-mono text-slate-300 mt-1">AGB_i = 0.095 * (CD_i)^2.45</p>
                  <p className="text-[11px] text-slate-400 mt-1">Calibrated for Morogoro, Pwani, and Tabora woodland ecosystems.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <h5 className="text-xs font-bold text-amber-400">Eastern Arc Montane (Root-to-Shoot R = 0.24)</h5>
                  <p className="text-[11px] font-mono text-slate-300 mt-1">ln(AGB_i) = -2.187 + 0.916 * ln(rho * CD^2 * H)</p>
                  <p className="text-[11px] text-slate-400 mt-1">Usambara &amp; Uluguru high-density biomass cloud forests.</p>
                </div>
              </div>

              {/* Cryptographic Verification Step */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Cryptographic Verification & Tamper-Proof QR</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every generated MRV PDF dossier contains SHA-256 spatial boundary hashes, raster hashes, and a QR code linking to:
                  <br />
                  <code className="text-amber-300 text-[11px]">https://kijani.ai/verify/[token]</code>
                  <br />
                  Auditors can scan the QR code with any mobile device to view real-time verification status, confirming net tradable credits without danger of double-counting.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: WATER MANAGERS & HYDROLOGISTS */}
          {activeRole === 'water' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-gray-900 to-blue-950/60 border border-cyan-700/40">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm mb-1">
                  <Droplets className="w-4 h-4" />
                  <span>KijaniMaji: Remote Sensing Water Quality Calibrated for Tanzanian Reservoirs</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Calibrated against validated empirical regression models from Mindu Reservoir in Morogoro, Tanzania. Uses dynamic MNDWI water masking to eliminate land noise and measures TSS, Turbidity, pH, and Electrical Conductivity.
                </p>
              </div>

              {/* Empirical Models Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300 border border-slate-700 rounded-xl overflow-hidden">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Parameter</th>
                      <th className="p-2.5">Empirical Formula</th>
                      <th className="p-2.5">Model Fit</th>
                      <th className="p-2.5">FAO Irrigation Hazard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-300">TSS (mg/L)</td>
                      <td className="p-2.5 font-mono">0.8046x + 5.5561</td>
                      <td className="p-2.5">R² = 0.8046, RMSE = 2.25</td>
                      <td className="p-2.5">&gt;100 mg/L: Severe Drip Clogging Risk</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-300">Turbidity (NTU)</td>
                      <td className="p-2.5 font-mono">0.7214x + 16.255</td>
                      <td className="p-2.5">R² = 0.7214, RMSE = 2.04</td>
                      <td className="p-2.5">&gt;50 NTU: Sedimentation basin needed</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-300">pH</td>
                      <td className="p-2.5 font-mono">0.7394x + 2.1609</td>
                      <td className="p-2.5">R² = 0.7394, RMSE = 0.086</td>
                      <td className="p-2.5">&gt;8.0: Alkaline scale precipitation</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-300">EC (mS/cm)</td>
                      <td className="p-2.5 font-mono">0.6835x + 0.0587</td>
                      <td className="p-2.5">R² = 0.6838, RMSE = 0.00068</td>
                      <td className="p-2.5">&gt;1.5 mS/cm: Salinity leaching required</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 1-Click Extraction */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-50">Export Georeferenced Point Dataset</h4>
                  <p className="text-xs text-slate-400">Download geocoded point CSV with exact GPS coordinates and computed values across the reservoir.</p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  CSV Export Ready
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: FIELD RANGERS & EXTENSION */}
          {activeRole === 'ranger' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/60 via-gray-900 to-emerald-950/60 border border-teal-700/40">
                <div className="flex items-center gap-2 text-teal-300 font-bold text-sm mb-1">
                  <Smartphone className="w-4 h-4" />
                  <span>KijaniSync: Offline-First Ground Truthing & On-Device Edge Camera AI</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Operate in remote Tanzanian forest reserves, river catchments, and off-grid farms with zero cellular connection. Data is stored securely in IndexedDB and synchronized upon return to coverage.
                </p>
              </div>

              {/* Workflow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <h5 className="text-sm font-bold text-teal-300">1. Download Field Pack</h5>
                  <p className="text-xs text-slate-400">Before leaving for the field, download the offline bundle (boundaries, tiles, soil info) onto your mobile phone or tablet.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <h5 className="text-sm font-bold text-teal-300">2. On-Device Edge AI</h5>
                  <p className="text-xs text-slate-400">Use your smartphone camera to measure trunk Diameter at Breast Height (DBH) and identify tree species in real-time on edge.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <h5 className="text-sm font-bold text-teal-300">3. Sync to Cloud</h5>
                  <p className="text-xs text-slate-400">When reaching cellular network or Wi-Fi, click sync to upload all ground observations and calibrate satellite indices.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MABADILIKOAI & EMAIL NOTIFICATIONS */}
          {activeRole === 'mabadiliko' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-950/60 via-gray-900 to-purple-950/60 border border-violet-700/40">
                <div className="flex items-center gap-2 text-violet-300 font-bold text-sm mb-1">
                  <History className="w-4 h-4" />
                  <span>MabadilikoAI: Multi-Temporal Land Cover Change Dynamics</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Answers "what changed, and why?" for any parcel or custom boundary over a historical window of up to 10 years, sampled monthly through annually, with a bilingual AI-generated narrative explaining the likely drivers.
                </p>
              </div>

              {/* Instant vs Background Job */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-900 text-violet-300">Instant Mode</span>
                  <h4 className="text-sm font-bold text-slate-50">Fast Results for Registered Parcels</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select a parcel or draw a custom boundary in the MabadilikoAI tab, pick your time horizon and interval, and click <strong>Run Analysis</strong>. Results return in seconds — ideal for quick checks.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-900 text-purple-300">Background Job Mode</span>
                  <h4 className="text-sm font-bold text-slate-50">For Large Boundaries or Long Horizons</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submit as a background job (e.g. for an entire district or forest reserve). Optionally enter an email address — you can close the tab and the platform emails you the moment it finishes.
                  </p>
                </div>
              </div>

              {/* Email Notifications Callout */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Automated Email Notifications</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Background Celery workers automatically send a branded HTML email the moment a long-running task finishes — you never need to keep a browser tab open waiting:
                </p>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Imagery order completes</strong> — tree count, carbon & water metrics — emailed to your account address.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>MRV certificate is generated</strong> — certificate number, net tradable tCO₂e, and verification link — emailed to your account address.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>MabadilikoAI background job completes</strong> — bilingual net change summary and AI narrative — emailed to the address you supplied at submission.</span>
                  </li>
                </ul>
                <p className="text-[11px] text-slate-500">
                  Delivery runs asynchronously and never delays the underlying result — if an email fails to send, your order, certificate, or job still completes normally.
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: SWAHILI GUIDE */}
          {activeRole === 'swahili' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 via-gray-900 to-pink-950/60 border border-rose-700/40">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm mb-1">
                  <Globe className="w-4 h-4" />
                  <span>Mwongozo wa Kiswahili Sanifu (KijaniAI kwa Lugha ya Taifa)</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  KijaniAI inatoa huduma kamili kwa Kiswahili kupitia msaidizi wa akili mnemba (Gemma 4 Copilot) pamoja na mfumo wa taarifa za kilimo, umwagiliaji, na hewa ya ukaa.
                </p>
              </div>

              {/* Swahili Terms Dictionary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="font-bold text-rose-400">Masika & Vuli</span>
                  <p className="text-slate-300">Msimu mrefu wa mvua (Machi–Mei) na msimu mfupi wa mvua (Oktoba–Desemba). KijaniAI hurekebisha ratiba za umwagiliaji kulingana na misimu hii.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="font-bold text-rose-400">Umwagiliaji wa Matone & Mnyunyizo</span>
                  <p className="text-slate-300">Mfumo hupiga hesabu ya saa ngapi pampu inatakiwa kufanya kazi ili kuzuia upotevu wa maji na mafuta ya dizeli au umeme.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="font-bold text-rose-400">Hewa ya Ukaa (Carbon Credits)</span>
                  <p className="text-slate-300">Upimaji wa uzito wa miti na kiasi cha hewa chafu inayofyonzwa, ukitoa vyeti vya kimataifa vya Verra VM0042.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="font-bold text-rose-400">Maji ya Lambo (Mindu Reservoir)</span>
                  <p className="text-slate-300">Upimaji wa ubora wa maji ili kuhakikisha hayatatoboa au kuziba mifereji na ncha za umwagiliaji.</p>
                </div>
              </div>

              {/* Sample Prompts in Swahili */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
                <h5 className="text-xs font-bold text-slate-50 uppercase tracking-wider">Mifano ya Maswali ya Kumuuliza Gemma 4 Copilot:</h5>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li><em>"Je, ninaweza kuanza kumwagilia mahindi leo Mlandizi au mvua inatarajiwa?"</em></li>
                  <li><em>"Mbona kiwango cha unyevu kwenye udongo kimeshuka sana wiki hii?"</em></li>
                  <li><em>"Maji ya Lambo la Mindu yanafaa kwa mfumo wa matone leo au yataziba nozeli?"</em></li>
                  <li><em>"Hifadhi yetu ya Msitu wa Usambara imeingiza tani ngapi za hewa ya ukaa?"</em></li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>KijaniAI Enterprise Engine • Powered by OpenStreetMap, NBS Sensa 2022 & Gemma 4</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition border border-slate-700"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};

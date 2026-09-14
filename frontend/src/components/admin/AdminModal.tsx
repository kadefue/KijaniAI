import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, DollarSign, Play, Mail, CheckCircle, X, 
  RefreshCw, Send, AlertTriangle, Eye, EyeOff, Clock,
  Radio, Key, Globe, CheckCircle2, XCircle, ExternalLink, Cpu, Lock,
  CloudRain, Sparkles, Layers, Sliders, Check, FlaskConical, Zap
} from 'lucide-react';
import rrwebPlayer from 'rrweb-player';
import { api } from '../../api/client';
import { PricingTier, UserSessionRecord, RetentionCampaign, FreeTierSettings, SystemModeStatus } from '../../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSystemModeChange?: (newMode: 'TESTING' | 'PRODUCTION') => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, onSystemModeChange }) => {
  const [activeTab, setActiveTab] = useState<'pricing' | 'sessions' | 'retention' | 'satellite_apis'>('satellite_apis');
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [campaigns, setCampaigns] = useState<RetentionCampaign[]>([]);
  const [satelliteConfigs, setSatelliteConfigs] = useState<any[]>([]);
  const [configForms, setConfigForms] = useState<Record<string, {
    apiKey: string;
    secondarySecret: string;
    endpoint: string;
    secondaryEndpoint: string;
    showKey: boolean;
    showSecret: boolean;
  }>>({});
  const [testingTier, setTestingTier] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, {
    success: boolean;
    message: string;
    latency_ms?: number;
    tested_endpoint?: string;
  }>>({});
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // System Mode (Testing Mode vs Production Mode)
  const [systemModeStatus, setSystemModeStatus] = useState<SystemModeStatus | null>(null);
  const [switchingMode, setSwitchingMode] = useState<boolean>(false);

  // Free-Tier Service Selection & Climate Engines (GEE, CHIRPS, OpenWeatherMap)
  const [freeTierSettings, setFreeTierSettings] = useState<FreeTierSettings | null>(null);
  const [activeFreeProvider, setActiveFreeProvider] = useState<string>('GEE');
  const [geeProjectId, setGeeProjectId] = useState<string>('');
  const [geeServiceAccount, setGeeServiceAccount] = useState<string>('');
  const [geePrivateKeyJson, setGeePrivateKeyJson] = useState<string>('');
  const [openWeatherMapKey, setOpenWeatherMapKey] = useState<string>('');
  const [savingFreeTier, setSavingFreeTier] = useState<boolean>(false);
  const [freeTierMsg, setFreeTierMsg] = useState<string | null>(null);
  const [testingFreeEngine, setTestingFreeEngine] = useState<string | null>(null);
  const [freeEngineTestResult, setFreeEngineTestResult] = useState<any | null>(null);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadAdminData();
    }
  }, [isOpen, activeTab]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Always fetch current system mode status
      api.getSystemMode().then(setSystemModeStatus).catch(() => null);

      if (activeTab === 'pricing') {
        const res = await api.getPricingTiers();
        setTiers(res);
      } else if (activeTab === 'sessions') {
        const res = await api.listAdminSessions();
        setSessions(res);
      } else if (activeTab === 'retention') {
        const res = await api.listRetentionCampaigns();
        setCampaigns(res);
      } else if (activeTab === 'satellite_apis') {
        const [res, freeRes] = await Promise.all([
          api.getSatelliteApiConfigs(),
          api.getFreeTierSettings().catch(() => null),
        ]);
        setSatelliteConfigs(res);
        if (freeRes) {
          setFreeTierSettings(freeRes);
          setActiveFreeProvider(freeRes.active_provider || 'GEE');
          setGeeProjectId(freeRes.gee_project_id || '');
          setGeeServiceAccount(freeRes.gee_service_account_masked || '');
          setOpenWeatherMapKey(freeRes.openweathermap_api_key_masked || '');
        }
        // Initialize form buffers
        const forms: Record<string, any> = {};
        res.forEach((cfg: any) => {
          forms[cfg.id] = {
            apiKey: '',
            secondarySecret: '',
            endpoint: cfg.api_endpoint || '',
            secondaryEndpoint: cfg.secondary_endpoint || '',
            showKey: false,
            showSecret: false,
          };
        });
        setConfigForms(forms);
      }
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSystemMode = async (targetMode: 'TESTING' | 'PRODUCTION') => {
    setSwitchingMode(true);
    try {
      const updated = await api.updateSystemMode(targetMode);
      setSystemModeStatus(updated);
      if (onSystemModeChange) {
        onSystemModeChange(updated.system_mode);
      }
      setStatusMsg(`Platform environment switched to ${updated.system_mode} mode successfully!`);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to switch system operational mode');
    } finally {
      setSwitchingMode(false);
    }
  };

  const handleSwitchFreeProvider = async (provider: 'GEE' | 'PLANETARY_COMPUTER' | 'CDSE') => {
    setActiveFreeProvider(provider);
    await handleSaveFreeTierSettings(provider);
  };

  const handleSaveFreeTierSettings = async (overrideProvider?: string) => {
    const prov = overrideProvider || activeFreeProvider;
    setSavingFreeTier(true);
    try {
      const payload: any = {
        active_provider: prov,
      };
      if (geeProjectId && geeProjectId.trim()) {
        payload.gee_project_id = geeProjectId.trim();
      }
      if (geeServiceAccount && geeServiceAccount.trim() && !geeServiceAccount.includes('...')) {
        payload.gee_service_account = geeServiceAccount.trim();
      }
      if (geePrivateKeyJson && geePrivateKeyJson.trim()) {
        payload.gee_private_key_json = geePrivateKeyJson.trim();
      }
      if (openWeatherMapKey && openWeatherMapKey.trim() && !openWeatherMapKey.includes('...')) {
        payload.openweathermap_api_key = openWeatherMapKey.trim();
      }

      const updated = await api.updateFreeTierSettings(payload);
      setFreeTierSettings(updated);
      setActiveFreeProvider(updated.active_provider);
      setFreeTierMsg(`Free-Tier service updated: ${updated.active_provider} is now active!`);
      setTimeout(() => setFreeTierMsg(null), 3500);
    } catch (e: any) {
      alert(e.message || 'Error updating Free-Tier settings');
    } finally {
      setSavingFreeTier(false);
    }
  };

  const handleTestFreeEngine = async (engineName: 'GEE' | 'OPENWEATHERMAP') => {
    setTestingFreeEngine(engineName);
    setFreeEngineTestResult(null);
    try {
      if (engineName === 'GEE') {
        const res = await api.testSatelliteApiConnection({
          tier_id: 'tier_1',
          api_key: geeProjectId || undefined,
          secondary_secret: geeServiceAccount || undefined,
          custom_endpoint: 'gee',
        });
        setFreeEngineTestResult({ engine: 'GEE', ...res });
      } else {
        const res = await api.testSatelliteApiConnection({
          tier_id: 'weather',
          api_key: openWeatherMapKey || undefined,
        });
        setFreeEngineTestResult({ engine: 'OPENWEATHERMAP', ...res });
      }
    } catch (e: any) {
      setFreeEngineTestResult({
        engine: engineName,
        success: false,
        message: e.message || 'Probe connection failed',
      });
    } finally {
      setTestingFreeEngine(null);
    }
  };

  const handleSaveSatelliteConfig = async (tierId: string) => {
    const form = configForms[tierId];
    if (!form) return;
    setSavingTier(tierId);
    try {
      const payload: any = {
        tier_id: tierId,
        api_endpoint: form.endpoint,
        secondary_endpoint: form.secondaryEndpoint,
      };
      if (form.apiKey && form.apiKey.trim()) {
        payload.api_key = form.apiKey.trim();
      }
      if (form.secondarySecret && form.secondarySecret.trim()) {
        payload.secondary_secret = form.secondarySecret.trim();
      }
      await api.saveSatelliteApiConfig(payload);
      setStatusMsg(`Successfully saved credentials and endpoints for ${tierId.toUpperCase()}`);
      setTimeout(() => setStatusMsg(null), 3500);
      // Reload configs to refresh masked values
      const res = await api.getSatelliteApiConfigs();
      setSatelliteConfigs(res);
      // Clear raw input fields
      setConfigForms((prev) => ({
        ...prev,
        [tierId]: {
          ...prev[tierId],
          apiKey: '',
          secondarySecret: '',
          showKey: false,
          showSecret: false,
        },
      }));
    } catch (e: any) {
      alert(`Failed to save configuration: ${e.message || e}`);
    } finally {
      setSavingTier(null);
    }
  };

  const handleTestSatelliteConnection = async (tierId: string) => {
    const form = configForms[tierId];
    setTestingTier(tierId);
    try {
      const payload: any = {
        tier_id: tierId,
        custom_endpoint: form?.endpoint,
      };
      if (form?.apiKey && form.apiKey.trim()) {
        payload.api_key = form.apiKey.trim();
      }
      if (form?.secondarySecret && form.secondarySecret.trim()) {
        payload.secondary_secret = form.secondarySecret.trim();
      }
      const res = await api.testSatelliteApiConnection(payload);
      setTestResults((prev) => ({
        ...prev,
        [tierId]: {
          success: res.success,
          message: res.message,
          latency_ms: res.latency_ms,
          tested_endpoint: res.tested_endpoint,
        },
      }));
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [tierId]: {
          success: false,
          message: e.message || 'Connection test failed',
        },
      }));
    } finally {
      setTestingTier(null);
    }
  };

  const handleUpdateTier = async (tier: PricingTier, field: string, value: any) => {
    try {
      await api.updatePricingTier(tier.id, { [field]: value });
      setStatusMsg(`Updated ${tier.name} ${field} to ${value}`);
      setTimeout(() => setStatusMsg(null), 3000);
      loadAdminData();
    } catch (e) {
      alert('Failed to update pricing tier');
    }
  };

  const handlePlayReplay = async (sessId: string) => {
    setSelectedSessionId(sessId);
    try {
      const res = await api.getSessionReplay(sessId);
      if (playerContainerRef.current && res.events && res.events.length > 0) {
        playerContainerRef.current.innerHTML = '';
        playerInstanceRef.current = new rrwebPlayer({
          target: playerContainerRef.current,
          props: {
            events: res.events,
            width: 600,
            height: 380,
            autoPlay: true,
          },
        });
      }
    } catch (e) {
      alert('Could not initialize session replay');
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const res = await api.sendRetentionCampaign(campaignId);
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(null), 4000);
      loadAdminData();
    } catch (e) {
      alert('Failed to send retention campaign');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-panel w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/95 p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-base font-extrabold text-slate-50">Platform Administration Hub</h3>
              <p className="text-xs text-slate-400">Environment controls, satellite provider APIs, dynamic pricing & campaigns</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-50 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Operational Mode Switcher (Testing Mode vs Production Mode) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              systemModeStatus?.system_mode === 'PRODUCTION'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {systemModeStatus?.system_mode === 'PRODUCTION' ? (
                <Zap className="w-5 h-5" />
              ) : (
                <FlaskConical className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">System Environment:</span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                  systemModeStatus?.system_mode === 'PRODUCTION'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {systemModeStatus?.system_mode === 'PRODUCTION' ? 'PRODUCTION MODE' : 'TESTING MODE (DEMO)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {systemModeStatus?.system_mode === 'PRODUCTION'
                  ? 'Real DeepForest PyTorch neural models, live GEE reductions, real STAC downloads.'
                  : 'High-fidelity boundary-constrained simulated datasets for donor/investor demos without satellite quotas.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end shrink-0">
            <button
              onClick={() => handleToggleSystemMode('TESTING')}
              disabled={switchingMode || systemModeStatus?.system_mode === 'TESTING'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                systemModeStatus?.system_mode === 'TESTING'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Testing Mode
            </button>
            <button
              onClick={() => handleToggleSystemMode('PRODUCTION')}
              disabled={switchingMode || systemModeStatus?.system_mode === 'PRODUCTION'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                systemModeStatus?.system_mode === 'PRODUCTION'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Production Mode
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0 overflow-x-auto">
          {[
            { id: 'satellite_apis', label: 'Satellite Provider APIs', icon: Radio },
            { id: 'pricing', label: 'Dynamic $/ha Pricing', icon: DollarSign },
            { id: 'sessions', label: 'Session Replays (rrweb)', icon: Play },
            { id: 'retention', label: 'Gemma 4 Retention Campaigns', icon: Mail },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  setSelectedSessionId(null);
                }}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition shrink-0 ${
                  activeTab === t.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* SATELLITE PROVIDER APIS & CREDENTIALS */}
          {activeTab === 'satellite_apis' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-purple-950/40 border border-purple-800/60">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-50">Satellite Databases & Multi-Tier Provider Ingestion</h4>
                    <p className="text-[11px] text-slate-300">
                      Configure upstream commercial & open-access Earth Observation APIs. Test live STAC/Order endpoints directly from KijaniAI.
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadAdminData}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </button>
              </div>

              {/* FREE-TIER SERVICE SELECTION & PLANETARY COMPUTE ENGINE */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/30 border border-purple-800/50 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-400" />
                      <h4 className="text-sm font-bold text-slate-50 tracking-wide">
                        Free-Tier Earth Observation & Planetary Compute (Tier 1)
                      </h4>
                      <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Active: {activeFreeProvider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Choose which upstream service powers free 10m–30m analytics. In Google Earth Engine (GEE), spectral reductions, cloud masking, SAR, and CHIRPS rainfall calculations are executed server-side before transforming into our database.
                    </p>
                  </div>
                </div>

                {freeTierMsg && (
                  <div className="text-xs font-semibold text-emerald-300 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{freeTierMsg}</span>
                  </div>
                )}

                {/* 3-Way Provider Switcher Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Google Earth Engine */}
                  <div
                    onClick={() => handleSwitchFreeProvider('GEE')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      activeFreeProvider === 'GEE'
                        ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-slate-50">Google Earth Engine</span>
                      </div>
                      {activeFreeProvider === 'GEE' && (
                        <span className="p-0.5 rounded-full bg-purple-500 text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700">
                      Server-Side Reductions
                    </span>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Planetary cluster computation for Sentinel-2, Sentinel-1 SAR & CHIRPS rainfall. Pre-aggregated before database storage.
                    </p>
                  </div>

                  {/* Microsoft Planetary Computer */}
                  <div
                    onClick={() => handleSwitchFreeProvider('PLANETARY_COMPUTER')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      activeFreeProvider === 'PLANETARY_COMPUTER'
                        ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-slate-50">Planetary Computer</span>
                      </div>
                      {activeFreeProvider === 'PLANETARY_COMPUTER' && (
                        <span className="p-0.5 rounded-full bg-purple-500 text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700">
                      Open STAC Streaming
                    </span>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Direct cloud-native COG window streaming with open STAC discovery and Azure blob asset tokens.
                    </p>
                  </div>

                  {/* Copernicus Data Space (CDSE) */}
                  <div
                    onClick={() => handleSwitchFreeProvider('CDSE')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      activeFreeProvider === 'CDSE'
                        ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-slate-50">Copernicus (CDSE)</span>
                      </div>
                      {activeFreeProvider === 'CDSE' && (
                        <span className="p-0.5 rounded-full bg-purple-500 text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700">
                      ESA Official OData
                    </span>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      European Space Agency enterprise Sentinel Hub, openEO catalog and Copernicus products API.
                    </p>
                  </div>
                </div>

                {/* GEE Credentials & Project Configuration */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-slate-50">Google Earth Engine Project & Credentials</span>
                    </div>
                    <span className="text-[11px] font-mono text-purple-300">
                      {freeTierSettings?.gee_status?.status_message || 'Calibrated server-side compute ready'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Google Cloud / GEE Project ID:
                      </label>
                      <input
                        type="text"
                        value={geeProjectId}
                        onChange={(e) => setGeeProjectId(e.target.value)}
                        placeholder="e.g. ee-kijani-spatial or my-gcp-project"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        GEE Service Account Email (optional):
                      </label>
                      <input
                        type="text"
                        value={geeServiceAccount}
                        onChange={(e) => setGeeServiceAccount(e.target.value)}
                        placeholder="e.g. kijani-sa@my-project.iam.gserviceaccount.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTestFreeEngine('GEE')}
                      disabled={testingFreeEngine === 'GEE'}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingFreeEngine === 'GEE' ? 'animate-spin text-purple-400' : ''}`} />
                      <span>{testingFreeEngine === 'GEE' ? 'Probing GEE...' : 'Test GEE Engine'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveFreeTierSettings()}
                      disabled={savingFreeTier}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingFreeTier ? 'Saving...' : 'Save GEE Credentials'}</span>
                    </button>
                  </div>
                </div>

                {/* CHIRPS & OpenWeatherMap Meteorological Integrations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* CHIRPS Rainfall Dataset Card */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-50">CHIRPS Daily Rainfall Engine</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono">
                      Dataset: UCSB-CHG/CHIRPS/DAILY (0.05° ~5.3 km)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Satellite infrared & in-situ station calibrated rainfall. Automatically feeds 14-day root-zone water balance storage ($S_t$) and decadal CWRI.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        Historical & Decadal Mode: Active
                      </span>
                    </div>
                  </div>

                  {/* OpenWeatherMap Forecast & Forecast Gating Card */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-slate-50">OpenWeatherMap 72h Forecast</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                        Forecast Gating
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Real-time 5-day / 3-hour micro-meteorological forecasts. Postpones irrigation when 72h forecast rainfall $\ge$ Net Irrigation Requirement (NIR).
                    </p>

                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        OpenWeatherMap API Key:
                      </label>
                      <input
                        type="password"
                        value={openWeatherMapKey}
                        onChange={(e) => setOpenWeatherMapKey(e.target.value)}
                        placeholder="Enter API key from openweathermap.org..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleTestFreeEngine('OPENWEATHERMAP')}
                        disabled={testingFreeEngine === 'OPENWEATHERMAP'}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingFreeEngine === 'OPENWEATHERMAP' ? 'animate-spin text-amber-400' : ''}`} />
                        <span>Test Weather Key</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveFreeTierSettings()}
                        disabled={savingFreeTier}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Save Key</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Free Engine Test Banner */}
                {freeEngineTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      freeEngineTestResult.success
                        ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                    }`}
                  >
                    {freeEngineTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-bold">
                        {freeEngineTestResult.engine === 'GEE' ? 'Google Earth Engine' : 'OpenWeatherMap'}{' '}
                        {freeEngineTestResult.success ? 'Probe Succeeded' : 'Probe Failed'}
                        {freeEngineTestResult.latency_ms ? ` (${freeEngineTestResult.latency_ms}ms)` : ''}
                      </div>
                      <div className="text-[11px] opacity-90">{freeEngineTestResult.message}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {satelliteConfigs.map((cfg) => {
                  const form = configForms[cfg.id] || {
                    apiKey: '',
                    secondarySecret: '',
                    endpoint: cfg.api_endpoint || '',
                    secondaryEndpoint: cfg.secondary_endpoint || '',
                    showKey: false,
                    showSecret: false,
                  };
                  const isTesting = testingTier === cfg.id;
                  const isSaving = savingTier === cfg.id;
                  const testRes = testResults[cfg.id];

                  return (
                    <div
                      key={cfg.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-3.5"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700 text-purple-200">
                              {cfg.tier_id}
                            </span>
                            <h5 className="text-sm font-bold text-slate-50">{cfg.provider_name}</h5>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{cfg.resolution_label}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {cfg.has_api_key ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Configured ({cfg.api_key_masked})</span>
                            </span>
                          ) : cfg.tier_id === 'tier_1' ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-950/60 border border-blue-800 px-2.5 py-0.5 rounded-full">
                              <Globe className="w-3 h-3" />
                              <span>Free Public Access</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800 px-2.5 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Key Required</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Primary Endpoint */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-300 block mb-1">
                            Primary API / STAC Endpoint:
                          </label>
                          <input
                            type="text"
                            value={form.endpoint}
                            onChange={(e) =>
                              setConfigForms((prev) => ({
                                ...prev,
                                [cfg.id]: { ...prev[cfg.id], endpoint: e.target.value },
                              }))
                            }
                            placeholder="https://..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* Secondary Endpoint */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-300 block mb-1">
                            Secondary Endpoint / Portal:
                          </label>
                          <input
                            type="text"
                            value={form.secondaryEndpoint}
                            onChange={(e) =>
                              setConfigForms((prev) => ({
                                ...prev,
                                [cfg.id]: { ...prev[cfg.id], secondaryEndpoint: e.target.value },
                              }))
                            }
                            placeholder="https://..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* API Key */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-300 block mb-1">
                            Provider API Key / Bearer Token:
                          </label>
                          <div className="relative">
                            <input
                              type={form.showKey ? 'text' : 'password'}
                              value={form.apiKey}
                              onChange={(e) =>
                                setConfigForms((prev) => ({
                                  ...prev,
                                  [cfg.id]: { ...prev[cfg.id], apiKey: e.target.value },
                                }))
                              }
                              placeholder={
                                cfg.has_api_key
                                  ? `Existing: ${cfg.api_key_masked} (enter to replace)`
                                  : 'Enter API Key...'
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setConfigForms((prev) => ({
                                  ...prev,
                                  [cfg.id]: { ...prev[cfg.id], showKey: !form.showKey },
                                }))
                              }
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-50 transition"
                            >
                              {form.showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Secondary Secret / Project ID */}
                        <div>
                          <label className="text-[11px] font-medium text-slate-300 block mb-1">
                            {cfg.tier_id === 'tier_3'
                              ? 'UP42 Project ID:'
                              : cfg.tier_id === 'tier_1'
                              ? 'CDSE Client Secret (optional):'
                              : 'Secondary Secret / Additional Key:'}
                          </label>
                          <div className="relative">
                            <input
                              type={form.showSecret ? 'text' : 'password'}
                              value={form.secondarySecret}
                              onChange={(e) =>
                                setConfigForms((prev) => ({
                                  ...prev,
                                  [cfg.id]: { ...prev[cfg.id], secondarySecret: e.target.value },
                                }))
                              }
                              placeholder={
                                cfg.has_secondary_secret
                                  ? `Existing: ${cfg.secondary_secret_masked}`
                                  : 'Enter secret / project ID...'
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setConfigForms((prev) => ({
                                  ...prev,
                                  [cfg.id]: { ...prev[cfg.id], showSecret: !form.showSecret },
                                }))
                              }
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-50 transition"
                            >
                              {form.showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Test Feedback Banner */}
                      {testRes && (
                        <div
                          className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                            testRes.success
                              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                              : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                          }`}
                        >
                          {testRes.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-0.5">
                            <div className="font-semibold">
                              {testRes.success ? 'Connection Succeeded' : 'Connection Failed'}
                              {testRes.latency_ms ? ` (${testRes.latency_ms}ms)` : ''}
                            </div>
                            <div className="text-[11px] opacity-90">{testRes.message}</div>
                            {testRes.tested_endpoint && (
                              <div className="text-[10px] font-mono text-slate-400">
                                Endpoint: {testRes.tested_endpoint}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="text-[11px] text-slate-400">
                          {cfg.updated_at
                            ? `Last updated: ${new Date(cfg.updated_at).toLocaleString()}`
                            : 'Default configuration loaded from environment (.env)'}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTestSatelliteConnection(cfg.id)}
                            disabled={isTesting}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-purple-400' : ''}`} />
                            <span>{isTesting ? 'Probing...' : 'Test Live Connection'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveSatelliteConfig(cfg.id)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-md transition disabled:opacity-50"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRICING CONFIGURATOR */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Configure satellite acquisition base rates, minimum billable hectares, and platform markup percentages.
              </p>
              <div className="divide-y divide-slate-800 rounded-xl bg-slate-950/60 border border-slate-800">
                {tiers.map((t) => (
                  <div key={t.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-50">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.sensors} • {t.resolution_label}</div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Base Price ($/ha):</label>
                        <input
                          type="number"
                          step="0.5"
                          defaultValue={t.base_cost_per_ha}
                          onBlur={(e) => handleUpdateTier(t, 'base_cost_per_ha', parseFloat(e.target.value))}
                          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block">Min Hectares:</label>
                        <input
                          type="number"
                          defaultValue={t.min_hectares}
                          onBlur={(e) => handleUpdateTier(t, 'min_hectares', parseFloat(e.target.value))}
                          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block">Markup (%):</label>
                        <input
                          type="number"
                          step="0.05"
                          defaultValue={t.markup_pct * 100}
                          onBlur={(e) => handleUpdateTier(t, 'markup_pct', parseFloat(e.target.value) / 100.0)}
                          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SESSION REPLAY (rrweb-player) */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">
                  Inspect user drop-off points, friction moments, and abandoned checkouts visually via rrweb session replays.
                </p>
                <span className="text-xs text-slate-400">{sessions.length} Recorded Sessions</span>
              </div>

              {selectedSessionId && (
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">Replaying Session: {selectedSessionId}</span>
                    <button
                      onClick={() => setSelectedSessionId(null)}
                      className="text-xs text-slate-400 hover:text-slate-50"
                    >
                      Close Player
                    </button>
                  </div>
                  <div ref={playerContainerRef} className="flex justify-center overflow-hidden rounded-lg bg-slate-900 border border-slate-800 min-h-[300px]" />
                </div>
              )}

              <div className="divide-y divide-slate-800 rounded-xl bg-slate-950/60 border border-slate-800">
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-50 flex items-center gap-2">
                        <span>{sess.user_email}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                          {sess.abandoned_step}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Started: {new Date(sess.started_at).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePlayReplay(sess.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition shadow-md"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Visual Replay</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RETENTION CAMPAIGN CONSOLE */}
          {activeTab === 'retention' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Gemma 4 analyzes abandoned checkout sessions, farm location, and agro-seasons to draft targeted win-back emails.
              </p>

              <div className="space-y-3">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-50">{camp.user_email}</span>
                        <div className="text-[11px] text-slate-400">{camp.friction_summary}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${camp.status === 'SENT' ? 'bg-emerald-950 text-emerald-300' : 'bg-yellow-950 text-yellow-300'}`}>
                        {camp.status}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="text-slate-400 font-semibold">Subject: <span className="text-slate-50">{camp.suggested_email_subject}</span></div>
                      <div className="text-slate-300 whitespace-pre-wrap pt-1 font-sans text-[11px] leading-relaxed">
                        {camp.suggested_email_body}
                      </div>
                    </div>

                    {camp.status === 'DRAFT' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSendCampaign(camp.id)}
                          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Approve & Dispatch via SMTP</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

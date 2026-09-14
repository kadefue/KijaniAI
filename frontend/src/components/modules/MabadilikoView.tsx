import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  History, Play, Pause, RotateCcw, Calendar, TrendingUp, TrendingDown,
  Minus, ShieldAlert, Sparkles, Languages, RefreshCw, BarChart3,
  Trees, Waves, Home, AlertCircle, CheckCircle2, ChevronRight,
  Compass, Info, Layers, ArrowUpRight, ArrowDownRight, Eye,
  Mail, Send, Clock, Loader2, CheckCheck, XCircle
} from 'lucide-react';
import { Parcel } from '../../types';
import { api } from '../../api/client';

interface MabadilikoViewProps {
  parcel: Parcel;
}

export const MabadilikoView: React.FC<MabadilikoViewProps> = ({ parcel }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // User-configurable parameters
  const [years, setYears] = useState<number>(10);
  const [cadence, setCadence] = useState<string>('monthly');
  const [lang, setLang] = useState<'en' | 'sw'>('en');

  // Timeline scrubber state
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<any>(null);

  // National benchmark basin comparison
  const [basinsSummary, setBasinsSummary] = useState<any[]>([]);
  const [showBasins, setShowBasins] = useState<boolean>(false);
  const [loadingBasins, setLoadingBasins] = useState<boolean>(false);

  // ── Async job state ──
  const [jobMode, setJobMode] = useState<boolean>(false);  // true = user submitted long async job
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [notifyEmail, setNotifyEmail] = useState<string>('');
  const [emailRegistered, setEmailRegistered] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadChanges();
  }, [parcel.id, years, cadence]);

  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (!data?.timeline) return 0;
          if (prev >= data.timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 450);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, data]);

  // ── Polling helper ──
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await api.getMabadilikoJobStatus(jobId);
        setJobStatus(status);
        if (status.status === 'COMPLETED') {
          stopPolling();
          setData(status.result_payload);
          const tl = status.result_payload?.timeline;
          setActiveStepIndex(tl && tl.length > 0 ? tl.length - 1 : 0);
          setLoading(false);
        } else if (status.status === 'FAILED') {
          stopPolling();
          setLoading(false);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2500);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Main analysis trigger ──
  const loadChanges = async () => {
    setLoading(true);
    setData(null);
    setJobMode(false);
    setActiveJobId(null);
    setJobStatus(null);
    setEmailRegistered(false);
    setEmailError('');
    stopPolling();
    try {
      // Use synchronous endpoint for quick preview
      const res = await api.getMabadilikoParcelChanges(parcel.id, { years, interval: cadence });
      setData(res);
      setActiveStepIndex(res.timeline ? res.timeline.length - 1 : 0);
    } catch (e) {
      console.error('Failed to load Mabadiliko change analysis', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Submit async job (user opts in for email + long processing) ──
  const submitAsyncJob = async () => {
    setJobMode(true);
    setLoading(true);
    setData(null);
    setJobStatus(null);
    setEmailRegistered(false);
    stopPolling();
    try {
      const res = await api.submitMabadilikoJob({
        boundary_name: parcel.name,
        boundary_type: 'parcel',
        parcel_id: parcel.id,
        geojson_geometry: (parcel as any).geojson_geometry,
        area_ha: parcel.area_ha,
        category: (parcel as any).category || 'forest',
        ecozone: (parcel as any).ecozone || 'MIOMBO',
        years,
        interval: cadence,
        notify_email: notifyEmail || undefined,
      });
      setActiveJobId(res.job_id);
      setJobStatus({ status: 'PENDING', progress_pct: 0, progress_message: 'Job queued' });
      startPolling(res.job_id);
      if (notifyEmail) setEmailRegistered(true);
    } catch (e: any) {
      console.error('Failed to submit async job', e);
      setLoading(false);
    }
  };

  // ── Register email on existing running job ──
  const registerEmail = async () => {
    if (!activeJobId || !notifyEmail) return;
    setEmailError('');
    try {
      await api.registerMabadilikoEmailNotification(activeJobId, notifyEmail);
      setEmailRegistered(true);
    } catch (e: any) {
      setEmailError('Could not register email. Please try again.');
    }
  };

  const loadBasinsSummary = async () => {
    setShowBasins(true);
    if (basinsSummary.length > 0) return;
    setLoadingBasins(true);
    try {
      const res = await api.getMabadilikoBasinsSummary(years, cadence);
      setBasinsSummary(res.basins || []);
    } catch (e) {
      console.error('Failed to load basins summary', e);
    } finally {
      setLoadingBasins(false);
    }
  };

  // ── Processing state panel ──
  if (loading && !data) {
    const pct = jobStatus?.progress_pct ?? 0;
    const msg = jobStatus?.progress_message ?? 'Initialising satellite data pipeline...';
    const isFailed = jobStatus?.status === 'FAILED';

    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <History className="w-6 h-6 text-violet-400" />
            <span className="text-lg font-bold text-slate-200">MabadilikoAI</span>
          </div>
          {isFailed ? (
            <>
              <XCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-red-300 font-semibold">Analysis Failed</p>
              <p className="text-sm text-slate-400">{jobStatus?.error_message || 'An unexpected error occurred.'}</p>
              <button onClick={loadChanges} className="mt-4 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
                Retry Analysis
              </button>
            </>
          ) : (
            <>
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto" />
              <p className="text-slate-200 font-semibold text-sm">
                {jobMode ? 'Background analysis in progress…' : 'Synthesizing satellite archives…'}
              </p>
              <p className="text-xs text-slate-500">
                {parcel.name} · {years} years · {cadence}
              </p>
            </>
          )}
        </div>

        {/* Progress bar */}
        {!isFailed && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{msg}</span>
              <span className="font-bold text-violet-300">{Math.round(pct)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, 5)}%` }}
              />
            </div>
            <div className="flex gap-3 pt-1">
              {['Queued', 'Processing', 'Analysing', 'Done'].map((step, i) => {
                const thresholds = [0, 20, 60, 100];
                const active = pct >= thresholds[i];
                return (
                  <div key={step} className="flex items-center gap-1.5 text-xs">
                    {active
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      : <Clock className="w-3.5 h-3.5 text-slate-600" />
                    }
                    <span className={active ? 'text-emerald-300' : 'text-slate-600'}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Email notification card */}
        {jobMode && !isFailed && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-semibold text-slate-200">Get notified when ready</span>
            </div>
            {emailRegistered ? (
              <div className="flex items-center gap-2 text-emerald-300 text-sm">
                <CheckCheck className="w-4 h-4" />
                <span>We'll send results to <strong>{notifyEmail}</strong></span>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400">
                  Leave this page — we'll email you when the analysis is complete.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={e => setNotifyEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={registerEmail}
                    disabled={!notifyEmail}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Notify Me
                  </button>
                </div>
                {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
              </>
            )}
          </div>
        )}

        {/* Quick preview button: run synchronously instead */}
        {jobMode && !isFailed && (
          <button
            onClick={loadChanges}
            className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 text-sm transition-colors"
          >
            Run instant preview instead (no email)
          </button>
        )}
      </div>
    );
  }

  const currentStep = data?.timeline ? data.timeline[activeStepIndex] || data.timeline[0] : null;
  const firstStep = data?.timeline ? data.timeline[0] : null;
  const net = data?.net_changes || {};
  const aiExp = data?.ai_explanation?.[lang] || data?.ai_explanation?.en;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner & Language Selector */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-700/60 flex items-center gap-1">
              <History className="w-3 h-3 text-violet-400" />
              <span>MabadilikoAI Engine</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                data?.system_mode === 'PRODUCTION'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                  : 'bg-indigo-950/80 text-indigo-300 border-indigo-600/50'
              }`}
            >
              {data?.system_mode === 'PRODUCTION' ? 'Live Satellite Multi-Temporal Series' : 'Calibrated Historical Decadal Simulator'}
            </span>
            <span className="text-xs text-slate-400">
              Area: <span className="font-bold text-slate-50">{parcel.area_ha?.toFixed(1)} ha</span> • {parcel.region} ({parcel.ecozone})
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-50 mt-1.5 flex items-center gap-2">
            <span>Historical Land Cover Change & Decadal AI Diagnosis</span>
          </h2>
          <p className="text-xs text-slate-400">
            Multi-temporal tracking of vegetation depletion/regrowth, water body contraction, settlement expansion, and soil erosion.
          </p>
        </div>

        {/* Language & Regional Basin Toggle */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={() => loadBasinsSummary()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tanzania Basins</span>
          </button>

          <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold">
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-md transition ${
                lang === 'en' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('sw')}
              className={`px-2.5 py-1 rounded-md transition ${
                lang === 'sw' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              SW
            </button>
          </div>
        </div>
      </div>

      {/* TEMPORAL CONTROLS BAR: Years Horizon & Interval Presets */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
        {/* Years Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            <span>Time Horizon:</span>
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 5, 7, 10].map((yr) => (
              <button
                key={yr}
                onClick={() => setYears(yr)}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                  years === yr
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {yr} {yr === 1 ? 'Year' : 'Yrs'}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500">(Max 10 Yrs)</span>
        </div>

        {/* Sampling Interval Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Sampling Cadence:</span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold"
          >
            <option value="monthly">Monthly (1 Month Step)</option>
            <option value="bi-monthly">Bi-Monthly (Every 2 Months)</option>
            <option value="quarterly">Quarterly (Every 3 Months)</option>
            <option value="bi-annually">Bi-Annually (Every 6 Months)</option>
            <option value="annually">Annually (Every 1 Year)</option>
          </select>

          <span className="text-xs text-slate-400 font-mono">
            {data?.time_horizon?.total_timesteps || 0} Steps
          </span>
        </div>
      </div>

      {/* ── Async Job Submission Panel ── */}
      <div className="glass-panel p-4 rounded-xl border border-sky-900/40 bg-sky-950/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-bold text-slate-200">
              Submit as Background Job + Email Notification
            </span>
          </div>
          <p className="text-xs text-slate-400">
            For high-resolution {years}-year analysis — submit a job, close this tab, and we'll email you when results are ready.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <input
            type="email"
            value={notifyEmail}
            onChange={e => setNotifyEmail(e.target.value)}
            placeholder="notify@email.com (optional)"
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 w-52"
          />
          <button
            onClick={submitAsyncJob}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-950/30"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Job
          </button>
        </div>
      </div>

      {/* 4 NET CHANGE KPI CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Vegetation / Forest Cover */}
        <div className="glass-panel p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Trees className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'sw' ? 'Uoto wa Asili / Misitu' : 'Vegetation & Forest'}</span>
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                net.vegetation_forest?.trend === 'INCREASED'
                  ? 'bg-emerald-900/80 text-emerald-300'
                  : net.vegetation_forest?.trend === 'DECREASED'
                  ? 'bg-rose-900/80 text-rose-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {net.vegetation_forest?.trend === 'INCREASED' && <ArrowUpRight className="w-3 h-3" />}
              {net.vegetation_forest?.trend === 'DECREASED' && <ArrowDownRight className="w-3 h-3" />}
              <span>{net.vegetation_forest?.trend}</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-50">
              {net.vegetation_forest?.final_ha?.toLocaleString()} ha
            </span>
            <span
              className={`text-xs font-bold ${
                net.vegetation_forest?.delta_ha >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {net.vegetation_forest?.delta_ha >= 0 ? '+' : ''}
              {net.vegetation_forest?.delta_ha} ha ({net.vegetation_forest?.delta_pct >= 0 ? '+' : ''}
              {net.vegetation_forest?.delta_pct}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {lang === 'sw'
              ? 'Uoto wa miti na misitu tangu mwanzo wa uchambuzi.'
              : 'Tree canopy cover and perennial biomass shifts.'}
          </p>
        </div>

        {/* 2. Water Sources & Wetlands */}
        <div className="glass-panel p-4 rounded-xl border border-sky-900/40 bg-sky-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-sky-400" />
              <span>{lang === 'sw' ? 'Vyanzo vya Maji' : 'Water Sources'}</span>
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                net.water_sources?.trend === 'INCREASED'
                  ? 'bg-sky-900/80 text-sky-300'
                  : net.water_sources?.trend === 'DECREASED'
                  ? 'bg-rose-900/80 text-rose-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {net.water_sources?.trend === 'INCREASED' && <ArrowUpRight className="w-3 h-3" />}
              {net.water_sources?.trend === 'DECREASED' && <ArrowDownRight className="w-3 h-3" />}
              <span>{net.water_sources?.trend}</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-50">
              {net.water_sources?.final_ha?.toLocaleString()} ha
            </span>
            <span
              className={`text-xs font-bold ${
                net.water_sources?.delta_ha >= 0 ? 'text-sky-400' : 'text-rose-400'
              }`}
            >
              {net.water_sources?.delta_ha >= 0 ? '+' : ''}
              {net.water_sources?.delta_ha} ha ({net.water_sources?.delta_pct >= 0 ? '+' : ''}
              {net.water_sources?.delta_pct}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {lang === 'sw'
              ? 'Mabwawa, mito, na ardhi oevu ya msimu.'
              : 'Open reservoirs, stream baseflows, and wetlands.'}
          </p>
        </div>

        {/* 3. Built-Up Structures & Settlements */}
        <div className="glass-panel p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-amber-400" />
              <span>{lang === 'sw' ? 'Makazi na Majengo' : 'Built-Up Structures'}</span>
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                net.built_up_structures?.trend === 'INCREASED'
                  ? 'bg-amber-900/80 text-amber-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {net.built_up_structures?.trend === 'INCREASED' && <ArrowUpRight className="w-3 h-3" />}
              <span>{net.built_up_structures?.trend}</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-50">
              {net.built_up_structures?.final_ha?.toLocaleString()} ha
            </span>
            <span className="text-xs font-bold text-amber-400">
              {net.built_up_structures?.delta_ha >= 0 ? '+' : ''}
              {net.built_up_structures?.delta_ha} ha ({net.built_up_structures?.delta_pct >= 0 ? '+' : ''}
              {net.built_up_structures?.delta_pct}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {lang === 'sw'
              ? 'Majengo ya makazi, biashara na miundombinu.'
              : 'Dwellings, impervious surfaces, and rural roads.'}
          </p>
        </div>

        {/* 4. Bare Soil & Degraded Ground */}
        <div className="glass-panel p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{lang === 'sw' ? 'Ardhi Tupu / Mmomonyoko' : 'Bare Soil & Clearings'}</span>
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                net.bare_soil?.trend === 'INCREASED'
                  ? 'bg-rose-900/80 text-rose-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {net.bare_soil?.trend === 'INCREASED' && <ArrowUpRight className="w-3 h-3" />}
              <span>{net.bare_soil?.trend}</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-50">
              {net.bare_soil?.final_ha?.toLocaleString()} ha
            </span>
            <span
              className={`text-xs font-bold ${
                net.bare_soil?.delta_ha > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {net.bare_soil?.delta_ha >= 0 ? '+' : ''}
              {net.bare_soil?.delta_ha} ha ({net.bare_soil?.delta_pct >= 0 ? '+' : ''}
              {net.bare_soil?.delta_pct}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {lang === 'sw'
              ? 'Ardhi iliyo wazi na inayoweza kumomonyoka.'
              : 'Exposed topsoil susceptible to monsoon runoff.'}
          </p>
        </div>
      </div>

      {/* INTERACTIVE TIMELINE SCRUBBER & PLAYBACK BAR */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-950 transition flex items-center gap-1.5 text-xs font-bold"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setActiveStepIndex(0);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Reset to Baseline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-bold text-slate-50 block">
                Timestep: <span className="font-mono text-violet-400 text-sm">{currentStep?.date}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Satellite Sensor: {currentStep?.satellite_sensor} • NDVI: {currentStep?.mean_ndvi}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Baseline: <strong className="text-slate-200">{firstStep?.date}</strong>
            </span>
            <span>&rarr;</span>
            <span>
              Latest: <strong className="text-slate-200">{data?.timeline[data.timeline.length - 1]?.date}</strong>
            </span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={(data?.timeline?.length || 1) - 1}
            value={activeStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setActiveStepIndex(parseInt(e.target.value));
            }}
            className="w-full accent-violet-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>{firstStep?.date}</span>
            <span className="text-violet-400 font-bold">{currentStep?.date}</span>
            <span>{data?.timeline[data.timeline.length - 1]?.date}</span>
          </div>
        </div>

        {/* Visual Class Distribution at Current Step */}
        {currentStep && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block">
              Land Cover Composition at {currentStep.date}:
            </span>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${currentStep.classes.vegetation_forest.percentage}%` }}
                title={`Vegetation: ${currentStep.classes.vegetation_forest.percentage}%`}
              />
              <div
                className="bg-sky-500 transition-all duration-300"
                style={{ width: `${currentStep.classes.water_sources.percentage}%` }}
                title={`Water: ${currentStep.classes.water_sources.percentage}%`}
              />
              <div
                className="bg-amber-500 transition-all duration-300"
                style={{ width: `${currentStep.classes.built_up_structures.percentage}%` }}
                title={`Settlements: ${currentStep.classes.built_up_structures.percentage}%`}
              />
              <div
                className="bg-rose-500 transition-all duration-300"
                style={{ width: `${currentStep.classes.bare_soil.percentage}%` }}
                title={`Bare Soil: ${currentStep.classes.bare_soil.percentage}%`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-300">
                  Vegetation: <strong className="text-slate-50">{currentStep.classes.vegetation_forest.percentage}%</strong>{' '}
                  <span className="text-[10px] text-slate-500">({currentStep.classes.vegetation_forest.hectares} ha)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                <span className="text-slate-300">
                  Water: <strong className="text-slate-50">{currentStep.classes.water_sources.percentage}%</strong>{' '}
                  <span className="text-[10px] text-slate-500">({currentStep.classes.water_sources.hectares} ha)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-300">
                  Built-Up: <strong className="text-slate-50">{currentStep.classes.built_up_structures.percentage}%</strong>{' '}
                  <span className="text-[10px] text-slate-500">({currentStep.classes.built_up_structures.hectares} ha)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-300">
                  Bare Soil: <strong className="text-slate-50">{currentStep.classes.bare_soil.percentage}%</strong>{' '}
                  <span className="text-[10px] text-slate-500">({currentStep.classes.bare_soil.hectares} ha)</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BILINGUAL AI NARRATIVE EXPLANATION CARD */}
      {aiExp && (
        <div className="glass-panel p-5 rounded-2xl border border-violet-700/50 bg-violet-950/20 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300">
                <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-50">{aiExp.title}</h3>
                <span className="text-[10px] text-slate-400">
                  {lang === 'sw' ? 'Ufafanuzi wa Kina wa AI na Satelaiti' : 'AI-Synthesized Decadal Earth Observation Diagnosis'}
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/40">
              {lang === 'sw' ? 'Kiswahili' : 'English'}
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            {aiExp.summary}
          </p>

          {/* Diagnostic Bullets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {aiExp.diagnostics?.map((diag: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="text-slate-300 font-medium">{diag}</span>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
            <strong className="text-violet-400 block text-[11px] uppercase tracking-wider">
              {lang === 'sw' ? 'Mapendekezo ya Kisera na Uhifadhi:' : 'Policy & Agro-Ecological Recommendations:'}
            </strong>
            <p className="leading-relaxed">{aiExp.recommendation}</p>
          </div>

          {/* Key Drivers */}
          {data?.key_drivers && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-300 block">
                {lang === 'sw' ? 'Sababu Kuu za Mabadiliko:' : 'Key Transition Drivers Identified:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {data.key_drivers.map((d: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-50">
                        {lang === 'sw' ? d.driver_sw || d.driver : d.driver}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                          d.severity === 'HIGH'
                            ? 'bg-rose-900/80 text-rose-300'
                            : d.severity === 'MODERATE'
                            ? 'bg-amber-900/80 text-amber-300'
                            : 'bg-emerald-900/80 text-emerald-300'
                        }`}
                      >
                        {d.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{d.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LULC TRANSITION MATRIX (From Baseline -> Current) */}
      {data?.transition_matrix && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/80 bg-slate-900/80 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-50 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <span>Land Cover Transition Matrix ({years}-Year Net Conversions)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Cross-tabulated area transfers from initial baseline state to latest satellite observation (in hectares).
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Markovian Transition Flow</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2 px-3">From \\ To</th>
                  <th className="py-2 px-3 text-emerald-400">Vegetation (ha)</th>
                  <th className="py-2 px-3 text-sky-400">Water (ha)</th>
                  <th className="py-2 px-3 text-amber-400">Built-Up (ha)</th>
                  <th className="py-2 px-3 text-rose-400">Bare Soil (ha)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {data.transition_matrix.map((row: any) => (
                  <tr key={row.from_class} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-300 capitalize">
                      {row.from_class.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{row.conversions.vegetation_forest}</td>
                    <td className="py-2.5 px-3 text-slate-200">{row.conversions.water_sources}</td>
                    <td className="py-2.5 px-3 text-slate-200">{row.conversions.built_up_structures}</td>
                    <td className="py-2.5 px-3 text-slate-200">{row.conversions.bare_soil}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NATIONAL BENCHMARKS DRAWER (If toggled) */}
      {showBasins && (
        <div className="glass-panel p-5 rounded-2xl border border-cyan-800/50 bg-cyan-950/20 space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-50">Tanzania Regional Basin Decadal Benchmarks</h3>
            </div>
            <button
              onClick={() => setShowBasins(false)}
              className="text-xs text-slate-400 hover:text-slate-50"
            >
              Close &times;
            </button>
          </div>

          {loadingBasins ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              Loading national basin multi-temporal summaries...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {basinsSummary.map((b: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-50 text-xs">{b.basin_name}</span>
                    <span className="text-[10px] font-mono text-cyan-400">{b.area_ha?.toLocaleString()} ha</span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-3">
                    {lang === 'sw' ? b.ai_summary_sw : b.ai_summary_en}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                    <span>Veg: {b.net_changes?.vegetation_forest?.delta_pct}%</span>
                    <span>•</span>
                    <span>Water: {b.net_changes?.water_sources?.delta_pct}%</span>
                    <span>•</span>
                    <span>Built: {b.net_changes?.built_up_structures?.delta_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

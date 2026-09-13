import React, { useState, useEffect } from 'react';
import { 
  Award, FileText, CheckCircle, QrCode, ExternalLink, Download, 
  RotateCcw, ShieldCheck, Sparkles 
} from 'lucide-react';
import { CarbonMetrics, Parcel } from '../../types';
import { api } from '../../api/client';

interface CarbonMrvViewProps {
  parcel: Parcel;
}

export const CarbonMrvView: React.FC<CarbonMrvViewProps> = ({ parcel }) => {
  const [data, setData] = useState<CarbonMetrics | null>(null);
  const [certificate, setCertificate] = useState<any | null>(null);
  const [recalibrationResult, setRecalibrationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    loadCarbon();
  }, [parcel.id]);

  const loadCarbon = async () => {
    setLoading(true);
    try {
      const res = await api.getCarbonMetrics(parcel.id);
      setData(res);
    } catch (e) {
      console.error('Failed to load carbon metrics', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMrv = async () => {
    setGenerating(true);
    try {
      const cert = await api.generateMrvCertificate(parcel.id);
      setCertificate(cert);
    } catch (e) {
      alert('Error generating cryptographic MRV audit dossier');
    } finally {
      setGenerating(false);
    }
  };

  const handleRecalibrate = async () => {
    try {
      const res = await api.recalibrateCarbon(parcel.id);
      setRecalibrationResult(res);
      loadCarbon();
    } catch (e) {
      alert('Error running sensor fusion recalibration');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Calculating East African eco-zone allometric models & carbon sequestration ledger...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-teal-800/60 bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
              Verra VM0042 & Plan Vivo Standard
            </span>
            <span className="text-xs text-slate-400">Ecozone: {parcel.ecozone}</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            KijaniCarbon: Allometric Carbon MRV & Issuance Engine
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Individual DeepForest crowns translated into verified Below-Ground and Above-Ground Biomass.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRecalibrate}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Recalibrate (Field DBH)</span>
          </button>

          <button
            onClick={handleGenerateMrv}
            disabled={generating}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-700/20 transition"
          >
            <Award className="w-4 h-4" />
            <span>{generating ? 'Generating WeasyPrint PDF...' : 'Synthesize MRV Audit Dossier'}</span>
          </button>
        </div>
      </div>

      {recalibrationResult && (
        <div className="p-4 rounded-xl bg-teal-950/70 border border-teal-700 text-teal-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal-400" />
            <span>
              Recalibrated using {recalibrationResult.observations_fused} on-device field observations (Mean DBH: {recalibrationResult.mean_ground_measured_dbh_cm} cm).
              Stand AGB updated to {recalibrationResult.recalibrated_agb_tonnes} tonnes.
            </span>
          </div>
          <span className="font-bold text-white">{recalibrationResult.confidence_boost}</span>
        </div>
      )}

      {/* Accounting KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Total Stand Biomass</div>
          <div className="text-3xl font-black text-white mt-1">{data?.total_biomass_tonnes.toLocaleString()} <span className="text-sm font-normal text-slate-400">t</span></div>
          <div className="text-[11px] text-slate-400 mt-1">AGB: {data?.agb_tonnes}t • BGB: {data?.bgb_tonnes}t</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Gross Carbon Stock</div>
          <div className="text-3xl font-black text-teal-300 mt-1">{data?.gross_tco2e.toLocaleString()} <span className="text-sm font-normal text-slate-400">tCO₂e</span></div>
          <div className="text-[11px] text-slate-400 mt-1">CF = 0.47 × (44/12)</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-700">
          <div className="text-xs text-slate-400 font-semibold">Buffer Pool Deduction</div>
          <div className="text-3xl font-black text-amber-400 mt-1">-{data?.buffer_tco2e.toLocaleString()} <span className="text-sm font-normal text-slate-400">tCO₂e</span></div>
          <div className="text-[11px] text-slate-400 mt-1">15% Non-Permanence Risk Buffer</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-teal-800 bg-teal-950/20">
          <div className="text-xs text-teal-400 font-semibold">Net Tradable Carbon Credits</div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{data?.net_tco2e_tradable.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Ready for Registry Issuance</div>
        </div>
      </div>

      {/* Generated Certificate Presentation */}
      {certificate && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-700/80 bg-slate-900/90 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="text-base font-bold text-white">Cryptographic MRV Audit Dossier Issued</h4>
                <div className="text-xs text-slate-400 font-mono">Certificate: {certificate.certificate_number}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={certificate.verification_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                <span>Verify Token</span>
              </a>

              <a
                href={certificate.download_pdf_url}
                download
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-700/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Audit PDF</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-400">SHA-256 Spatial Boundary Hash:</span>
              <div className="text-emerald-400 truncate">{certificate.sha256_spatial_hash}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-400">SHA-256 Raster Ledger Hash:</span>
              <div className="text-emerald-400 truncate">{certificate.sha256_raster_hash}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

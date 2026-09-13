import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Camera, UploadCloud, CheckCircle, Database, 
  X, RefreshCw, Layers 
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDb } from '../../hooks/useOfflineDB';
import { Parcel } from '../../types';
import { api } from '../../api/client';

interface KijaniSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: Parcel | null;
}

export const KijaniSyncModal: React.FC<KijaniSyncModalProps> = ({ isOpen, onClose, parcel }) => {
  const [capturing, setCapturing] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [detectedSpecies, setDetectedSpecies] = useState<string>('Brachystegia (Miombo dominant)');
  const [estimatedDbh, setEstimatedDbh] = useState<number>(24.8);
  const [estimatedHeight, setEstimatedHeight] = useState<number>(10.5);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Read local Dexie observations
  const observations = useLiveQuery(() => offlineDb.offlineObservations.toArray(), []);

  if (!isOpen) return null;

  const handleSimulateCameraCapture = () => {
    setCapturing(true);
    setTimeout(() => {
      // Edge inference simulation (<15MB INT8 model results)
      const speciesList = [
        'Brachystegia (Miombo)', 'Pterocarpus angolensis (Muninga)',
        'Teak (Tectona grandis)', 'Eucalyptus saligna', 'Cashew (Korosho)'
      ];
      const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
      const randomDbh = parseFloat((18.0 + Math.random() * 16.0).toFixed(1));
      const randomHeight = parseFloat((8.0 + Math.random() * 6.0).toFixed(1));

      setDetectedSpecies(randomSpecies);
      setEstimatedDbh(randomDbh);
      setEstimatedHeight(randomHeight);
      setCapturedPhoto('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="%23064e3b" width="300" height="200"/><text fill="%2310b981" x="50%25" y="50%25" text-anchor="middle" font-family="sans-serif" font-size="14">Edge Trunk DBH Detected: ' + randomDbh + 'cm</text></svg>');
      setCapturing(false);
    }, 1200);
  };

  const handleSaveOfflineObservation = async () => {
    if (!parcel) return;
    await offlineDb.offlineObservations.add({
      parcel_id: parcel.id,
      latitude: -6.83 + (Math.random() - 0.5) * 0.01,
      longitude: 37.61 + (Math.random() - 0.5) * 0.01,
      species_identified: detectedSpecies,
      measured_dbh_cm: estimatedDbh,
      measured_height_m: estimatedHeight,
      edge_confidence: 0.94,
      synced: false,
      timestamp: Date.now(),
    });
    setCapturedPhoto(null);
  };

  const handleSyncObservations = async () => {
    if (!parcel) return;
    setSyncing(true);
    try {
      const unsynced = await offlineDb.offlineObservations.where('synced').equals(0).toArray();
      if (unsynced.length === 0) {
        setSyncMessage('All local field surveys already synchronized.');
        setTimeout(() => setSyncMessage(null), 3000);
        return;
      }

      await api.syncObservations(
        parcel.id,
        unsynced.map((o) => ({
          latitude: o.latitude,
          longitude: o.longitude,
          species_identified: o.species_identified,
          measured_dbh_cm: o.measured_dbh_cm,
          measured_height_m: o.measured_height_m,
          edge_model_confidence: o.edge_confidence,
        }))
      );

      // Mark local as synced
      await offlineDb.offlineObservations.toCollection().modify({ synced: true });
      setSyncMessage(`Synchronized ${unsynced.length} field observations with central cloud!`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/95 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-extrabold text-white">KijaniSync: Offline Field Ground-Truthing</h3>
              <p className="text-xs text-slate-400">IndexedDB persistence & on-device edge computer vision</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edge Vision Camera Box */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 text-center">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            On-Device Tree Trunk DBH & Species Edge Classifier
          </h4>

          {capturedPhoto ? (
            <div className="space-y-3">
              <img src={capturedPhoto} alt="Captured tree" className="mx-auto rounded-xl border border-emerald-500/50 shadow-lg max-h-48" />
              <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800 text-left">
                <div>
                  <span className="text-slate-400">Species:</span>
                  <div className="font-bold text-emerald-400">{detectedSpecies}</div>
                </div>
                <div>
                  <span className="text-slate-400">Estimated DBH:</span>
                  <div className="font-bold text-white">{estimatedDbh} cm</div>
                </div>
                <div>
                  <span className="text-slate-400">Height:</span>
                  <div className="font-bold text-white">{estimatedHeight} m</div>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveOfflineObservation}
                  className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                >
                  Save Observation (Local IndexedDB)
                </button>
                <button
                  type="button"
                  onClick={() => setCapturedPhoto(null)}
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 space-y-3">
              <Camera className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-300">
                Point smartphone camera at tree trunk. Edge AI computes Diameter at Breast Height (DBH) and classifies species offline.
              </p>
              <button
                type="button"
                disabled={capturing}
                onClick={handleSimulateCameraCapture}
                className="text-xs font-bold px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-600/20"
              >
                {capturing ? 'Running Edge Vision (INT8 ONNX)...' : 'Simulate Camera Inspection'}
              </button>
            </div>
          )}
        </div>

        {/* Local Observations Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Local Offline Surveys ({observations?.length || 0})</span>
            </div>

            <button
              onClick={handleSyncObservations}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{syncing ? 'Syncing...' : 'Sync with Cloud'}</span>
            </button>
          </div>

          {syncMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          <div className="max-h-40 overflow-y-auto divide-y divide-slate-800 rounded-xl bg-slate-950/60 border border-slate-800">
            {(observations || []).map((obs, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{obs.species_identified}</div>
                  <div className="text-[11px] text-slate-400">DBH: {obs.measured_dbh_cm} cm • Height: {obs.measured_height_m} m</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${obs.synced ? 'bg-slate-800 text-slate-400' : 'bg-blue-950 text-blue-300'}`}>
                  {obs.synced ? 'Synced' : 'Local Queue'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

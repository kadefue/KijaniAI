import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ModuleTab } from './components/layout/Sidebar';
import { MapCanvas } from './components/map/MapCanvas';
import { IrrigationView } from './components/modules/IrrigationView';
import { MajiWaterView } from './components/modules/MajiWaterView';
import { TreeCountView } from './components/modules/TreeCountView';
import { HealthView } from './components/modules/HealthView';
import { RadarView } from './components/modules/RadarView';
import { CarbonMrvView } from './components/modules/CarbonMrvView';
import { WatchView } from './components/modules/WatchView';
import { RestoreView } from './components/modules/RestoreView';
import { LandCoverView } from './components/modules/LandCoverView';
import { MabadilikoView } from './components/modules/MabadilikoView';
import { DropzoneModal } from './components/common/DropzoneModal';
import { WalletModal } from './components/common/WalletModal';
import { UserManualModal } from './components/common/UserManualModal';
import { ForestReservesModal } from './components/common/ForestReservesModal';
import { KijaniSyncModal } from './components/field/KijaniSyncModal';
import { GemmaCopilotDrawer } from './components/copilot/GemmaCopilotDrawer';
import { AdminModal } from './components/admin/AdminModal';
import { useTelemetry } from './hooks/useTelemetry';
import { api } from './api/client';
import { Parcel } from './types';

export const App: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [activeTab, setActiveTab] = useState<ModuleTab>('irrigation');
  const [crownGeojson, setCrownGeojson] = useState<any | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(1250);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [systemMode, setSystemMode] = useState<'TESTING' | 'PRODUCTION'>('TESTING');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isForestReservesOpen, setIsForestReservesOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isSyncOpen, setIsSyncOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);

  const { trackAction, reportAbandonment } = useTelemetry(selectedParcel?.id);

  useEffect(() => {
    loadParcels();
    loadUser();
    loadSystemMode();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSystemMode = async () => {
    try {
      const res = await api.getSystemMode();
      setSystemMode(res.system_mode);
    } catch (e) {
      console.error('Failed to load system mode', e);
    }
  };

  const loadParcels = async () => {
    try {
      const data = await api.listParcels();
      setParcels(data);
      if (data.length > 0 && !selectedParcel) {
        setSelectedParcel(data[0]);
      }
    } catch (e) {
      console.error('Failed to load parcels', e);
    }
  };

  const loadUser = async () => {
    try {
      const user = await api.getCurrentUser();
      if (user?.wallet_balance_usd !== undefined) {
        setWalletBalance(user.wallet_balance_usd);
      }
    } catch (e) {
      console.error('Failed to load user', e);
    }
  };

  const handleSelectTab = (tab: ModuleTab) => {
    setActiveTab(tab);
    trackAction('tab_selected', { tab });
  };

  const handleParcelCreated = (newParcel: Parcel) => {
    setParcels([newParcel, ...parcels]);
    setSelectedParcel(newParcel);
    trackAction('parcel_created', { parcel_id: newParcel.id, name: newParcel.name });
  };

  const getActiveLayerForTab = (tab: ModuleTab) => {
    switch (tab) {
      case 'water':
        return 'water';
      case 'irrigation':
        return 'irrigation_stress';
      case 'health':
        return 'ndvi';
      case 'radar':
        return 'sar';
      case 'mabadiliko':
        return 'rgb';
      default:
        return 'rgb';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar
        parcels={parcels}
        selectedParcel={selectedParcel}
        onSelectParcel={(p) => {
          setSelectedParcel(p);
          trackAction('parcel_switched', { parcel_id: p.id });
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenForestReserves={() => setIsForestReservesOpen(true)}
        onOpenPricing={() => {
          setIsPricingOpen(true);
          trackAction('tier_checkout_opened');
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSync={() => setIsSyncOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
        onToggleCopilot={() => {
          setIsCopilotOpen(!isCopilotOpen);
          trackAction('copilot_drawer_toggled');
        }}
        isOnline={isOnline}
        walletBalance={walletBalance}
        systemMode={systemMode}
      />

      {/* Main Workspace Layout: Sidebar + Split View (Map Canvas + Active Module View) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          parcelCategory={selectedParcel?.category}
        />

        {/* Center/Right Content Workspace: Resizable Split Canvas */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Map Canvas (Left or Top) */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full relative border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
            <MapCanvas
              parcel={selectedParcel}
              crownGeojson={crownGeojson}
              activeLayer={getActiveLayerForTab(activeTab)}
              onOpenForestReserves={() => setIsForestReservesOpen(true)}
            />
          </div>

          {/* Module Analytical Dashboard (Right or Bottom) */}
          <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-y-auto bg-slate-900/50">
            {selectedParcel ? (
              <>
                {activeTab === 'irrigation' && <IrrigationView parcel={selectedParcel} />}
                {activeTab === 'water' && <MajiWaterView parcel={selectedParcel} />}
                {activeTab === 'count' && (
                  <TreeCountView
                    parcel={selectedParcel}
                    onCrownsLoaded={(geojson) => setCrownGeojson(geojson)}
                    systemMode={systemMode}
                  />
                )}
                {activeTab === 'health' && <HealthView parcel={selectedParcel} />}
                {activeTab === 'radar' && <RadarView parcel={selectedParcel} />}
                {activeTab === 'carbon' && <CarbonMrvView parcel={selectedParcel} />}
                {activeTab === 'watch' && <WatchView parcel={selectedParcel} />}
                {activeTab === 'restore' && <RestoreView parcel={selectedParcel} />}
                {activeTab === 'map' && <LandCoverView parcel={selectedParcel} />}
                {activeTab === 'mabadiliko' && <MabadilikoView parcel={selectedParcel} />}
                {activeTab === 'sync' && (
                  <div className="p-8 text-center space-y-4">
                    <h3 className="text-base font-bold text-slate-50">KijaniSync Offline PWA Engine</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Use the KijaniSync button in the top navigation or click below to launch the offline on-device camera tree inspection modal.
                    </p>
                    <button
                      onClick={() => setIsSyncOpen(true)}
                      className="text-xs font-bold px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg"
                    >
                      Open Field Camera Modal
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-slate-500">
                Please import or select a parcel boundary to begin analysis.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Modals */}
      <DropzoneModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onParcelCreated={handleParcelCreated}
      />

      <WalletModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        parcel={selectedParcel}
        walletBalance={walletBalance}
        onOrderCompleted={() => loadUser()}
        onAbandonedCheckout={() => reportAbandonment('pricing_modal_closed_without_order')}
      />

      <KijaniSyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        parcel={selectedParcel}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSystemModeChange={(newMode) => setSystemMode(newMode)}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenSync={() => setIsSyncOpen(true)}
        onToggleCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Tanzania Forest Reserves PostGIS & Land Cover Monitoring Modal */}
      <ForestReservesModal
        isOpen={isForestReservesOpen}
        onClose={() => setIsForestReservesOpen(false)}
        onReserveImported={(p) => {
          handleParcelCreated(p);
          setActiveTab('map');
          setIsForestReservesOpen(false);
        }}
      />

      {/* Gemma 4 Copilot Drawer */}
      <GemmaCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        parcel={selectedParcel}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Trees, X, Search, Filter, ShieldCheck, MapPin, Layers,
  CheckCircle2, ArrowRight, Activity, AlertTriangle,
  Leaf, BarChart3, Globe, Compass, Database, RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { Parcel } from '../../types';

interface ForestReservesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReserveImported: (parcel: Parcel) => void;
}

export const ForestReservesModal: React.FC<ForestReservesModalProps> = ({
  isOpen,
  onClose,
  onReserveImported,
}) => {
  const [reserves, setReserves] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [catalog, setCatalog] = useState<any | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [designation, setDesignation] = useState<string>('all');
  const [iucnCategory, setIucnCategory] = useState<string>('all');
  const [page, setPage] = useState<number>(0);
  const pageSize = 20;

  // Selected reserve for deep land cover analysis
  const [selectedReserve, setSelectedReserve] = useState<any | null>(null);
  const [landCoverData, setLandCoverData] = useState<any | null>(null);
  const [loadingLandCover, setLoadingLandCover] = useState<boolean>(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
      loadReserves();
    }
  }, [isOpen, search, designation, iucnCategory, page]);

  const loadCatalog = async () => {
    try {
      const cat = await api.getForestReservesCatalog();
      setCatalog(cat);
    } catch (e) {
      console.error('Failed to load forest reserves catalog', e);
    }
  };

  const loadReserves = async () => {
    setLoading(true);
    try {
      const data = await api.getForestReserves({
        search: search.trim() || undefined,
        designation: designation !== 'all' ? designation : undefined,
        iucn: iucnCategory !== 'all' ? iucnCategory : undefined,
        limit: pageSize,
        skip: page * pageSize,
      });
      setReserves(data.reserves || []);
      setTotalCount(data.total || 0);
    } catch (e) {
      console.error('Failed to query forest reserves', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReserve = async (reserve: any) => {
    setSelectedReserve(reserve);
    setLandCoverData(null);
    setLoadingLandCover(true);
    try {
      const lc = await api.getForestReserveLandCover(reserve.id);
      setLandCoverData(lc);
    } catch (e) {
      console.error('Failed to load land cover for reserve', e);
    } finally {
      setLoadingLandCover(false);
    }
  };

  const handleImportToMonitoring = async (reserveId: string) => {
    setImportingId(reserveId);
    setImportSuccess(null);
    try {
      const res = await api.importForestReserveToMonitoring(reserveId);
      setImportSuccess(res.message || 'Successfully imported into monitoring!');
      // Fetch full parcel from parcels API
      const updatedParcels = await api.listParcels();
      const match = updatedParcels.find((p: Parcel) => p.id === res.parcel_id);
      if (match) {
        onReserveImported(match);
      }
    } catch (e: any) {
      alert(`Import failed: ${e.message}`);
    } finally {
      setImportingId(null);
    }
  };

  const handleReingest = async () => {
    setIngesting(true);
    try {
      await api.ingestForestReserves();
      await loadCatalog();
      await loadReserves();
    } catch (e) {
      console.error('Ingest failed', e);
    } finally {
      setIngesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-emerald-700/50 rounded-2xl shadow-2xl shadow-emerald-950/50 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-600/20 ring-1 ring-emerald-400/40">
              <Trees className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Tanzania Forest Reserves (PostGIS Database)
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                  TFS / WDPA Network
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official gazetted forest estate: 696 reserves covering 9,568,018 hectares for continuous Land Cover & Deforestation Monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReingest}
              disabled={ingesting}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Sync PostGIS with backend/data/tanzania_forest_reserves/Tanzania_Forest_Reserves.geojson"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${ingesting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{ingesting ? 'Syncing...' : 'Sync PostGIS'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Catalog Highlights Bar */}
        {catalog && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Gazetted Reserves</span>
                <span className="font-extrabold text-white text-sm">
                  {catalog.total_forest_reserves?.toLocaleString()} Units
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-950/80 border border-teal-800/40 text-teal-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Protected Area</span>
                <span className="font-extrabold text-teal-300 text-sm">
                  {catalog.total_protected_area_ha ? (catalog.total_protected_area_ha / 1000000).toFixed(2) : '9.57'}M Ha
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/40 text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Nature Forest Reserves</span>
                <span className="font-extrabold text-cyan-300 text-sm">
                  19 Flagship NFRs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800/40 text-indigo-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Management Authority</span>
                <span className="font-extrabold text-indigo-300 text-sm truncate">
                  Tanzania Forest Services (TFS)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reserve name, authority or location (e.g., Amani, Minziro, Uluguru)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={designation}
              onChange={(e) => {
                setDesignation(e.target.value);
                setPage(0);
              }}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Designations (696)</option>
              <option value="Nature Forest Reserve">Nature Forest Reserves (Strict)</option>
              <option value="Forest Reserve">Gazetted Forest Reserves</option>
              <option value="Sanctuary">Sanctuaries</option>
            </select>

            <select
              value={iucnCategory}
              onChange={(e) => {
                setIucnCategory(e.target.value);
                setPage(0);
              }}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All IUCN Categories</option>
              <option value="Ib">IUCN Ib (Wilderness Area)</option>
              <option value="II">IUCN II (National Park / Strict)</option>
              <option value="IV">IUCN IV (Habitat/Species Mgmt)</option>
              <option value="VI">IUCN VI (Sustainable Resource)</option>
              <option value="Not Reported">Not Reported</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 ml-auto">
            Showing <span className="font-bold text-emerald-400">{reserves.length}</span> of{' '}
            <span className="font-bold text-white">{totalCount}</span> reserves
          </div>
        </div>

        {/* Success Banner if parcel imported */}
        {importSuccess && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-200 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{importSuccess}</span>
            </div>
            <button
              onClick={() => {
                setImportSuccess(null);
                onClose();
              }}
              className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] transition"
            >
              Go to Map View &rarr;
            </button>
          </div>
        )}

        {/* Content Body: Split List & Land Cover Details Drawer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Reserves Table / List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 border-r border-slate-800">
            {loading ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs font-semibold">Querying PostGIS Tanzania Forest Reserves Database...</p>
              </div>
            ) : reserves.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Trees className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">No forest reserves match your criteria.</p>
                <p className="text-xs text-slate-500">Try clearing the search query or designation filter.</p>
              </div>
            ) : (
              reserves.map((r) => {
                const isSelected = selectedReserve?.id === r.id;
                const isNature = r.designation?.includes('Nature');
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectReserve(r)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-950'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{r.name}</span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isNature
                              ? 'bg-emerald-900/60 text-emerald-300 border-emerald-600/40'
                              : 'bg-teal-900/50 text-teal-300 border-teal-700/40'
                          }`}
                        >
                          {r.designation}
                        </span>
                        {r.iucn_category && r.iucn_category !== 'Not Reported' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                            IUCN {r.iucn_category}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          WDPA: <span className="font-mono text-slate-300">{r.wdpa_id}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{r.sub_location || 'Tanzania'}</span>
                        </div>
                        <div>
                          Area:{' '}
                          <span className="font-bold text-slate-200">
                            {r.area_ha?.toLocaleString(undefined, { maximumFractionDigits: 1 })} ha
                          </span>{' '}
                          <span className="text-[10px] text-slate-500">
                            ({(r.area_ha / 100).toFixed(1)} km²)
                          </span>
                        </div>
                        {r.status_year && (
                          <div>
                            Gazetted:{' '}
                            <span className="font-semibold text-slate-300">{r.status_year}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          Auth: {r.management_authority || 'TFS'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectReserve(r);
                        }}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        Land Cover
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportToMonitoring(r.id);
                        }}
                        disabled={importingId === r.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md shadow-emerald-950 transition flex items-center gap-1"
                        title="Convert into monitored parcel in PostGIS database"
                      >
                        {importingId === r.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Monitor</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white transition font-medium"
                >
                  &larr; Previous
                </button>
                <span>
                  Page <span className="font-bold text-white">{page + 1}</span> of{' '}
                  <span className="font-bold text-white">
                    {Math.ceil(totalCount / pageSize)}
                  </span>
                </span>
                <button
                  disabled={(page + 1) * pageSize >= totalCount}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white transition font-medium"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Reserve Detail & Land Cover Analysis Panel */}
          <div className="w-full md:w-[420px] bg-slate-950/70 p-5 overflow-y-auto shrink-0 flex flex-col justify-between">
            {selectedReserve ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                      {selectedReserve.designation}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">WDPA #{selectedReserve.wdpa_id}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white">{selectedReserve.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authority: {selectedReserve.management_authority || 'Tanzania Forest Services (TFS)'}
                  </p>
                </div>

                {/* Spatial Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Total Area</span>
                    <span className="font-bold text-white">
                      {selectedReserve.area_ha?.toLocaleString()} ha
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ({(selectedReserve.area_ha / 100).toFixed(1)} km²)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Centroid</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {selectedReserve.centroid?.lat?.toFixed(3)}°, {selectedReserve.centroid?.lon?.toFixed(3)}°
                    </span>
                    <span className="text-[10px] text-slate-500 block">EPSG:4326 PostGIS</span>
                  </div>
                </div>

                {/* Land Cover Classification & Disturbance Engine */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>5-Class Land Cover Dynamics (KijaniMap)</span>
                    </h4>
                    {loadingLandCover && (
                      <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                    )}
                  </div>

                  {landCoverData ? (
                    <div className="space-y-3">
                      {/* Canopy Cover Bar */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Forest Canopy Density</span>
                          <span className="font-bold text-emerald-400">
                            {landCoverData.land_cover_summary?.canopy_cover_pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${landCoverData.land_cover_summary?.canopy_cover_pct}%` }}
                          />
                        </div>
                      </div>

                      {/* 5-Class Breakdown */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-300 block">LULC Class Distribution</span>
                        {Object.entries(landCoverData.land_cover_summary?.class_distribution_ha || {}).map(
                          ([className, ha]: [string, any]) => {
                            const pct = (ha / selectedReserve.area_ha) * 100;
                            return (
                              <div key={className} className="space-y-0.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-300 capitalize text-[11px]">
                                    {className.replace(/_/g, ' ')}
                                  </span>
                                  <span className="font-mono text-slate-400 text-[11px]">
                                    {ha.toLocaleString()} ha ({pct.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      className.includes('dense')
                                        ? 'bg-emerald-500'
                                        : className.includes('woodland')
                                        ? 'bg-teal-500'
                                        : className.includes('shrub')
                                        ? 'bg-amber-500'
                                        : className.includes('water')
                                        ? 'bg-cyan-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>

                      {/* Vegetation Health & Biomass */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                            <Leaf className="w-3 h-3 text-emerald-400" /> Sentinel-2 NDVI
                          </span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {landCoverData.vegetation_health?.mean_ndvi?.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            EVI: {landCoverData.vegetation_health?.mean_evi?.toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                            <Activity className="w-3 h-3 text-teal-400" /> Total Biomass
                          </span>
                          <span className="font-bold text-teal-300 text-sm">
                            {(landCoverData.biomass_carbon_estimate?.estimated_agb_tonnes / 1000000).toFixed(2)}M t
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Carbon: {(landCoverData.biomass_carbon_estimate?.estimated_co2e_tonnes / 1000000).toFixed(2)}M t CO2e
                          </span>
                        </div>
                      </div>

                      {/* Deforestation Alert Status */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {landCoverData.deforestation_disturbances?.detected_count > 0 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          )}
                          <div>
                            <span className="font-bold text-white block">
                              {landCoverData.deforestation_disturbances?.detected_count > 0
                                ? `${landCoverData.deforestation_disturbances.detected_count} Disturbance Alerts`
                                : 'No Active Disturbances'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Sentinel-1 SAR Radar & Landsat Alert Watch
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            landCoverData.deforestation_disturbances?.status === 'DISTURBANCE_DETECTED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {landCoverData.deforestation_disturbances?.status || 'HEALTHY'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      Loading Land Cover inference model...
                    </div>
                  )}
                </div>

                {/* Action CTA: 1-Click Import to Monitoring */}
                <div className="pt-3">
                  <button
                    onClick={() => handleImportToMonitoring(selectedReserve.id)}
                    disabled={importingId === selectedReserve.id}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition"
                  >
                    {importingId === selectedReserve.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Import to Continuous Land Cover Monitoring</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-1.5">
                    Generates active PostGIS geometry & links Sentinel/Planet satellites to this reserve.
                  </p>
                </div>
              </div>
            ) : (
              <div className="my-auto text-center text-slate-500 space-y-3">
                <Compass className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">Select any Forest Reserve on the left</p>
                <p className="text-[11px] text-slate-600 max-w-[260px] mx-auto">
                  Analyze 5-class LULC dynamics, forest canopy cover %, vegetation health indices, and deforestation alerts in real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

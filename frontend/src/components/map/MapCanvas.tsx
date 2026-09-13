import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Layers, Split, Eye, EyeOff, ZoomIn, ZoomOut, Compass, Map, Globe, Sliders } from 'lucide-react';
import { Parcel } from '../../types';

interface MapCanvasProps {
  parcel: Parcel | null;
  crownGeojson?: any;
  activeLayer?: string;
}

export type BaseMapType = 'satellite' | 'osm_standard' | 'hybrid' | 'opentopo';

export const BASEMAP_CONFIGS: Record<BaseMapType, {
  name: string;
  shortLabel: string;
  badge: string;
  tiles: string[];
  attribution: string;
  maxzoom: number;
}> = {
  satellite: {
    name: 'Satellite & Aerial Imagery',
    shortLabel: 'Satellite & Aerial',
    badge: 'ESRI / Maxar',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, USDA, USGS',
    maxzoom: 19,
  },
  osm_standard: {
    name: 'Standard (OSM Carto)',
    shortLabel: 'Standard (OSM Carto)',
    badge: 'OSM Carto',
    tiles: [
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    ],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxzoom: 19,
  },
  hybrid: {
    name: 'Satellite Hybrid (Aerial + OSM Labels)',
    shortLabel: 'Satellite Hybrid',
    badge: 'Aerial + Labels',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: 'Imagery &copy; Esri | Labels &copy; OpenStreetMap',
    maxzoom: 19,
  },
  opentopo: {
    name: 'Topographic Relief (OpenTopoMap)',
    shortLabel: 'OpenTopoMap',
    badge: 'Contours',
    tiles: [
      'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    attribution: 'Map: &copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (&copy; OSM)',
    maxzoom: 17,
  },
};

export const MapCanvas: React.FC<MapCanvasProps> = ({
  parcel,
  crownGeojson,
  activeLayer = 'rgb',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  
  // Basemap & Analytic Layer state
  const [baseMap, setBaseMap] = useState<BaseMapType>('satellite');
  const [currentLayer, setCurrentLayer] = useState<string>(activeLayer);
  const [analyticVisible, setAnalyticVisible] = useState<boolean>(true);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.70);
  const [showOpacityControl, setShowOpacityControl] = useState<boolean>(false);
  const [isSplitScreen, setIsSplitScreen] = useState<boolean>(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize MapLibre GL Map with OpenStreetMap and Satellite multi-sources
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          basemap_satellite: {
            type: 'raster',
            tiles: BASEMAP_CONFIGS.satellite.tiles,
            tileSize: 256,
            maxzoom: 19,
          },
          basemap_osm: {
            type: 'raster',
            tiles: BASEMAP_CONFIGS.osm_standard.tiles,
            tileSize: 256,
            maxzoom: 19,
          },
          basemap_opentopo: {
            type: 'raster',
            tiles: BASEMAP_CONFIGS.opentopo.tiles,
            tileSize: 256,
            maxzoom: 17,
          },
          basemap_labels: {
            type: 'raster',
            tiles: [
              'https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 19,
          },
          kijani_tiles: {
            type: 'raster',
            tiles: [`/api/tiles/preview/${currentLayer}/{z}/{x}/{y}.png`],
            tileSize: 256,
          },
        },
        layers: [
          // 1. Satellite & Aerial Imagery Basemap
          {
            id: 'layer-satellite',
            type: 'raster',
            source: 'basemap_satellite',
            layout: {
              visibility: (baseMap === 'satellite' || baseMap === 'hybrid') ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 1.0,
              'raster-saturation': 0.05,
              'raster-contrast': 0.05,
            },
          },
          // 2. Standard (OSM Carto) Basemap
          {
            id: 'layer-osm',
            type: 'raster',
            source: 'basemap_osm',
            layout: {
              visibility: baseMap === 'osm_standard' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 1.0,
              'raster-saturation': 0.0,
            },
          },
          // 3. OpenTopoMap Topographic Basemap
          {
            id: 'layer-opentopo',
            type: 'raster',
            source: 'basemap_opentopo',
            layout: {
              visibility: baseMap === 'opentopo' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 1.0,
            },
          },
          // 4. Kijani Dynamic Earth Observation Analytical Raster Layer
          {
            id: 'kijani-analytic-layer',
            type: 'raster',
            source: 'kijani_tiles',
            layout: {
              visibility: analyticVisible ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': overlayOpacity,
            },
          },
          // 5. Hybrid Overlay: OSM Reference Labels & Roads
          {
            id: 'layer-labels',
            type: 'raster',
            source: 'basemap_labels',
            layout: {
              visibility: baseMap === 'hybrid' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 0.95,
            },
          },
        ],
      },
      center: [37.62, -6.84], // Default Morogoro / Tanzania coordinates
      zoom: 12,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Add parcel boundary layer
      if (parcel?.geojson_geometry) {
        updateParcelGeometry(map, parcel.geojson_geometry);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update basemap layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    map.setLayoutProperty(
      'layer-satellite',
      'visibility',
      (baseMap === 'satellite' || baseMap === 'hybrid') ? 'visible' : 'none'
    );
    map.setLayoutProperty(
      'layer-osm',
      'visibility',
      baseMap === 'osm_standard' ? 'visible' : 'none'
    );
    map.setLayoutProperty(
      'layer-opentopo',
      'visibility',
      baseMap === 'opentopo' ? 'visible' : 'none'
    );
    map.setLayoutProperty(
      'layer-labels',
      'visibility',
      baseMap === 'hybrid' ? 'visible' : 'none'
    );
  }, [baseMap]);

  // Update dynamic raster layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('kijani_tiles') as any;
    if (source) {
      map.removeLayer('kijani-analytic-layer');
      map.removeSource('kijani_tiles');

      map.addSource('kijani_tiles', {
        type: 'raster',
        tiles: [`/api/tiles/preview/${currentLayer}/{z}/{x}/{y}.png`],
        tileSize: 256,
      });

      // Insert right before labels or parcel layers
      const beforeLayer = map.getLayer('layer-labels') ? 'layer-labels' : undefined;

      map.addLayer({
        id: 'kijani-analytic-layer',
        type: 'raster',
        source: 'kijani_tiles',
        layout: {
          visibility: analyticVisible ? 'visible' : 'none',
        },
        paint: {
          'raster-opacity': overlayOpacity,
        },
      }, beforeLayer);
    }
  }, [currentLayer]);

  // Update analytic overlay opacity & visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('kijani-analytic-layer')) {
      map.setLayoutProperty('kijani-analytic-layer', 'visibility', analyticVisible ? 'visible' : 'none');
      map.setPaintProperty('kijani-analytic-layer', 'raster-opacity', overlayOpacity);
    }
  }, [overlayOpacity, analyticVisible]);

  // Center on parcel when changed
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !parcel?.geojson_geometry) return;

    updateParcelGeometry(map, parcel.geojson_geometry);
  }, [parcel]);

  // Add/Update Tree Crowns Vector Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !crownGeojson) return;

    if (map.getSource('crowns_source')) {
      (map.getSource('crowns_source') as maplibregl.GeoJSONSource).setData(crownGeojson);
    } else {
      map.addSource('crowns_source', {
        type: 'geojson',
        data: crownGeojson,
      });

      map.addLayer({
        id: 'crowns_points',
        type: 'circle',
        source: 'crowns_source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 6],
          'circle-color': '#10b981',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      });
    }
  }, [crownGeojson]);

  const updateParcelGeometry = (map: maplibregl.Map, geom: any) => {
    if (!map.isStyleLoaded()) return;

    if (map.getSource('parcel_boundary')) {
      (map.getSource('parcel_boundary') as maplibregl.GeoJSONSource).setData(geom);
    } else {
      map.addSource('parcel_boundary', {
        type: 'geojson',
        data: geom,
      });

      // Fill layer
      map.addLayer({
        id: 'parcel_fill',
        type: 'fill',
        source: 'parcel_boundary',
        paint: {
          'fill-color': '#059669',
          'fill-opacity': 0.22,
        },
      });

      // Stroke outline layer
      map.addLayer({
        id: 'parcel_outline',
        type: 'line',
        source: 'parcel_boundary',
        paint: {
          'line-color': '#10b981',
          'line-width': 2.5,
        },
      });
    }

    // Compute bounding box to zoom to parcel
    try {
      const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
      const bounds = coords.reduce(
        (b: any, coord: any) => b.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 50, duration: 1000 });
    } catch (e) {
      console.warn('Could not fit bounds to parcel geometry', e);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* MapLibre WebGL DOM Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* TOP CONTROL BAR: Analytic Layer & Base Map Selector */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[calc(100vw-5rem)]">
        {/* Row 1: Analytic Overlay Layers */}
        <div className="glass-panel rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 shadow-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300 px-2 py-0.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analysis:</span>
          </div>

          {[
            { id: 'rgb', label: 'True Color (RGB)', color: 'bg-emerald-600' },
            { id: 'ndvi', label: 'Vegetation (NDVI)', color: 'bg-lime-600' },
            { id: 'water', label: 'Water (MNDWI / TSS)', color: 'bg-sky-600' },
            { id: 'sar', label: 'Sentinel-1 SAR Radar', color: 'bg-amber-600' },
            { id: 'irrigation_stress', label: 'Irrigation Stress', color: 'bg-rose-600' },
          ].map((layer) => (
            <button
              key={layer.id}
              onClick={() => setCurrentLayer(layer.id)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                currentLayer === layer.id
                  ? `${layer.color} text-white shadow-md ring-1 ring-white/30`
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {layer.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Opacity & Visibility Toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAnalyticVisible(!analyticVisible)}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                analyticVisible ? 'bg-slate-800 text-emerald-300 hover:bg-slate-700' : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
              }`}
              title={analyticVisible ? 'Hide Analysis Overlay' : 'Show Analysis Overlay'}
            >
              {analyticVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowOpacityControl(!showOpacityControl)}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                showOpacityControl ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Adjust Overlay Opacity"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Split Screen Toggle */}
          <button
            onClick={() => setIsSplitScreen(!isSplitScreen)}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
              isSplitScreen ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Split Screen Comparison"
          >
            <Split className="w-3.5 h-3.5" />
            <span>{isSplitScreen ? 'Split Active' : 'Split'}</span>
          </button>
        </div>

        {/* Optional Opacity Slider Popover */}
        {showOpacityControl && (
          <div className="glass-panel rounded-xl p-3 shadow-2xl border border-slate-700 bg-slate-900/95 flex items-center gap-3 w-64 animate-fade-in">
            <span className="text-[11px] font-semibold text-slate-300">Overlay Opacity:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-emerald-400 w-8 text-right">
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        )}

        {/* Row 2: Free OpenStreetMap & Satellite Background Maps */}
        <div className="glass-panel rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 shadow-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300 px-2 py-0.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Base Map:</span>
          </div>

          {[
            { id: 'satellite', label: 'Satellite & Aerial', badge: 'High-Res Aerial', desc: 'World Imagery' },
            { id: 'osm_standard', label: 'Standard (OSM Carto)', badge: 'OpenStreetMap', desc: 'OSM Standard' },
            { id: 'hybrid', label: 'Satellite Hybrid', badge: 'Aerial + Labels', desc: 'Satellite + OSM Roads/Labels' },
            { id: 'opentopo', label: 'OpenTopoMap', badge: 'Topographic', desc: 'Relief & Contours' },
          ].map((bm) => (
            <button
              key={bm.id}
              onClick={() => setBaseMap(bm.id as BaseMapType)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                baseMap === bm.id
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-white/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
              title={bm.desc}
            >
              <span>{bm.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                baseMap === bm.id ? 'bg-blue-800 text-blue-100' : 'bg-slate-900 text-slate-400'
              }`}>
                {bm.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Zoom & Orientation Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg glass-panel hover:bg-slate-800 text-slate-200 flex items-center justify-center transition shadow-lg border border-slate-700/80 bg-slate-900/90"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg glass-panel hover:bg-slate-800 text-slate-200 flex items-center justify-center transition shadow-lg border border-slate-700/80 bg-slate-900/90"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.resetNorthPitch()}
          className="w-8 h-8 rounded-lg glass-panel hover:bg-slate-800 text-slate-200 flex items-center justify-center transition shadow-lg border border-slate-700/80 bg-slate-900/90"
          title="Reset North"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Parcel Coordinate & Scale Legend Footer */}
      {parcel && (
        <div className="absolute bottom-4 left-4 z-10 glass-panel rounded-lg px-3 py-1.5 text-[11px] text-slate-300 flex items-center gap-3 border border-slate-700/80 bg-slate-900/90 backdrop-blur-md">
          <span className="font-bold text-white">{parcel.name}</span>
          <span className="text-slate-400">•</span>
          <span>{parcel.area_ha.toFixed(1)} ha</span>
          <span className="text-slate-400">•</span>
          <span className="font-mono text-emerald-400">EPSG:4326</span>
          {crownGeojson && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                {crownGeojson.features?.length || 0} Crowns Rendered
              </span>
            </>
          )}
        </div>
      )}

      {/* OpenStreetMap & Satellite Attributions */}
      <div className="absolute bottom-2 right-3 z-10 text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/80 backdrop-blur-sm pointer-events-auto">
        <span>Base: </span>
        <span className="text-slate-300 font-medium">{BASEMAP_CONFIGS[baseMap].name}</span>
        <span className="text-slate-500 mx-1">|</span>
        <span dangerouslySetInnerHTML={{ __html: BASEMAP_CONFIGS[baseMap].attribution }} />
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Upload, X, FileUp, CheckCircle, AlertCircle, ExternalLink, Download, MapPin } from 'lucide-react';
import { api } from '../../api/client';
import { Parcel } from '../../types';

export const NBS_OFFICIAL_SHAPEFILE_URL = "https://www.nbs.go.tz/uploads/statistics/documents/en-1714652282-TANZANIA_2022PHC_WARD_SHAPEFILES.zip";

const NBS_WARDS = [
  {
    name: 'Mindu',
    label: 'Mindu Ward (Morogoro Urban — Mindu Dam Reservoir)',
    region: 'Morogoro',
    ecozone: 'EASTERN_ARC_MONTANE',
    category: 'water_body',
    cropType: 'maize',
    coords: [[[37.585, -6.835], [37.620, -6.835], [37.620, -6.865], [37.585, -6.865], [37.585, -6.835]]],
  },
  {
    name: 'Mazimbu',
    label: 'Mazimbu Ward (Morogoro Urban — Sokoine Ag Research Belt)',
    region: 'Morogoro',
    ecozone: 'MIOMBO',
    category: 'agriculture',
    cropType: 'maize',
    coords: [[[37.630, -6.800], [37.665, -6.800], [37.665, -6.830], [37.630, -6.830], [37.630, -6.800]]],
  },
  {
    name: 'Mlandizi',
    label: 'Mlandizi Ward (Kibaha Rural, Pwani — Lower Ruvu Irrigation)',
    region: 'Pwani',
    ecozone: 'COASTAL_FOREST',
    category: 'agriculture',
    cropType: 'maize',
    coords: [[[38.710, -6.690], [38.740, -6.690], [38.740, -6.720], [38.710, -6.720], [38.710, -6.690]]],
  },
  {
    name: 'Kidatu',
    label: 'Kidatu Ward (Kilombero, Morogoro — Great Ruaha Sugarcane)',
    region: 'Morogoro',
    ecozone: 'FLOODPLAIN_ALLUVIAL',
    category: 'agriculture',
    cropType: 'sugarcane',
    coords: [[[36.940, -7.670], [36.980, -7.670], [36.980, -7.710], [36.940, -7.710], [36.940, -7.670]]],
  },
  {
    name: 'Kisarawe',
    label: 'Kisarawe Ward (Kisarawe, Pwani — Pugu Forest Corridor)',
    region: 'Pwani',
    ecozone: 'MIOMBO',
    category: 'restoration',
    cropType: 'maize',
    coords: [[[39.040, -6.900], [39.075, -6.900], [39.075, -6.935], [39.040, -6.935], [39.040, -6.900]]],
  },
  {
    name: 'Lushoto',
    label: 'Lushoto Ward (Lushoto, Tanga — Usambara Montane Cloud Forest)',
    region: 'Tanga',
    ecozone: 'EASTERN_ARC_MONTANE',
    category: 'forest',
    cropType: 'tea',
    coords: [[[38.270, -4.770], [38.310, -4.770], [38.310, -4.810], [38.270, -4.810], [38.270, -4.770]]],
  },
  {
    name: 'Kahe',
    label: 'Kahe Ward (Moshi Rural, Kilimanjaro — Pangani Agroforestry)',
    region: 'Kilimanjaro',
    ecozone: 'SAVANNAH',
    category: 'agriculture',
    cropType: 'coffee',
    coords: [[[37.420, -3.480], [37.460, -3.480], [37.460, -3.520], [37.420, -3.520], [37.420, -3.480]]],
  },
  {
    name: 'Kondoa Mjini',
    label: 'Kondoa Mjini (Kondoa, Dodoma — Semi-Arid Soil Conservation)',
    region: 'Dodoma',
    ecozone: 'SEMI_ARID',
    category: 'grassland',
    cropType: 'sunflower',
    coords: [[[35.770, -4.890], [35.810, -4.890], [35.810, -4.930], [35.770, -4.930], [35.770, -4.890]]],
  },
];

interface DropzoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParcelCreated: (parcel: Parcel) => void;
}

export const DropzoneModal: React.FC<DropzoneModalProps> = ({ isOpen, onClose, onParcelCreated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedNbsWard, setSelectedNbsWard] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('agriculture');
  const [cropType, setCropType] = useState<string>('maize');
  const [irrigationType, setIrrigationType] = useState<string>('DRIP');
  const [ecozone, setEcozone] = useState<string>('MIOMBO');
  const [region, setRegion] = useState<string>('Morogoro');
  const [soilMode, setSoilMode] = useState<'preset' | 'custom'>('preset');
  const [soilPreset, setSoilPreset] = useState<string>('sandy_clay_loam');
  const [customSoil, setCustomSoil] = useState({
    texture_class: 'Custom Loamy Soil',
    sand_pct: 50.0,
    clay_pct: 25.0,
    field_capacity: 0.28,
    wilting_point: 0.14,
    rooting_depth_m: 1.0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectNbsWard = (wardName: string) => {
    setSelectedNbsWard(wardName);
    const ward = NBS_WARDS.find((w) => w.name === wardName);
    if (ward) {
      setName(`${ward.name} Ward (${ward.region})`);
      setRegion(ward.region);
      setCategory(ward.category);
      setEcozone(ward.ecozone);
      setCropType(ward.cropType);
      setFile(null); // Clear custom file to use official ward polygon
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a parcel or scheme name.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('crop_type', cropType);
    formData.append('irrigation_system_type', irrigationType);
    formData.append('irrigation_efficiency', irrigationType === 'DRIP' ? '0.90' : (irrigationType === 'SPRINKLER' ? '0.75' : '0.55'));
    formData.append('ecozone', ecozone);
    formData.append('region', region);

    // Soil Profile Parameters (Predefined vs Custom)
    if (soilMode === 'preset') {
      formData.append('soil_profile_preset', soilPreset);
    } else {
      formData.append('soil_texture_class', customSoil.texture_class);
      formData.append('soil_sand_pct', customSoil.sand_pct.toString());
      formData.append('soil_clay_pct', customSoil.clay_pct.toString());
      formData.append('soil_field_capacity', customSoil.field_capacity.toString());
      formData.append('soil_wilting_point', customSoil.wilting_point.toString());
      formData.append('soil_rooting_depth_m', customSoil.rooting_depth_m.toString());
    }

    if (file) {
      formData.append('file', file);
    } else if (selectedNbsWard) {
      const ward = NBS_WARDS.find((w) => w.name === selectedNbsWard);
      if (ward) {
        formData.append('geojson_data', JSON.stringify({
          type: 'Polygon',
          coordinates: ward.coords,
        }));
      }
    } else {
      // Default sample polygon for immediate testing if no file selected
      const defaultGeojson = JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [37.60, -6.82],
            [37.62, -6.82],
            [37.62, -6.84],
            [37.60, -6.84],
            [37.60, -6.82],
          ],
        ],
      });
      formData.append('geojson_data', defaultGeojson);
    }

    try {
      const created = await api.uploadParcel(formData);
      onParcelCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload boundary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-extrabold text-white">Import Geospatial Boundary</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drag & Drop File Zone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-5 text-center cursor-pointer transition bg-slate-800/40 relative">
            <input
              type="file"
              accept=".zip,.kml,.kmz,.csv,.geojson,.json"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                if (e.target.files?.[0]) setSelectedNbsWard('');
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            {file ? (
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Selected: {file.name}</span>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-200">
                  Drop ESRI Shapefile (.zip), KMZ/KML, CSV, or GeoJSON
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Or select an official 2022 PHC Tanzanian ward below
                </p>
              </div>
            )}
          </div>

          {/* Official NBS Tanzania 2022 Census Ward Shapefiles Reference & Quick Select */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Official Tanzania Census Wards (NBS 2022)</span>
              </div>
              <a
                href={NBS_OFFICIAL_SHAPEFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full transition"
                title="Download full 2022 Census Ward Shapefiles ZIP (~10MB) from NBS portal"
              >
                <Download className="w-3 h-3" />
                <span>Download NBS Shapefile (.zip)</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                1-Click Select Official Ward (Kata) Boundary:
              </label>
              <select
                value={selectedNbsWard}
                onChange={(e) => handleSelectNbsWard(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- Or choose custom upload above --</option>
                {NBS_WARDS.map((w) => (
                  <option key={w.name} value={w.name}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Parcel / Scheme Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kilosa Maize Farm"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none mt-1"
              >
                <option value="agriculture">Agriculture / Cropland</option>
                <option value="water_body">Inland Water / Reservoir</option>
                <option value="forest">Forestry / Woodland</option>
                <option value="restoration">Restoration / Afforestation</option>
                <option value="wetland">Wetland / Basin</option>
                <option value="grassland">Grassland / Savannah</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Tanzanian Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none mt-1"
              >
                <option value="Morogoro">Morogoro</option>
                <option value="Pwani">Pwani (Coast)</option>
                <option value="Tanga">Tanga</option>
                <option value="Kilimanjaro">Kilimanjaro</option>
                <option value="Arusha">Arusha</option>
                <option value="Iringa">Iringa</option>
                <option value="Mbeya">Mbeya</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Eco-Zone Allometric</label>
              <select
                value={ecozone}
                onChange={(e) => setEcozone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none mt-1"
              >
                <option value="MIOMBO">Miombo Woodlands</option>
                <option value="EASTERN_ARC_MONTANE">Eastern Arc & Montane</option>
                <option value="COASTAL_MANGROVE">Coastal & Mangrove</option>
                <option value="DRY_SAVANNAH_AGRO">Dry Savannah / Agroforestry</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Irrigation System</label>
              <select
                value={irrigationType}
                onChange={(e) => setIrrigationType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none mt-1"
              >
                <option value="DRIP">Drip (90% Eff)</option>
                <option value="SPRINKLER">Sprinkler (75% Eff)</option>
                <option value="PIVOT">Center Pivot (82% Eff)</option>
                <option value="FURROW">Furrow / Basin (55% Eff)</option>
              </select>
            </div>
          </div>

          {/* Soil Profile Selection & Hydraulic Properties */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white block">Soil Profile & Moisture Buffer</label>
                <span className="text-[11px] text-slate-400">Calibrate Field Capacity & Root-Zone Storage</span>
              </div>
              <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setSoilMode('preset')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition ${
                    soilMode === 'preset' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Predefined
                </button>
                <button
                  type="button"
                  onClick={() => setSoilMode('custom')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition ${
                    soilMode === 'custom' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {soilMode === 'preset' ? (
              <div>
                <select
                  value={soilPreset}
                  onChange={(e) => setSoilPreset(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="sandy_clay_loam">Sandy Clay Loam (Miombo / Morogoro — FC: 28%, WP: 14%, AWC: 140 mm/m)</option>
                  <option value="clay_vertisol">Clay / Vertisol Mbuga (Kilombero / Rufiji — FC: 40%, WP: 22%, AWC: 180 mm/m)</option>
                  <option value="sandy_loam">Sandy Loam (Dodoma Semi-Arid — FC: 20%, WP: 9%, AWC: 110 mm/m)</option>
                  <option value="volcanic_loam">Volcanic Loam (Kilimanjaro / Meru — FC: 32%, WP: 15%, AWC: 170 mm/m)</option>
                  <option value="silty_clay_loam">Silty Clay Loam (Floodplain Alluvial — FC: 35%, WP: 18%, AWC: 170 mm/m)</option>
                  <option value="loamy_sand">Loamy Sand (Coastal Pwani / Bagamoyo — FC: 14%, WP: 6%, AWC: 80 mm/m)</option>
                  <option value="red_ferralsol">Red Sandy Clay / Ferralsol (Southern Highlands — FC: 30%, WP: 16%, AWC: 140 mm/m)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Texture Class Name</label>
                  <input
                    type="text"
                    value={customSoil.texture_class}
                    onChange={(e) => setCustomSoil({ ...customSoil, texture_class: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Sand %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customSoil.sand_pct}
                      onChange={(e) => setCustomSoil({ ...customSoil, sand_pct: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Clay %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={customSoil.clay_pct}
                      onChange={(e) => setCustomSoil({ ...customSoil, clay_pct: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block" title="Field Capacity vol fraction (0.10 - 0.55)">FC (m³/m³)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="0.60"
                      value={customSoil.field_capacity}
                      onChange={(e) => setCustomSoil({ ...customSoil, field_capacity: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block" title="Permanent Wilting Point vol fraction (0.04 - 0.35)">PWP (m³/m³)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.02"
                      max="0.40"
                      value={customSoil.wilting_point}
                      onChange={(e) => setCustomSoil({ ...customSoil, wilting_point: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div>
                    <span>Root Depth: </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.2"
                      max="3.0"
                      value={customSoil.rooting_depth_m}
                      onChange={(e) => setCustomSoil({ ...customSoil, rooting_depth_m: parseFloat(e.target.value) || 1.0 })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-center"
                    />
                    <span> m</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">
                    AWC: {Math.max(0, Math.round((customSoil.field_capacity - customSoil.wilting_point) * 1000))} mm/m
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-bold px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-700/20"
            >
              {loading ? 'Validating Topology & Ingesting...' : 'Ingest Boundary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

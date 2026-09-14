# KijaniAI: Enterprise Geospatial & Hydrological Intelligence Platform
### AI-Powered Land, Ecosystem, Water & Irrigation Intelligence for Tanzania and Sub-Saharan Africa

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostGIS](https://img.shields.io/badge/Spatial_DB-PostgreSQL_16_+_PostGIS_3.4-336791?logo=postgresql&logoColor=white)](https://postgis.net)
[![Celery](https://img.shields.io/badge/Task_Queue-Celery_5.3_+_Redis_7-37814A?logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![Docker](https://img.shields.io/badge/Deployment-Docker_Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-Proprietary_Enterprise-blue)](#)

---

## 1. Executive Summary

**KijaniAI** is an enterprise-grade, containerized geospatial intelligence platform delivering automated Earth observation analytics across forestry, agriculture, grasslands, wetlands, inland water bodies, and commercial irrigation schemes across Tanzania and Sub-Saharan Africa.

The platform fuses:
- **Multi-sensor optical satellite imagery** (Sentinel-2, PlanetScope, SkySat, Pléiades, WorldView).
- **Synthetic Aperture Radar (Sentinel-1 C-SAR)** for 100% all-weather, cloud-penetrating moisture tracking.
- **Deep learning individual tree crown detection** (**DeepForest** PyTorch RetinaNet).
- **Offline-first edge computer vision** (**KijaniSync** PWA with IndexedDB and on-device smartphone camera measurement).
- **Automated carbon credit MRV dossiers** (Verra VM0042 & Plan Vivo compliant with cryptographic SHA-256 signatures and QR verification).
- **Empirical reservoir water quality retrieval** calibrated for Tanzanian water bodies (**Mindu Dam, Morogoro**).
- **Satellite-driven hydrological irrigation decision engine** implementing **FAO-56 Penman-Monteith**, dynamic remote sensing $K_c$, 72-hour forecast rainfall gating, and decadal **Crop Water Requirements Index (CWRI)** failure forecasting.
- **Official Tanzania Administrative Boundaries** from the **National Bureau of Statistics (NBS) 2022 Population and Housing Census (PHC)**, with sub-millisecond point-in-polygon spatial inference.
- **Official Tanzania Forest Reserves layer**: 696 gazetted Tanzania Forestry Service (TFS) reserves (9.57M ha) loaded into PostGIS for reserve-level land cover monitoring.
- **MabadilikoAI multi-temporal change dynamics**: decadal (1–10 year) land cover transition analysis at monthly-to-annual intervals, with bilingual English/Kiswahili AI-generated narrative explanations of *why* land changed.
- **Dual Operational System Modes** (Testing Mode for photorealistic investor/donor demos vs Production Mode for operational AI models).
- **Bilingual English/Kiswahili AI Copilot** powered by local **Gemma 4** (Ollama).
- **Behavioral UX retention telemetry** using `rrweb` session replay and AI-driven win-back email automation.
- **Automated email notifications**: background Celery workers dispatch branded HTML emails (via SMTP relay) the moment a long-running imagery order, MRV certificate, or MabadilikoAI analysis job finishes.

---

## 2. System Architecture

```
                                +-------------------------------------------+
                                |        React 18 + Vite + Tailwind         |
                                |       MapLibre GL + rrweb + Dexie         |
                                +---------------------+---------------------+
                                                      |
                                          HTTP / REST | WebSocket / XYZ Tiles
                                                      v
                                +-------------------------------------------+
                                |            FastAPI API Gateway            |
                                |        (Auth, Ingestion, Proxy, Docs)     |
                                +---------------------+---------------------+
                                                      |
                 +-------------------+----------------+-------------------+
                 |                   |                                    |
                 v                   v                                    v
+-------------------------+ +-----------------+             +-------------------------+
| PostgreSQL 16 + PostGIS | | Redis 7 Broker  |             |  MinIO Object Storage   |
| (Spatial Vectors, Wards,| | (Celery Queue & |             |  (GeoTIFF COGs, Vectors,|
|  Soil Profiles, Orders) | |  Shared Cache)  |             |   MRV PDFs, Replays)    |
+-------------------------+ +--------+--------+             +-------------------------+
                                     |
                                     v
                        +---------------------------+
                        |    Celery Async Worker    | <---> DeepForest / PyTorch / GDAL
                        | (Heavy Geospatial, SAR,   | <---> WeasyPrint Cryptographic PDF
                        |  Hydrology & Win-Back)    | <---> SMTP Relay (Branded HTML Email)
                        +-------------+-------------+
                                      |
                                      v
                        +---------------------------+
                        |     Ollama (Gemma 4)      |
                        | Bilingual English/Swahili |
                        +---------------------------+
```

---

## 3. Core Domain Intelligence Modules

### 💧 KijaniIrrigation (Hydrological Crop Water Scheduling)
* **Daily Reference Evapotranspiration ($\text{ET}_0$):** Full **FAO-56 Penman-Monteith** standard calculating net radiation, psychrometric constant, vapor pressure deficit, and wind speed:
  $$\text{ET}_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T + 273} u_2 (e_s - e_a)}{\Delta + \gamma(1 + 0.34 u_2)}$$
* **Dynamic Remote Sensing $K_c$:** Satellite NDVI transformation calibrated across phenological stages for Tanzanian priority crops: maize, rice, sugarcane, cotton, sunflower, beans, cassava, coffee, tea, and horticulture.
* **Dynamic Root-Zone Soil Water Balance:** Tracks root-zone storage ($S_t$) bounded between Field Capacity (FC) and Permanent Wilting Point (PWP):
  $$S_t = S_{t-1} + P_e + I - \text{ET}_a - R - D$$
  incorporating **USDA-SCS effective precipitation ($P_e$)** and Sentinel-1 SAR soil moisture assimilation.
* **Volumetric Pumping Hours Calculation:** Converts Net Irrigation Requirement (NIR) to Gross (GIR) based on system efficiency ($E_a$: Drip $90\%$, Sprinkler $75\%$, Pivot $82\%$, Furrow $55\%$) and calculates exact pump runtime duration:
  $$\text{Pumping Hours} = \frac{\text{GIR (mm)} \times 10 \times \text{Area (ha)}}{\text{Pump Flow Rate } Q \, (\text{m}^3/\text{h})}$$
* **72-Hour Forecast Gating:** Automatically postpones irrigation if OpenWeatherMap 72-hour forecast precipitation $\ge \text{NIR}$, conserving diesel fuel, electricity, and preventing fertilizer leaching.
* **Decadal CWRI & Crop Failure Early Warning:** 10-day step Crop Water Requirements Index:
  $$\text{CWRI} = \left( \frac{\sum_{t=1}^{10} \text{ET}_{a, t}}{\sum_{t=1}^{10} \text{ET}_{c, t}} \right) \times 100$$
  Scores below $50\%$ trigger immediate failure risk warnings predicting harvest yield penalties: $(1 - Y_a/Y_m) = K_y(1 - \text{ET}_a/\text{ET}_c)$.

### 🌊 KijaniMaji (Remote Sensing Reservoir Water Quality)
Calibrated against validated empirical regression models from **Mindu Reservoir (Morogoro, Tanzania)**:
* **MNDWI Dynamic Water Masking:** Calculates $\text{MNDWI} = \frac{\text{Green (B3)} - \text{SWIR (B11)}}{\text{Green (B3)} + \text{SWIR (B11)}}$. Automatically halts if ROI contains no water pixels ($\text{MNDWI} \le 0$).
* **Empirical Parameter Estimators ($x = \text{Spectral Index Value}$):**
  * **Total Suspended Solids (TSS):** $\text{TSS (mg/L)} = 0.8046x + 5.5561$ ($R^2 = 0.8046, \text{RMSE} = 2.25$)
  * **Turbidity:** $\text{Turbidity (NTU)} = 0.7214x + 16.255$ ($R^2 = 0.7214, \text{RMSE} = 2.04$)
  * **pH:** $\text{pH} = 0.7394x + 2.1609$ ($R^2 = 0.7394, \text{RMSE} = 0.086$)
  * **Electrical Conductivity (EC):** $\text{EC (mS/cm)} = 0.6835x + 0.0587$ ($R^2 = 0.6838, \text{RMSE} = 0.00068$)
* **FAO Drip Clogging Hazards:** Evaluates TSS physical clogging risk ($<50$ mg/L None, $50-100$ mg/L Moderate, $>100$ mg/L Severe) and alkaline precipitation ($>8.0$).
* **Point Extraction:** One-click CSV export of georeferenced parameter pixel coordinates.

### 🌲 KijaniCount (DeepForest Tree Crown Detection)
* High-resolution individual tree crown detection on sub-meter orthomosaics.
* **Operational AI (Production Mode):** Runs **DeepForest** (PyTorch RetinaNet with ResNet50 backbone) to segment individual tree crown bounding boxes and extract crown centroids.
* **Calibrated Simulation (Testing Mode):** Generates boundary-constrained realistic tree crowns for fast demonstration without GPU costs.
* Outputs tree count, density ($\text{trees/ha}$), crown surface area distributions ($\text{m}^2$), crown cover percentage, and plantation regularity vs natural clustering.

### 📜 KijaniCarbon & Automated MRV Engine
* Translates tree crown diameter into Above-Ground Biomass (AGB) and Below-Ground Biomass (BGB) across East African eco-zones:
  * **Miombo Woodlands:** $\text{AGB}_i = 0.095 \times (\text{CD}_i)^{2.45}$, $R = 0.42$
  * **Eastern Arc & Montane Forests:** $\ln(\text{AGB}_i) = -2.187 + 0.916 \times \ln(\rho \times \text{CD}_i^2 \times H)$ ($\rho = 0.61 \text{ g/cm}^3$, $R = 0.24$)
  * **Coastal Forest & Mangroves:** $\text{AGB}_i = 0.251 \times \rho \times (\text{CD}_i)^{2.46}$ ($\rho = 0.68 \text{ g/cm}^3$, $R = 0.49 / 0.28$)
  * **Acacia-Commiphora Dry Savannah:** $\text{AGB}_i = 0.138 \times (\text{CD}_i)^{2.21}$, $R = 0.35$
* Computes gross and net tradable carbon credits ($\text{tCO}_2\text{e}$) applying a $15\%$ Verra VM0042 non-permanence risk buffer deduction.
* **WeasyPrint Cryptographic Audit Dossiers:** Generates tamper-proof PDF audit dossiers with SHA-256 boundary hashes, SHA-256 raster hashes, and embedded QR verification tokens linking to `/verify/{token}`.

### 📡 KijaniRadar (Sentinel-1 SAR Cloud-Penetrating Engine)
* Solves optical tropical cloud cover using C-band SAR Level-1 GRD backscatter ($\sigma^0_{\text{VV}}, \sigma^0_{\text{VH}}$ in dB) with Lee speckle filtering.
* Dual-Polarization Radar Vegetation Index: $\text{RVI} = \frac{4 \times \sigma^0_{\text{VH}}}{\sigma^0_{\text{VV}} + \sigma^0_{\text{VH}}}$.
* Continuous cloud-free surface soil moisture and flood extent delineation.

### 🕰️ MabadilikoAI (Multi-Temporal Land Cover Change Dynamics)
* Analyzes land cover transformation over a user-defined historical window of up to **10 years**, sampled at **monthly, bi-monthly, quarterly, bi-annual, or annual** intervals.
* Classifies every time step into 4 land cover classes — **Vegetation & Forest Cover**, **Water Sources & Wetlands**, **Built-Up Structures & Settlements**, and **Bare Soil & Degraded Ground** — and computes class-to-class transition matrices between the first and last observation.
* **Bilingual AI Narrative Explanations:** Auto-generates a plain-language English *and* Kiswahili summary identifying the likely drivers behind observed change (e.g. charcoal/agricultural pressure, peri-urban expansion, sedimentation, regeneration).
* **Two execution modes:**
  * **Synchronous (instant):** `GET /api/modules/mabadiliko/{parcel_id}/changes` or `POST /analyze-boundary` for fast, immediate results on registered parcels or ad-hoc boundaries.
  * **Asynchronous (long jobs):** `POST /jobs/submit` queues a background Celery task, returns a `job_id` immediately (HTTP 202), and the client polls `GET /jobs/{job_id}/status`. Supplying `notify_email` sends a bilingual HTML completion email automatically — see [§11 Automated Email Notifications](#11-automated-email-notifications).
* Frontend timeline scrubber replays the land cover evolution step-by-step with an animated class-composition chart and the AI explanation panel.

### 🌳 Official Tanzania Forest Reserves (TFS Gazetted Reserves)
* Ingests and persists **696 officially gazetted Tanzania Forestry Service (TFS) reserves** (~9,568,018 ha total) into PostGIS via `POST /api/forest-reserves/ingest`.
* Interactive map layer (toggle from the **Forest Reserves** button in the top navigation bar) renders reserve boundaries with area, category, and management status.
* **1-Click Monitoring Import:** `POST /api/forest-reserves/{reserve_id}/import-to-monitoring` promotes any gazetted reserve into a fully monitored KijaniAI parcel.
* **Per-Reserve Land Cover Endpoint:** `GET /api/forest-reserves/{reserve_id}/land-cover` surfaces encroachment and canopy-loss signals for a specific reserve.

### 🌿 KijaniHealth, 🛡️ KijaniWatch, 🌱 KijaniRestore, 🗺️ KijaniMap & 📱 KijaniSync
* **KijaniHealth:** Computes NDVI, EVI, SAVI ($L=0.5$), and NDWI mapped to Tanzanian *Masika* (March–May) and *Vuli* (October–December) calendars.
* **KijaniWatch:** NBR burn scars, deforestation early warnings, and forest boundary encroachment.
* **KijaniRestore:** Restoration cohort survival rates and canopy growth velocity.
* **KijaniMap:** 5-class fused optical/SAR LULC baseline classification.
* **KijaniSync:** PWA offline IndexedDB (Dexie.js) caching with on-device edge smartphone camera AI for trunk DBH estimation and species classification.

---

## 4. Multi-Sensor Satellite Ingestion & API Tiers

KijaniAI incorporates a 4-tier satellite ingestion engine configured in `.env` and manageable via the **Admin Hub**:

| Tier | Ground Resolution | Sensors / Constellations | Primary Providers & Ingestion APIs | Primary Capabilities |
|---|---|---|---|---|
| **Tier 1 (Public / Free)** | $10\text{m} - 30\text{m}$ | Sentinel-2 MSI, Sentinel-1 C-SAR, Landsat 8/9, CHIRPS Rainfall | **GEE** (Google Earth Engine), **Microsoft Planetary Computer STAC**, **CDSE** | Free COG streaming, server-side planetary reductions, cloud masking ($<15\%$). $0.00/ha. |
| **Tier 2 (Medium Resolution)** | $3\text{m} - 5\text{m}$ | PlanetScope SuperDove (8-band VNIR) | **Planet Orders API v2** with automated farm boundary clipping | High daily cadence, field-scale dynamic crop coefficients, in-season stress. $1.50/ha base. |
| **Tier 3 (Very High Resolution)** | $50\text{cm}$ | SkySat, Pléiades 1A/1B, SPOT 6/7 | **UP42 API v2** & **Airbus OneAtlas Living Library** | Commercial catalog querying, quotation, and tasking. Individual tree counting. $6.50/ha base. |
| **Tier 4 (Ultra VHR)** | $30\text{cm}$ | WorldView-3/4, Pléiades Neo | **Maxar Discovery API** & **UP42 Pléiades Neo Host** | Sub-meter canopy segmentation and precision tree crown detection. $14.00/ha base. |

$$\text{Acquisition Cost} = \max(\text{Parcel Area (ha)}, \text{Tier Min Hectares}) \times \text{Base Price/ha} \times (1 + \text{Commission Markup})$$

---

## 5. Official Tanzania Administrative Boundaries (NBS 2022 Census)

KijaniAI incorporates official administrative boundaries from the **National Bureau of Statistics (NBS Tanzania) / Ofisi ya Taifa ya Takwimu**:
* **Official Dataset:** Tanzania 2022 Population and Housing Census (PHC) Administrative Ward Shapefiles (`2022 PHC Sensa ya Watu na Makazi`).
* **Official Portal Download URL:** `https://www.nbs.go.tz/uploads/statistics/documents/en-1714652282-TANZANIA_2022PHC_WARD_SHAPEFILES.zip` (~10.4 MB ESRI Shapefile archive).
* **Database Persistence (`TanzaniaWard` model):** Stored in table `tanzania_wards` with precomputed bounding box indices (`bbox_min_lon`, `bbox_min_lat`, `bbox_max_lon`, `bbox_max_lat`) and centroids for sub-millisecond point-in-polygon spatial inference.
* **Physical Filesystem Storage:** Cached locally in `backend/data/shapefiles/tanzania_2022_wards/tanzania_wards_2022.geojson`.
* **Fast Spatial Inference Endpoint:** `GET /api/parcels/tanzania-nbs/infer-ward?lat={lat}&lon={lon}` resolves any GPS coordinate to its official ward, district, and region in $<1$ ms.
* **1-Click Frontend Selector:** Farmers and admins can import wards directly from the dropdown (e.g. *Mindu*, *Mlandizi*, *Kidatu*, *Lushoto*, *Kahe*, *Kisarawe*).

---

## 6. Soil Hydraulic Profiles & Custom Parameters

KijaniAI provides full flexibility for soil water modeling:
1. **Predefined Soil Presets:**
   - *Sandy Clay Loam (Default)* — Balanced retention for Morogoro & Pwani basins.
   - *Clay (Mbuga Soils)* — High water-holding capacity in Kilombero floodplains.
   - *Loam* — Optimum agricultural soils in Kilimanjaro & Usambara foothills.
   - *Sand* — Coastal plain rapid-drainage soils.
   - *Silt Loam* — Alluvial river basin deposits.
2. **Custom User Parameters:** Users can define exact sand %, clay %, Field Capacity ($\text{m}^3/\text{m}^3$), Permanent Wilting Point ($\text{m}^3/\text{m}^3$), and effective rooting depth ($m$).

---

## 7. Launching and Operation Guide

### Prerequisites
- **Docker & Docker Compose** (Recommended for production and containerized dev)
- **Node.js 18+ & npm** (For standalone frontend development)
- **Python 3.11+ & uv / pip** (For standalone backend development)
- **PostgreSQL 16 + PostGIS 3.4** (If running database outside Docker)

---

### Step 1: Environment Configuration (`.env`)

Copy the example configuration file:
```bash
cp .env.example .env
```

Edit `.env` to configure your credentials and providers. **KijaniAI intentionally avoids every well-known default port** (5432, 6379, 8000, 9000, etc.) so the stack never collides with other local dev projects, and ships with non-default service passwords out of the box:
```env
# Core Application & Security
SECRET_KEY=your-secure-production-secret-key-change-this

# Docker Compose Service Credentials & Host Ports (single source of truth —
# docker-compose.yml interpolates these ${VARS} directly; change the passwords
# before any shared or internet-reachable deployment)
POSTGRES_USER=kijani
POSTGRES_PASSWORD=change-this-postgres-password
POSTGRES_DB=kijani_db
POSTGRES_PORT=5442

REDIS_PASSWORD=change-this-redis-password
REDIS_PORT=6783

MINIO_ROOT_USER=kijanistorageadmin
MINIO_ROOT_PASSWORD=change-this-minio-password
MINIO_API_PORT=9012
MINIO_CONSOLE_PORT=9013

OLLAMA_PORT=11444
API_PORT=8012
FRONTEND_PORT=3012

DATABASE_URL=postgresql://kijani:change-this-postgres-password@localhost:5442/kijani_db
REDIS_URL=redis://:change-this-redis-password@localhost:6783/0
CELERY_BROKER_URL=redis://:change-this-redis-password@localhost:6783/0

# Object Storage (MinIO / S3)
STORAGE_ENDPOINT=http://localhost:9012
STORAGE_ACCESS_KEY=kijanistorageadmin
STORAGE_SECRET_KEY=change-this-minio-password

# Ollama Bilingual Copilot
OLLAMA_BASE_URL=http://localhost:11444
OLLAMA_MODEL=gemma4

# SMTP / Email Notifications (imagery orders, MRV certificates, MabadilikoAI jobs)
SMTP_HOST=smtp-relay.gmail.com
SMTP_PORT=587
SMTP_USER=your-relay-user@yourdomain.tz
SMTP_PASSWORD=your-smtp-app-password
SMTP_CRYPTO=tls
SMTP_FROM_EMAIL=noreply@yourdomain.tz
SMTP_FROM_NAME=KijaniAI Platform

# Free-Tier Provider (GEE, PLANETARY_COMPUTER, or CDSE)
FREE_TIER_PROVIDER=GEE
GEE_PROJECT_ID=your-gcp-project-id
GEE_SERVICE_ACCOUNT=your-gee-service-account@gserviceaccount.com
GEE_PRIVATE_KEY_JSON=

# CHIRPS Satellite Rainfall Dataset (UCSB CHG 0.05° resolution)
CHIRPS_DATASET_ID=UCSB-CHG/CHIRPS/DAILY

# OpenWeatherMap API (72h Forecast Gating & FAO-56 Penman-Monteith)
OPENWEATHERMAP_API_KEY=your-openweathermap-api-key
OPENWEATHERMAP_BASE_URL=https://api.openweathermap.org/data/2.5
OPENWEATHERMAP_GEOCODING_URL=https://api.openweathermap.org/geo/1.0
OPENWEATHERMAP_UNITS=metric

# Commercial Satellite APIs (Optional - Can also be supplied in Admin Hub)
PLANET_API_KEY=
UP42_PROJECT_ID=
UP42_API_KEY=
AIRBUS_API_KEY=
MAXAR_API_KEY=

# System Operational Mode ("TESTING" for demo simulation, "PRODUCTION" for operational AI)
SYSTEM_MODE=TESTING
DEEPFOREST_MODEL_PATH=
DEEPFOREST_CONFIDENCE_THRESHOLD=0.25

# Official Tanzania Administrative Shapefiles
TANZANIA_NBS_WARD_SHAPEFILES_URL=https://www.nbs.go.tz/uploads/statistics/documents/en-1714652282-TANZANIA_2022PHC_WARD_SHAPEFILES.zip
TANZANIA_SHAPEFILES_DIR=backend/data/shapefiles/tanzania_2022_wards
```

---

### Step 2: Single-Command Launch with Docker Compose

Spin up the complete ecosystem:
```bash
docker compose up --build
```

### Services & Endpoints Port Reference:
All host ports are deliberately non-default to avoid colliding with other local projects. Each is configurable via its `${VAR}` in `.env`.

| Service | URL / Port | Credentials / Notes |
|---|---|---|
| **Frontend Web App** | `http://localhost:3012` | React 18 + Vite + Tailwind + MapLibre GL (`FRONTEND_PORT`) |
| **API Gateway (FastAPI)** | `http://localhost:8012` | OpenAPI Swagger Docs at `http://localhost:8012/docs` (`API_PORT`) |
| **Spatial Database** | `localhost:5442` | PostgreSQL 16 + PostGIS 3.4 — db `kijani_db`, user/password from `POSTGRES_USER` / `POSTGRES_PASSWORD` (`POSTGRES_PORT`) |
| **Redis Broker** | `localhost:6783` | Celery Message Queue & Spatial Cache — password-protected via `REDIS_PASSWORD` (`REDIS_PORT`) |
| **MinIO Console** | `http://localhost:9013` | Object Storage Console — credentials from `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` (`MINIO_CONSOLE_PORT`) |
| **MinIO S3 API** | `http://localhost:9012` | S3-compatible raster & document endpoint (`MINIO_API_PORT`) |
| **Ollama LLM Engine** | `http://localhost:11444` | Gemma 4 Copilot (`OLLAMA_PORT`) |
| **Celery Worker** | Background | Async DeepForest & WeasyPrint Worker |

---

### Step 3: Standalone Local Development (Without Docker)

#### 1. Backend Setup:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run migrations & seed realistic Tanzanian parcels and shapefiles
python -m app.seed.seed_data

# Start FastAPI server
uvicorn app.main:app --reload --port 8012
```

#### 2. Start Celery Async Worker:
```bash
cd backend
celery -A app.worker.tasks.celery_app worker --loglevel=info
```

#### 3. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
# Application opens at http://localhost:5176
```

---

## 8. Operational Runbook & Administration

### Default Credentials
- **Admin User (app login):** `admin@kijani.ai`
- **Admin Password (app login):** `kijanipass` — a seeded demo application account, unrelated to the infrastructure service credentials below. Change it via `POST /api/auth/register` + role update, or directly in `backend/app/seed/seed_data.py`, before any shared deployment.
- **Initial Wallet Credit:** `$1,250.00` trial balance.
- **Infrastructure service credentials** (PostgreSQL, Redis, MinIO) are set in `.env` — see [§7 Step 1](#step-1-environment-configuration-env). Change `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, and `MINIO_ROOT_PASSWORD` before any shared or internet-reachable deployment.

### Toggling Testing Mode vs Production Mode
- **Via Admin Hub:** Click the mode badge in the top navigation bar or the Admin Shield icon. In the Executive Banner, click **`Switch to Production Mode`** or **`Switch to Testing Mode`**.
- **Via REST API:**
  ```bash
  curl -X PUT http://localhost:8012/api/admin/system-mode \
    -H "Content-Type: application/json" \
    -d '{"mode": "PRODUCTION"}'
  ```

### Updating Satellite API Keys
- Open **Admin Hub** > **Satellite API & Ingestion Engine**.
- Select the tier tab (Tier 1 GEE, Tier 2 Planet, Tier 3 UP42, Tier 4 Maxar).
- Enter the API key and click **`Save Configuration`**.
- Click **`Test Connection`** to verify API responsiveness and latency.

### Synchronizing Official Tanzania Shapefiles
- Execute shapefile synchronization to ensure all 2022 Census wards are indexed in the database:
  ```bash
  curl -X POST http://localhost:8012/api/parcels/tanzania-nbs/sync-storage
  ```
- Fast coordinate inference test:
  ```bash
  curl "http://localhost:8012/api/parcels/tanzania-nbs/infer-ward?lat=-6.85&lon=37.60"
  # Resolves instantly to Mindu Ward, Morogoro Urban
  ```

---

## 9. Verification & Automated Test Suite

### Running Backend Unit & Integration Tests
Execute the test suite using `uv` or `pytest`:
```bash
cd backend
PYTHONPATH=. DATABASE_URL="sqlite:////tmp/kijani_test.db" uv run --with-requirements requirements.txt --with pytest pytest tests/
```

**Test Suite Coverage (62 tests across 11 files):**
- `test_tanzania_boundaries.py`: NBS 2022 Census shapefile metadata, catalog listing, 1-click import, database storage, physical folder GeoJSON caching, and sub-millisecond point-in-polygon spatial inference. (7 tests)
- `test_system_mode.py`: System operational mode retrieval, dynamic mode transitions (Testing vs Production), invalid mode rejection, DeepForest PyTorch RetinaNet execution, and calibrated simulation. (6 tests)
- `test_gee_climate.py`: Free-tier provider retrieval and switching (GEE vs Planetary Computer vs CDSE), GEE & OpenWeatherMap diagnostics, parcel weather forecast, CHIRPS rainfall time-series, and GEE server-side reduction pipeline. (9 tests)
- `test_satellite_api_engine.py`: Multi-tier config loading, API key masking, Planet Orders payload construction with geometry clipping, database saving, admin endpoints, live connection testing, and dataset downloading. (6 tests)
- `test_api_endpoints.py`: Healthcheck, parcel listing, Gemma 4 copilot chat, dynamic 256x256 XYZ raster tile rendering, predefined soil profiles, custom user soil parameters, and irrigation reflection. (6 tests)
- `test_irrigation_engine.py`: FAO-56 Penman-Monteith $\text{ET}_0$, dynamic satellite $K_c$, USDA-SCS effective precipitation, root-zone storage, 72h forecast gating, and decadal CWRI. (6 tests)
- `test_water_engine.py`: MNDWI water masking, Mindu Reservoir regressions for TSS, Turbidity, pH, EC, and FAO clogging risk tiers. (4 tests)
- `test_carbon_engine.py`: Allometric equations across Miombo, Eastern Arc, Mangrove, and Savannah, stand-level $\text{tCO}_2\text{e}$ conversion, $15\%$ risk buffer pool deduction, and MRV verification tokens. (3 tests)
- `test_geometry_parser.py`: Shapefile `.zip`, KMZ, CSV closed-loop coordinate boundary parsing, topological repair, and geodesic hectare calculation. (2 tests)
- `test_forest_reserves.py`: TFS reserve catalog metadata, list & search filtering, GeoJSON export, reserve detail lookup by ID, monitoring-parcel import, and per-reserve land cover monitoring. (6 tests)
- `test_mabadiliko_engine.py`: 10-year monthly-interval evaluation, custom year/interval combinations, max-year horizon cap enforcement, supported-intervals metadata endpoint, parcel decadal-changes endpoint, custom boundary analysis endpoint, and Tanzania basins summary endpoint. (7 tests)

### Running Frontend Production Build
```bash
cd frontend
npm run build
# Compiles TypeScript and Vite production bundle with zero errors
```

---

## 10. User Documentation & Playbook

- Complete role-based operational documentation is available in [`usermanual.md`](file:///Users/kadefue/KijaniAI/usermanual.md).
- In the web app, click the **`Manual / Mwongozo`** button in the top navigation bar to open the colorful, interactive guide with role-specific tabs for farmers, administrators, carbon auditors, hydrologists, and field rangers.

---

## 11. Automated Email Notifications

KijaniAI dispatches branded HTML email notifications from **background Celery workers** the moment a long-running job finishes, so users never have to keep a browser tab open waiting on a result.

### What triggers an email
| Trigger | Task | Sent To |
|---|---|---|
| Imagery order completes (crown detection, carbon & water metrics) | `process_imagery_order_task` | The parcel owner's registered account email |
| MRV carbon certificate is generated | `send_mrv_certificate_email_task` (dispatched after `POST /api/modules/carbon/{parcel_id}/generate-mrv`) | The parcel owner's registered account email |
| MabadilikoAI async change-detection job completes | `run_mabadiliko_analysis_task` | The optional `notify_email` supplied at job submission (`POST /api/modules/mabadiliko/jobs/submit`) |

Every email is delivered **asynchronously in the worker process** — the triggering API call returns immediately and never blocks on SMTP latency. A delivery failure (e.g. bad credentials, relay unreachable) is logged and never fails the underlying order, certificate, or analysis job.

### Configuration
Set the `SMTP_*` variables in `.env` (see [§7 Environment Configuration](#step-1-environment-configuration-env)). When running via Docker Compose, both the `api` and `celery_worker` services load `.env` directly (`env_file:` in `docker-compose.yml`), so no values need to be duplicated into the compose file itself.

### Templates
All templates live in `backend/app/services/email_service.py` and share one KijaniAI-branded HTML shell:
- **Imagery Analysis Ready** — tree count and net tCO₂e sequestered, with a link to the parcel dashboard.
- **MRV Certificate Ready** — certificate number, net tradable tCO₂e, and a verification link.
- **MabadilikoAI Analysis Complete** — bilingual (English + Kiswahili) net land cover change summary per class, plus the AI-generated narrative explanation.

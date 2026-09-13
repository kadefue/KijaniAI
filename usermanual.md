# KijaniAI User Manual & Operational Guide (Mwongozo wa Mtumiaji)
## AI-Powered Land, Ecosystem, Water & Irrigation Intelligence Platform

**Welcome to KijaniAI.** This manual provides operational guidance for all stakeholders using the platform across Tanzania and Sub-Saharan Africa: smallholder farmers, commercial irrigation managers, platform administrators, carbon credit project developers, hydrologists, and field ground-truthing rangers.

---

## Table of Contents
1. [Platform Overview & Navigation](#1-platform-overview--navigation)
2. [Role 1: Farmers, Agronomists & Scheme Managers](#2-role-1-farmers-agronomists--scheme-managers)
   - [2.1 Importing Parcel Boundaries](#21-importing-parcel-boundaries)
   - [2.2 1-Click Tanzania 2022 Census Ward Selection](#22-1-click-tanzania-2022-census-ward-selection)
   - [2.3 Configuring Soil Profiles & Custom Hydraulic Parameters](#23-configuring-soil-profiles--custom-hydraulic-parameters)
   - [2.4 Reading KijaniIrrigation & Hydrological Schedules](#24-reading-kijaniirrigation--hydrological-schedules)
   - [2.5 72-Hour Forecast Gating & Rainfall Conservation](#25-72-hour-forecast-gating--rainfall-conservation)
   - [2.6 Decadal CWRI & Crop Failure Early Warning](#26-decadal-cwri--crop-failure-early-warning)
3. [Role 2: Platform Administrators & Geospatial Officers](#3-role-2-platform-administrators--geospatial-officers)
   - [3.1 Setting Operational Mode (Testing vs Production)](#31-setting-operational-mode-testing-vs-production)
   - [3.2 Managing Free-Tier Services (GEE, Planetary Computer, CDSE)](#32-managing-free-tier-services-gee-planetary-computer-cdse)
   - [3.3 Configuring Commercial Satellite APIs (Planet, UP42, Airbus, Maxar)](#33-configuring-commercial-satellite-apis-planet-up42-airbus-maxar)
   - [3.4 Managing Dynamic Per-Hectare Pricing Tiers](#34-managing-dynamic-per-hectare-pricing-tiers)
   - [3.5 Replaying Abandoned Sessions & Gemma 4 Win-Back Campaigns](#35-replaying-abandoned-sessions--gemma-4-win-back-campaigns)
   - [3.6 Synchronizing Official Tanzania Administrative Shapefiles](#36-synchronizing-official-tanzania-administrative-shapefiles)
4. [Role 3: Environmental Authorities, Carbon Developers & MRV Auditors](#4-role-3-environmental-authorities-carbon-developers--mrv-auditors)
   - [4.1 Generating Verra VM0042 & Plan Vivo MRV Dossiers](#41-generating-verra-vm0042--plan-vivo-mrv-dossiers)
   - [4.2 Cryptographic QR Code Verification & Proof of Authenticity](#42-cryptographic-qr-code-verification--proof-of-authenticity)
   - [4.3 Tree Crown Detection & Allometric Biomass Conversion](#43-tree-crown-detection--allometric-biomass-conversion)
   - [4.4 Deforestation Monitoring & Fire Scars (KijaniWatch)](#44-deforestation-monitoring--fire-scars-kijaniwatch)
5. [Role 4: Hydrologists & Reservoir Water Managers (KijaniMaji)](#5-role-4-hydrologists--reservoir-water-managers-kijanimaji)
   - [5.1 Water Quality Parameter Estimation (TSS, Turbidity, pH, EC)](#51-water-quality-parameter-estimation-tss-turbidity-ph-ec)
   - [5.2 FAO Drip Clogging Risk Assessment](#52-fao-drip-clogging-risk-assessment)
   - [5.3 Georeferenced Point Extraction & CSV Downloads](#53-georeferenced-point-extraction--csv-downloads)
6. [Role 5: Field Extension Officers & Ground Rangers (KijaniSync PWA)](#6-role-5-field-extension-officers--ground-rangers-kijanisync-pwa)
   - [6.1 Offline Field Pack Download (IndexedDB Dexie.js)](#61-offline-field-pack-download-indexeddb-dexiejs)
   - [6.2 On-Device Edge AI Camera Measurement (DBH & Species)](#62-on-device-edge-ai-camera-measurement-dbh--species)
   - [6.3 Seamless Cloud Synchronization](#63-seamless-cloud-synchronization)
7. [Bilingual Gemma 4 AI Copilot (English & Kiswahili)](#7-bilingual-gemma-4-ai-copilot-english--kiswahili)
8. [Glossary & Swahili Terminology](#8-glossary--swahili-terminology)

---

## 1. Platform Overview & Navigation

KijaniAI provides a unified split-screen workstation:
- **Top Navigation Bar:**
  - **Parcel Selector:** Dropdown menu to switch instantly between registered farms, schemes, and water reservoirs.
  - **Operational Mode Badge:** Labeled either `Testing Mode (Demo)` (purple flask) or `Production Mode` (emerald zap). Clicking opens the Admin Hub.
  - **Online/Offline Status:** Green badge indicates cloud connectivity; amber badge indicates offline PWA mode with local IndexedDB storage.
  - **Action Tools:** `Import Boundary`, `KijaniSync`, `Acquire Tiers ($ Wallet)`, `Admin Hub`, `Gemma 4 Copilot`, and `User Manual`.
- **Left Sidebar:** Tab navigation for all 10 intelligence engines:
  - 💧 **KijaniIrrigation:** FAO-56 Penman-Monteith daily water requirement, dynamic $K_c$, pumping hours, 72h forecast gating, and decadal CWRI.
  - 🌊 **KijaniMaji:** Remote sensing water quality calibrated for Tanzanian reservoirs (Mindu Dam empirical regressions for TSS, Turbidity, pH, EC).
  - 🌲 **KijaniCount:** DeepForest AI individual tree crown detection, density per hectare, and crown cover percentage.
  - 🌿 **KijaniHealth:** Multispectral vegetation indices (NDVI, EVI, SAVI, NDWI) mapped to *Masika* and *Vuli* agro calendars.
  - 📡 **KijaniRadar:** Sentinel-1 Synthetic Aperture Radar (SAR) all-weather cloud-penetrating soil moisture and flood mapping.
  - 📜 **KijaniCarbon:** Allometric biomass estimation, $15\%$ Verra risk buffer deduction, and cryptographic PDF MRV dossiers.
  - 🛡️ **KijaniWatch:** Deforestation early warnings, burn scar severity (NBR), and forest boundary encroachment.
  - 🌱 **KijaniRestore:** Forest and wetland restoration cohort survival tracking and canopy expansion rate.
  - 🗺️ **KijaniMap:** 5-class fused optical/SAR Land Use Land Cover (LULC) baseline classification.
  - 📱 **KijaniSync:** Field ground-truthing PWA with edge camera AI.
- **Left/Top Center Workspace:** Interactive MapLibre GL map canvas rendering true-color satellite imagery, NDVI heatmaps, water quality layers, SAR backscatter, OpenStreetMap cartography, and vector boundaries.
- **Right/Bottom Center Workspace:** Module analytical dashboard displaying charts, KPIs, forecasts, regression tables, and action forms.

---

## 2. Role 1: Farmers, Agronomists & Scheme Managers

### 2.1 Importing Parcel Boundaries
1. Click **`Import Boundary`** in the top navigation bar.
2. Select your file format:
   - **Shapefile Archive (`.zip`):** Must contain `.shp`, `.shx`, `.dbf`, and `.prj`.
   - **Google Earth (`.kmz` / `.kml`):** Automatically extracts polygon coordinates.
   - **Spreadsheet GPS Coordinates (`.csv`):** Lat/Lon point sequence defining a closed polygon boundary.
   - **GeoJSON (`.geojson` / `.json`):** Standard WGS84 GeoJSON polygon.
3. Configure farm parameters:
   - **Scheme / Parcel Name:** (e.g., *Mlandizi Block 2 Irrigation Scheme*).
   - **Category:** Agriculture, Forest, Wetland, Water Body, Grassland, or Restoration.
   - **Crop Type:** Maize, Rice, Sugarcane, Cotton, Sunflower, Beans, Cassava, Coffee, Tea, or Horticulture.
   - **Irrigation System:** Drip ($90\%$ efficiency), Sprinkler ($75\%$), Center Pivot ($82\%$), or Furrow ($55\%$).
   - **Ecozone:** Miombo Woodland, Eastern Arc Montane, Coastal Mangrove/Forest, or Dry Savannah.
4. Click **`Import Boundary`**. The system verifies topology, calculates geodesic acreage, and saves to the database.

### 2.2 1-Click Tanzania 2022 Census Ward Selection
If you do not have GPS coordinates or shapefiles:
1. Open the **`Import Boundary`** modal.
2. Locate the banner **"Official Tanzania Administrative Boundaries (NBS Sensa 2022)"**.
3. Select your local ward from the 1-click catalog:
   - **Mindu Ward (Morogoro Urban):** Mindu Reservoir & Dam Catchment.
   - **Mazimbu Ward (Morogoro Urban):** SUA agricultural research belt.
   - **Mlandizi Ward (Kibaha Rural, Pwani):** Lower Ruvu maize and horticultural scheme.
   - **Kidatu Ward (Kilombero, Morogoro):** Great Ruaha River commercial sugarcane scheme.
   - **Kisarawe Ward (Kisarawe, Pwani):** Miombo agroforestry and restoration scheme.
   - **Lushoto Ward (Lushoto, Tanga):** Usambara Montane tea and high-altitude crops.
   - **Kahe Ward (Moshi Rural, Kilimanjaro):** Mt. Kilimanjaro volcanic alluvial agroforestry.
   - **Kondoa Mjini (Kondoa, Dodoma):** Semi-arid soil rehabilitation zone.
4. Click **`1-Click Import Ward Boundary`**. The exact official census boundary is instantly ingested.

### 2.3 Configuring Soil Profiles & Custom Hydraulic Parameters
KijaniAI calculates dynamic root-zone water storage between Field Capacity (FC) and Permanent Wilting Point (PWP).
1. Open the **KijaniIrrigation** dashboard.
2. Scroll to the **Soil Profile & Hydraulic Properties** panel.
3. Choose either a **Predefined Soil Preset**:
   - *Sandy Clay Loam (Default)* — Balanced retention for Morogoro & Pwani basins.
   - *Clay (Mbuga Soils)* — High retention, common in Kilombero valley floodplains.
   - *Loam* — Optimum agricultural soil in Kilimanjaro & Usambara foothills.
   - *Sand* — High drainage coastal plain soils.
   - *Silt Loam* — Alluvial river basin deposits.
4. Or select **Custom User Parameters** and define:
   - **Sand Content (%)** and **Clay Content (%)**
   - **Field Capacity ($\text{m}^3/\text{m}^3$):** Upper boundary of plant-available water.
   - **Permanent Wilting Point ($\text{m}^3/\text{m}^3$):** Moisture limit below which plants wilt irreversibly.
   - **Effective Rooting Depth ($m$):** Active crop root zone (e.g. $0.6$ m for beans, $1.0$ m for maize, $1.5$ m for sugarcane).
5. Click **`Save Soil Profile Parameters`**. The root-zone water balance immediately recalculates.

### 2.4 Reading KijaniIrrigation & Hydrological Schedules
- **Water Deficit Card:** Indicates whether soil moisture is adequate (🟢 Optimal), declining (🟡 Moderate), or stressed (🔴 Critical Irrigation Urgently Required).
- **Net Irrigation Requirement (NIR):** Net depth of water (mm) needed to restore soil storage to field capacity.
- **Gross Irrigation Requirement (GIR):** Net requirement adjusted for irrigation application efficiency ($E_a$).
- **Total Application Volume ($\text{m}^3$):** Exact volume of water required for the entire acreage:
  $$V \, (\text{m}^3) = \text{GIR (mm)} \times 10 \times \text{Area (ha)}$$
- **Pumping Duration:** Exact hours and minutes needed to run your irrigation pumps at your specified flow rate ($Q$ in $\text{m}^3/\text{h}$).

### 2.5 72-Hour Forecast Gating & Rainfall Conservation
KijaniAI protects your budget and soil nutrients by preventing over-irrigation before rain events:
- If OpenWeatherMap 72-hour forecast precipitation $\ge \text{NIR}$, KijaniAI displays an orange alert banner:
  > **"IRRIGATION POSTPONED — Significant Rainfall Expected (72h Forecast: XX mm)"**
- Agronomic Rationale: Prevents fuel waste, electricity cost, waterlogging, and nitrogen fertilizer leaching.

### 2.6 Decadal CWRI & Crop Failure Early Warning
- **Crop Water Requirements Index (CWRI):** Calculated in 10-day (dekad) intervals:
  $$\text{CWRI} = \left( \frac{\sum_{t=1}^{10} \text{ET}_{a, t}}{\sum_{t=1}^{10} \text{ET}_{c, t}} \right) \times 100$$
  - $\text{CWRI} \ge 90\%$: Optimal yield expectancy.
  - $\text{CWRI } 70\% - 89\%$: Mild moisture stress.
  - $\text{CWRI } 50\% - 69\%$: Moderate crop failure risk; immediate supplemental irrigation needed.
  - $\text{CWRI } < 50\%$: Severe yield penalty ($>40\%$ harvest loss anticipated).

---

## 3. Role 2: Platform Administrators & Geospatial Officers

### 3.1 Setting Operational Mode (Testing vs Production)
Administrators can switch the entire platform between two modes via the **Admin Hub**:
1. Click the **Shield Icon** or the **Mode Badge** in the top navigation bar.
2. In the **System Operational Mode** card:
   - **Testing Mode (High-Fidelity Demo Simulation):**
     - Generates photorealistic, boundary-constrained synthetic crowns, water regressions, and STAC catalogs.
     - Ideal for donor pitches, investor presentations, and developer testing without consuming GPU compute or commercial satellite credits.
   - **Production Mode (Live Operational AI Models):**
     - Executes real deep learning models (**DeepForest PyTorch RetinaNet** for crown segmentation).
     - Dispatches live queries to Google Earth Engine, OpenWeatherMap, and STAC provider order APIs.
3. Click **`Switch to Production Mode`** or **`Switch to Testing Mode`**. The state is saved in the database (`system_settings`) and instantly applies to all users.

### 3.2 Managing Free-Tier Services (GEE, Planetary Computer, CDSE)
1. Open **Admin Hub** and navigate to the **Satellite API & Ingestion Engine** panel.
2. Under **Tier 1 (Public / Free 10m–30m)**:
   - Select your **Primary Ingestion Provider**:
     - **Google Earth Engine (GEE):** Server-side reduction pipeline; calculates NDVI, NDWI, MNDWI, SAR backscatter, and CHIRPS rainfall in Google's cloud before transmitting results to your database.
     - **Microsoft Planetary Computer:** Fast STAC direct COG streaming with SAS tokens.
     - **Copernicus Data Space Ecosystem (CDSE):** Official European Space Agency direct archive.
   - Enter your GEE Service Account email and Private Key JSON, or CDSE Client ID/Secret.
   - Click **`Test Connection`** to verify API responsiveness and latency.

### 3.3 Configuring Commercial Satellite APIs (Planet, UP42, Airbus, Maxar)
1. In the **Satellite API & Ingestion Engine** panel:
   - **Tier 2 (PlanetScope 3m–5m):** Enter your Planet API Key. Test endpoint queries Planet Orders v2 API with automatic farm geometry clipping.
   - **Tier 3 (UP42 & Airbus 50cm VHR):** Enter UP42 Project ID & API Key, or Airbus OneAtlas API Key.
   - **Tier 4 (Maxar & Pléiades Neo 30cm Ultra VHR):** Enter Maxar Discovery token or Pléiades Neo API credentials.
2. API keys are masked in the UI for security and stored encrypted in the `satellite_api_configs` database table.

### 3.4 Managing Dynamic Per-Hectare Pricing Tiers
1. In the **Admin Hub**, locate the **Acquisition Pricing & Tier Configuration** table.
2. Adjust:
   - **Base Cost per Hectare ($/ha)** for Tiers 1 through 4.
   - **Minimum Hectare Billing Threshold.**
   - **Platform Commission Markup Percentage** (default $20\%$).
3. Changes immediately reflect in the farmer's wallet checkout modal.

### 3.5 Replaying Abandoned Sessions & Gemma 4 Win-Back Campaigns
1. In **Admin Hub**, open **Behavioral Session Replays & User Retention**.
2. Review user sessions recorded by the `rrweb` telemetry engine.
3. Click **`Replay Session`** to watch the exact DOM playback of where a user experienced friction or abandoned a satellite purchase.
4. Review the **AI Win-Back Campaign** automatically generated by Gemma 4:
   - Evaluates the friction point (e.g. paused at Tier 3 checkout).
   - Drafts personalized bilingual win-back email with wallet credit incentives.
   - Click **`Approve & Dispatch via SMTP`** to send the email to the user.

### 3.6 Synchronizing Official Tanzania Administrative Shapefiles
1. In **Admin Hub** or via API endpoint `POST /api/parcels/tanzania-nbs/sync-storage`:
   - Checks the official NBS download link: `https://www.nbs.go.tz/uploads/statistics/documents/en-1714652282-TANZANIA_2022PHC_WARD_SHAPEFILES.zip`.
   - Populates the `tanzania_wards` database table with indexed bounding boxes.
   - Exports the official GeoJSON collection to `backend/data/shapefiles/tanzania_2022_wards/tanzania_wards_2022.geojson`.
   - Enables sub-millisecond point-in-polygon spatial inference for any coordinate across Tanzania.

---

## 4. Role 3: Environmental Authorities, Carbon Developers & MRV Auditors

### 4.1 Generating Verra VM0042 & Plan Vivo MRV Dossiers
1. Select your forest, mangrove, or restoration parcel in the top dropdown.
2. Switch to the **KijaniCarbon** tab in the sidebar.
3. Review stand-level carbon stock metrics:
   - **Mean Above-Ground Biomass (AGB):** Calculated from regional allometrics.
   - **Mean Below-Ground Biomass (BGB):** Root-to-shoot ratio conversion ($R = 0.42$ for Miombo, $0.28$ for Mangroves, $0.24$ for Montane).
   - **Gross Sequestration ($\text{tCO}_2\text{e}$):** Carbon fraction conversion factor ($0.47 \times 44/12$).
   - **Verra VM0042 Buffer Deduction ($15\%$):** Automatically set aside in an un-tradable risk reserve pool.
   - **Net Tradable Carbon Credits ($\text{tCO}_2\text{e}$):** Verified net carbon credit yield.
4. Click **`Generate Certified MRV Audit Dossier (PDF)`**.
5. The Celery worker synthesizes a tamper-proof PDF audit dossier via WeasyPrint, containing:
   - SHA-256 boundary polygon cryptographic hash.
   - SHA-256 input raster pixel hash.
   - High-resolution stand orthomosaic with individual crown bounding boxes.
   - Embedded QR verification token.

### 4.2 Cryptographic QR Code Verification & Proof of Authenticity
- Every MRV dossier contains an embedded QR code pointing to `https://kijani.ai/verify/{verification_token}`.
- Auditors, credit buyers, and registry officials scan the QR code with any smartphone camera:
  - Displays instant cryptographic verification certificate.
  - Confirms parcel name, owner, ecozone, net $\text{tCO}_2\text{e}$, issue date, and SHA-256 digital signature.
  - Guarantees zero double-counting and eliminates greenwashing.

### 4.3 Tree Crown Detection & Allometric Biomass Conversion
- In the **KijaniCount** tab:
  - Shows total crowns segmented, density ($\text{trees/ha}$), and canopy cover percentage.
  - In **Production Mode**, crowns are detected using DeepForest PyTorch RetinaNet bounding boxes.
  - Individual crown diameters ($\text{CD}_i$) are mapped through peer-reviewed Tanzanian allometric equations to determine stem volume and carbon mass.

### 4.4 Deforestation Monitoring & Fire Scars (KijaniWatch)
- **Deforestation Alerts:** Detects sudden drops in Sentinel-2 NDVI ($>0.25$ decrease) corroborated by Sentinel-1 SAR backscatter loss.
- **Normalized Burn Ratio (NBR):**
  $$\text{NBR} = \frac{\text{NIR (B8)} - \text{SWIR2 (B12)}}{\text{NIR (B8)} + \text{SWIR2 (B12)}}$$
  Classifies burn severity into Unburned, Low Severity, Moderate Severity, and High Severity fire scars.

---

## 5. Role 4: Hydrologists & Reservoir Water Managers (KijaniMaji)

### 5.1 Water Quality Parameter Estimation (TSS, Turbidity, pH, EC)
KijaniMaji is calibrated against validated empirical regression models from **Mindu Reservoir (Morogoro, Tanzania)**:
1. Select a water body or wetland parcel (e.g. *Mindu Reservoir*).
2. Open the **KijaniMaji** tab in the sidebar.
3. Dynamic **MNDWI Water Masking** extracts pure water pixels and filters out land reflectance.
4. Select individual parameter views:
   - **Total Suspended Solids (TSS in mg/L):** Regression equation $\text{TSS} = 0.8046x + 5.5561$ ($R^2 = 0.8046, \text{RMSE} = 2.25$).
   - **Turbidity (NTU):** Regression equation $\text{Turbidity} = 0.7214x + 16.255$ ($R^2 = 0.7214, \text{RMSE} = 2.04$).
   - **pH:** Regression equation $\text{pH} = 0.7394x + 2.1609$ ($R^2 = 0.7394, \text{RMSE} = 0.086$).
   - **Electrical Conductivity (EC in mS/cm):** Regression equation $\text{EC} = 0.6835x + 0.0587$ ($R^2 = 0.6838, \text{RMSE} = 0.00068$).

### 5.2 FAO Drip Clogging Risk Assessment
- Evaluates irrigation water suitability for drip emitters according to FAO criteria:
  - **TSS $<50$ mg/L:** Minor / No risk of physical emitter clogging.
  - **TSS $50 - 100$ mg/L:** Moderate clogging risk — disc or sand media filtration recommended.
  - **TSS $>100$ mg/L:** Severe clogging risk — pre-sedimentation basin and secondary filtration required.
  - **$\text{pH} > 8.0$:** Alkaline chemical scale precipitation hazard; acid injection recommended.

### 5.3 Georeferenced Point Extraction & CSV Downloads
- Click **`Export Georeferenced Water Quality Points (CSV)`** in the KijaniMaji dashboard.
- Downloads a tabular dataset with columns: `sample_id`, `latitude`, `longitude`, `mndwi`, `tss_mg_l`, `turbidity_ntu`, `ph`, `ec_ms_cm`, and `timestamp`.

---

## 6. Role 5: Field Extension Officers & Ground Rangers (KijaniSync PWA)

### 6.1 Offline Field Pack Download (IndexedDB Dexie.js)
KijaniSync operates in remote areas without cellular or satellite data:
1. When online, click **`KijaniSync`** in the top navigation bar.
2. Select your parcel boundary and click **`Download Offline Field Pack`**.
3. The platform bundles vector boundaries, satellite tiles, soil profiles, and active alerts into client-side IndexedDB storage using **Dexie.js**.
4. You can now disconnect from the internet or take your smartphone into deep forest reserves.

### 6.2 On-Device Edge AI Camera Measurement (DBH & Species)
1. Open KijaniSync on your mobile phone or tablet browser.
2. Click **`Launch Tree Ground-Truthing Camera`**.
3. Point your smartphone camera at a tree trunk at breast height ($1.3$ m above ground):
   - The on-device edge AI camera engine segments the trunk edges and estimates diameter at breast height (DBH in cm).
   - Classifies the species based on bark texture and leaves (e.g. *Brachystegia boehmii / Msumba*, *Pterocarpus angolensis / Mninga*, *Avicennia marina / Mchu*).
4. Enter ground notes and click **`Save Local Field Observation`**. The record is saved locally with GPS coordinates and timestamp.

### 6.3 Seamless Cloud Synchronization
1. When returning to cellular coverage or Wi-Fi, the top status badge automatically changes from `PWA Offline` to `Online`.
2. Open KijaniSync and click **`Sync Stored Observations to Cloud`**.
3. All local ground-truthing observations are transmitted to the backend, updating the parcel database and calibrating remote sensing satellite indices.

---

## 7. Bilingual Gemma 4 AI Copilot (English & Kiswahili)

Click the **`Gemma 4 Copilot`** button in the top navigation bar to open the intelligent agronomic assistant.

### Live Context Injection
The copilot automatically loads your currently selected parcel, including:
- Crop type, acreage, and ecozone.
- Latest Sentinel-2 NDVI, moisture stress index, and soil water deficit.
- 72h OpenWeatherMap rainfall forecast.
- FAO-56 irrigation recommendation.

### Sample Prompts (English)
- *"How many hours should I run my drip pump tomorrow for Mlandizi Block 2?"*
- *"Explain why irrigation was postponed today."*
- *"What is the clogging risk of Mindu Reservoir water for drip emitters?"*
- *"How many carbon credits did our Usambara forest reserve generate after the 15% Verra buffer?"*

### Sample Prompts (Kiswahili / Kiswahili Sanifu)
- *"Je, ninaweza kuanza kumwagilia mahindi leo Mlandizi, au mvua inatarajiwa?"*
- *"Maji ya Lambo la Mindu yanafaa kwa mfumo wa matone au yataziba mirija?"*
- *"Mbona kiwango cha maji kwenye udongo kimepungua wiki hii?"*
- *"Hifadhi yetu ya Msitu wa Usambara imetoa tani ngapi za hewa ya ukaa (carbon credits)?"*

---

## 8. Glossary & Swahili Terminology

| Term / Neno | Meaning & Scientific Context |
|---|---|
| **$\text{ET}_0$** | Reference Crop Evapotranspiration calculated via FAO-56 Penman-Monteith (mm/day). |
| **$K_c$** | Crop Coefficient. Dynamic ratio transforming $\text{ET}_0$ into crop-specific water demand ($\text{ET}_c$). |
| **NIR / GIR** | Net Irrigation Requirement vs Gross Irrigation Requirement (adjusted for application efficiency $E_a$). |
| **CWRI** | Crop Water Requirements Index (Dekadal / 10-day step moisture satisfaction index). |
| **WRSI** | Water Requirement Satisfaction Index (Seasonal cumulative crop yield indicator). |
| **MNDWI** | Modified Normalized Difference Water Index (Green - SWIR) used for precision water masking. |
| **TSS** | Total Suspended Solids (mg/L). Key physical clogging hazard in irrigation emitters. |
| **DeepForest** | PyTorch deep learning RetinaNet model used for high-resolution individual tree crown detection. |
| **Masika** | Long rainy season in Tanzania (March through May). Main cropping period. |
| **Vuli** | Short rainy season in northern and coastal Tanzania (October through December). |
| **Maji Safi** | Clean irrigation and drinking water compliant with WHO and FAO standards. |
| **Umwagiliaji** | Irrigation (Drip = Matone, Sprinkler = Mnyunyizo, Pivot = Mzunguko, Furrow = Mifereji). |
| **Hewa ya Ukaa** | Carbon credits and carbon sequestration ($\text{tCO}_2\text{e}$). |
| **Sensa ya Watu na Makazi 2022** | Official Tanzania 2022 Population and Housing Census by NBS Tanzania, source of national ward shapefiles. |

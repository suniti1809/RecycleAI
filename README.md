# ♻️ RecycleAI — AI-Powered E-Waste Marketplace & Circular Logistics

RecycleAI is a full-stack, enterprise-grade e-waste classification, valuation, recycling advisor, and buyer–seller circular marketplace. It connects individuals and businesses selling electronic waste directly with certified recyclers purchasing scrap and recoverable materials.

---

## 🚀 Key Features

1. **YOLOv8 Computer Vision Classifier**:
   - Uses real local model inference (`backend/models/model.pt` via Ultralytics YOLO).
   - Detects 13 distinct e-waste hardware classes:
     - `ENERGY_STORAGE` (Batteries, UPS cells, Lithium packs)
     - `COMPUTER_SYSTEM` (Desktops, laptops, motherboards)
     - `DISPLAY_DEVICE` (CRTs, LCDs, OLEDs)
     - `COMMUNICATION_DEVICE` (Smartphones, tablets, routers)
     - `STORAGE_DEVICE` (HDDs, SSDs, flash drives)
     - `ELECTRONIC_COMPONENT` (PCBs, microchips, power modules)
     - `AUDIO_DEVICE` (Speakers, headphones, amplifiers)
     - `KITCHEN_APPLIANCE` (Microwaves, toasters, blenders)
     - `LARGE_HOME_APPLIANCE` (Washing machines, refrigerators)
     - `TOOLS_DEVICE` (Power drills, electric saws)
     - `MEDICAL_DEVICE` (Diagnostic electronics, monitors)
     - `SMART_SENSOR_DEVICE` (IoT modules, smoke detectors)
     - `INPUT_DEVICE` (Keyboards, mice, remotes)

2. **AI Recycling Advisor (Groq Ultra-Fast LLM & Deterministic Safety Override)**:
   - Powered by **Groq** (`groq-sdk`) for lightning-fast AI advisory.
   - Evaluates material recovery potential, recoverable precious metals (Gold, Silver, Copper), and safe handling steps.
   - Strict deterministic safety overrides for toxic substances (Mercury in screens, Lithium-Ion fire hazards, lead solder).
   - Data privacy wiping protocols for storage drives, phones, and PCs before handover.

3. **Product Lifecycle & Circular Journey**:
   - Clear, non-technical 5-stage recycling breakdown for regular users and scrap buyers:
     - **Stage 1 (Collection):** Doorstep pickup with verified digital scale weighing and direct handover confirmation.
     - **Stage 2 (Privacy):** 100% data wiping, magnetic clearance, and shredding of memory cards.
     - **Stage 3 (Parts Salvage):** Testing and saving reusable parts (screens, RAM, motors) to repair other devices.
     - **Stage 4 (Metal Extraction):** Safe smelting and extraction of pure Gold, Silver, and Copper.
     - **Stage 5 (Zero-Waste Reuse):** Recycled metals and plastics remelted into fresh appliances and EV batteries.
   - Live carbon emissions avoided (`kg CO₂e`) and landfill diversion tracking.

4. **Supabase Cloud Media & Storage**:
   - Configured with Supabase project URL and keys.
   - Uploads e-waste photos directly to Supabase Storage with seamless local disk fallback.
   - 4-slot verified media workflow (AI photo, 2 physical photos, 1 condition video) before buyers can place offers.

5. **Circular Marketplace & Independent Negotiation Engine**:
   - Sellers create e-waste listings with AI predicted categories, prices, weight, and condition.
   - Buyers/recyclers submit purchase bids and proposals.
   - Independent negotiation threads between each buyer–seller pair.
   - **Enforces strict maximum 3 seller counter-offers** per buyer-listing pair (`Seller counter-offers used: n/3`). Rejects the 4th seller counter-offer at the backend.

6. **Doorstep Pickup & Direct Handover Confirmation**:
   - Atomic deal acceptance reserving items and closing competing bids.
   - Doorstep pickup scheduling window.
   - Direct physical handover confirmation: The certified recycler verifies actual scale weight in person and marks pickup complete, instantly settling the deal without needing SMS or OTP codes.

7. **Interactive Recycler Discovery (Google Maps Platform & OpenStreetMap Dual-Engine)**:
   - **Google Maps Platform Integration**: Powered by `@vis.gl/react-google-maps` using the official Google Maps JavaScript API with modern `AdvancedMarkerElement` markers.
   - Interactive facility discovery based on material categories and service radius.
   - Clearly distinguishes verified RecycleAI facilities with custom branded pins.
   - One-click Google Maps turn-by-turn driving directions.
   - **Dual-Engine Toggle**: Seamlessly switch between **Google Maps** and **OpenStreetMap (Leaflet)** with one click, including automatic fallback if GCP billing is inactive.

8. **Verified Recycler Portal & Active Jobs Tracker**:
   - Dedicated Recycler Portal (`/recycler-portal`) for certified scrap buyers and facilities.
   - Active Pickups Tracker (`/recycler/my-jobs`) tracking accepted collections, handover confirmations, and procurement totals.

9. **Environmental Impact Analytics**:
   - Calculates real diverted e-waste weights, avoided CO₂e emissions (2.4 kg CO₂e/kg factor), and tree-year equivalents from completed deals.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, React Router 6, Modern Vanilla CSS.
- **Maps & Geolocation**: 
  - **Google Maps Platform**: `@vis.gl/react-google-maps`, Google Maps JavaScript SDK (Advanced Markers).
  - **OpenStreetMap**: Leaflet & `react-leaflet` with OpenStreetMap tiles.
- **Backend**: Node.js, Express 5, Sequelize ORM, SQLite3.
- **Cloud & Storage**: Supabase (`@supabase/supabase-js`) with local fallback.
- **AI / Machine Learning**: 
  - **Computer Vision**: Ultralytics YOLOv8 Python bridge (`classifier_bridge.py` + `model.pt`).
  - **LLM Advisory**: **Groq API** (`groq-sdk`, model `openai/gpt-oss-120b`).

---

## 📋 Installation & Setup

### 1. Prerequisites
- Node.js 18+ and npm
- Python 3.8+ with `ultralytics` installed:
  ```bash
  pip install ultralytics
  ```

### 2. Backend Setup
```bash
cd trail/backend
npm install
```

Configure `.env` in `trail/backend/`:
```env
PORT=5000
SUPABASE_URL=https://wvbllcndiqxsvuyzvkkd.supabase.co
SUPABASE_KEY=sb_publishable_lFBz0rh1NB4fRsZJT6dNZQ_NUZUzWFZ
SUPABASE_SERVICE_ROLE_KEY=

# Groq AI Provider (Primary LLM)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

JWT_SECRET=recycle_ai_jwt_super_secret_key_2026
```

Run database migrations & seed verified recyclers:
```bash
node utils/migrate.js
node utils/seed_recyclers.js
```

Start the backend API:
```bash
npm start
```
The backend runs at `http://127.0.0.1:5000`.

### 3. Frontend Setup
```bash
cd trail/frontend
npm install
```

Configure `.env` in `trail/frontend/`:
```env
VITE_SUPABASE_URL=https://wvbllcndiqxsvuyzvkkd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_lFBz0rh1NB4fRsZJT6dNZQ_NUZUzWFZ
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Start Vite development server:
```bash
npm run dev
```
The frontend runs at `http://localhost:3000`.

---

## 🧪 Running Tests

### Backend End-to-End Integration Tests
Validates authentication, YOLOv8 model inference, Groq AI advisor, marketplace listing creation, buyer offers, negotiation limits (max 3 seller counters), deal acceptance, pickup scheduling, physical handover confirmation, Google Maps & Leaflet facilities, and impact metrics:
```bash
cd trail/backend
npm test
```

### Frontend Production Bundle Validation
Validates full JSX compilation, styles, asset bundling, and router integrity:
```bash
cd trail/frontend
npm run build
```

---

## 🔒 Security & Privacy Practices

- **Location Privacy**: Sellers' full pickup addresses are private and masked on public marketplace listings. Exact address and coordinates are only revealed to the authorized buyer once an offer is accepted.
- **Physical Handover Confirmation**: Certified recyclers verify weight on digital scales and confirm physical receipt on the spot, settling the transaction smoothly.
- **Independent Negotiations**: Competitor bids and negotiation messages are private to each buyer-listing thread.
- **Data Erasure Assurance**: Step-by-step guidance reminding users to reset devices, degauss magnetic platters, and shred SIM/memory cards before collection.

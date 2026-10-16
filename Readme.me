# Genium: Medicine and Packaged Food Verification Platform

## Overview

Genium is an intelligent verification system designed to protect consumers and healthcare providers from counterfeit, adulterated, and cloned pharmaceuticals and packaged foods. By cross-referencing camera-captured product packaging against official National Agency for Food and Drug Administration and Control (NAFDAC) records, running deterministic integrity checks, and aggregating real-time crowd batch intelligence, Genium provides plain-language safety assessments in multiple Nigerian languages.

---

## Problem Statement

Counterfeit pharmaceuticals and packaged foods represent an urgent public health crisis across West Africa:

1. Cloned Registration Numbers: Counterfeiters routinely take valid NAFDAC registration numbers from inexpensive, low-risk products (such as paracetamol) and print them onto counterfeit life-saving medications (such as antibiotics or anti-malarials). A simple manual registry lookup confirms that "the number exists," giving consumers a false sense of security while consuming dangerous substances.
2. Incomplete Coverage of Scratch Codes: Mobile Authentication Service (MAS) scratch-off codes apply only to specific medication categories, leaving thousands of essential drugs and foods unprotected.
3. Lack of Real-Time Batch Intelligence: When a contaminated or chalk-filled batch enters the market, regulatory recalls take weeks to disseminate. Consumers have no centralized mechanism to report anomalies or check whether others have experienced treatment failures with the same batch.
4. Linguistic and Literacy Barriers: Technical regulatory databases are inaccessible to non-English speakers or users requiring straightforward, spoken or plain-text guidance in their local language.

Genium resolves these challenges through a multi-tiered verification pipeline combining computer vision, deterministic database rules, crowd-sourced anomaly detection, and multilingual AI explanations.

---

## System Architecture

Genium is organized as a production-ready monorepo comprising three specialized subsystems:

```
genium/
├── app/                  Next.js 16 Full-Stack and Web Application
│   ├── app/              App Router pages, layout, and global styling
│   ├── components/       Kraft-style scanner, camera HUD, Navbar, and Footer
│   ├── public/           Static brand assets, logos, and icons
│   └── package.json      Next.js, React 19, Tailwind CSS v4, Framer Motion
├── backend/              NestJS 11 Core API Engine
│   ├── src/              Modules for scan, report, batches, dataset, and prisma
│   ├── prisma/           Database schema and migrations
│   └── package.json      NestJS, Express, Prisma ORM, Better-SQLite3
├── ml/                   Computer Vision and Machine Learning Microservice
│   ├── vision_extractor.py Multi-model extraction engine with automated failover
│   ├── blister_comparator.py Two-surface carton versus blister validation
│   ├── barcode_resolver.py   Barcode and QR code processing
│   ├── main.py           FastAPI REST application
│   ├── Dockerfile        Multi-stage container definition
│   └── requirements.txt  FastAPI, Uvicorn, Google GenAI, Pillow, ZXing-CPP
├── docs/                 Project documentation, architecture logs, and build plans
│   ├── ABOUT.md          Problem analysis and pitch documentation
│   ├── PLAN.md           API specifications and project milestones
│   └── LOGS.md           Single Source of Truth (SSOT) engineering log
└── AGENTS.md             Workspace instructions and operational directives
```

### High-Level Data Flow

1. Image Acquisition: The user captures a photo of product packaging (carton, bottle label, or blister strip) via the web scanner interface.
2. Vision Extraction: The image is transmitted to the ML microservice. Multimodal vision models extract text fields: NAFDAC registration number, product name, manufacturer, batch number, production date, and expiration date, calculating confidence scores per field.
3. Deterministic Validation: The NestJS backend normalizes the extracted values and executes strict database cross-checks against the NAFDAC Greenbook registry:
   - Does the registration number exist in the registry?
   - Does the registered product name match the packaging label?
   - Does the registered manufacturer match the manufacturer on the box?
   - Are the expiration dates chemically valid and in the future?
   - If both carton and blister images were submitted, do their batch numbers and dates match?
4. Crowd Intelligence Evaluation: The backend checks the crowd report ledger for the specified batch number. Batches with multiple reported adverse events, dissolution failures, or geographical velocity anomalies are automatically flagged.
5. Multilingual Explanation Generation: The findings are passed to the AI reasoning engine to produce a concise, empathetic explanation and actionable next step in the user's selected language (English, Yoruba, Hausa, Igbo, or Nigerian Pidgin).
6. Synthetic Training Data Export: Verified reports and anomaly submissions generate structured training pairs in JSONL format, providing localized domain data for future on-device model fine-tuning.

---

## The 3-Tier Verdict Engine

Genium deliberately avoids binary "Real vs Fake" claims because a standard camera cannot conduct chemical spectroscopy. Instead, Genium communicates verification confidence transparently:

| Verdict | Title | Criteria | User Guidance |
| :--- | :--- | :--- | :--- |
| Green | Verified Authentic Match | NAFDAC registration confirmed in Greenbook, product name and manufacturer match registry records, carton and blister agree, and no crowd batch complaints exist. | Packaging records match official registry. No red flags found. Store properly and adhere to dosage instructions. |
| Amber | Unverified / Batch Alert | Packaging claims match official registry, but the batch has accumulated crowd-reported quality complaints, velocity anomalies, or OCR confidence is below safety thresholds. | Exercise caution. Product registration is valid, but multiple users reported issues with this specific batch. Consult a licensed pharmacist before use. |
| Red | Critical Counterfeit Flag | Registration number does not exist, belongs to an entirely different product or manufacturer (cloned registration), carton conflicts with blister, or batch is under active recall. | Do not consume or administer. High probability of counterfeit or cloned packaging. Report this pack to NAFDAC immediately. |

---

## Technical Stack

### Frontend Application (`app/`)
- Framework: Next.js 16 (App Router with Turbopack)
- Language: TypeScript 5
- Core UI Library: React 19
- Styling: Tailwind CSS v4 with custom responsive utilities
- Component Primitives: Lucide React, Framer Motion
- Creative Background: MicroSlats WebGL2 fluid wave simulation powered by OGL
- Camera Subsystem: HTML5 MediaDevices API with real-time video stream canvas capture

### Backend Core Service (`backend/`)
- Framework: NestJS 11
- HTTP Platform: Express
- Database and ORM: Prisma ORM with SQLite (development) and PostgreSQL (production)
- Seed Data: Over 11,000 official NAFDAC Greenbook pharmaceutical and food records
- Security: Header sanitization, file-type validation, SHA-256 image fingerprinting, payload size guards

### Machine Learning and Computer Vision (`ml/`)
- Framework: FastAPI, Uvicorn, Python 3.11
- Vision Extraction: Google Multimodal Models (Gemini 2.5 Flash and Gemini 3.5 Flash Lite) with high-availability automated key and model failover
- Barcode and 2D Matrix Engine: ZXing-CPP (C++ port for Python)
- Image Processing: Pillow (PIL)
- Containerization: Multi-stage slim Docker image with non-root security boundaries

---

## API Specifications

All communication between the frontend, backend, and external consumers adheres to the standardized REST contracts outlined below.

### 1. Product Verification (`POST /api/scan`)

Uploads packaging photography for automated extraction, registry lookup, and risk evaluation.

- Content-Type: `multipart/form-data`
- Parameters:
  - `image` (File, Required): Primary carton or front label image
  - `blister` (File, Optional): Secondary blister strip or inner container image
  - `lang` (String, Optional): Desired explanation language code (`en`, `yo`, `ha`, `ig`, `pcm`). Default: `en`

Sample Response (`200 OK`):
```json
{
  "scan_id": "sc_m3k9z8_ab12",
  "extracted": {
    "reg_no": { "value": "04-2114", "confidence": 0.98 },
    "product_name": { "value": "Augmentin 625mg", "confidence": 0.96 },
    "manufacturer": { "value": "GlaxoSmithKline", "confidence": 0.94 },
    "batch_no": { "value": "B2410-09", "confidence": 0.92 },
    "expiry": { "value": "2027-04", "confidence": 0.95 }
  },
  "checks": [
    { "id": "reg_exists", "pass": true, "detail": "Registration number found in NAFDAC Greenbook." },
    { "id": "reg_matches_prod", "pass": true, "detail": "Registered product name matches packaging label." },
    { "id": "manufacturer_matches", "pass": true, "detail": "Manufacturer verified against registry records." },
    { "id": "dates_valid", "pass": true, "detail": "Product is within valid shelf-life window." },
    { "id": "carton_vs_blister", "pass": true, "detail": "Carton and blister batch numbers match." },
    { "id": "batch_reports", "pass": true, "detail": "No adverse reports recorded for this batch." }
  ],
  "verdict": "green",
  "explanation": "NAFDAC records match the packaging label. The product is within its valid date and no quality alerts are active for this batch.",
  "explanations": {
    "en": "NAFDAC records match the packaging label. The product is within its valid date.",
    "yo": "Awon akosile NAFDAC ba awon alaye ti o wa lori eweko mu daadaa.",
    "ha": "Bayanin NAFDAC ya yi daidai da bayanin da ke jikin marufin maganin.",
    "ig": "Ihe edere na NAFDAC dabara na ihe di na ngwugwu ogwu a.",
    "pcm": "NAFDAC paper match wetin dey write for this medicine body."
  },
  "next_step": "You can safely take this medication as prescribed by your doctor.",
  "batch_risk": {
    "batch_no": "B2410-09",
    "reports": 0,
    "score": 0.05,
    "level": "low"
  }
}
```

### 2. Anomaly Reporting (`POST /api/report`)

Submits user, pharmacy, or clinic field reports concerning suspected counterfeit products or physical defects.

- Content-Type: `application/json`
- Request Body:
```json
{
  "text": "The tablets in batch B24091 crumbled into powder immediately and tasted like plain chalk.",
  "batch_no": "B24091",
  "product_hint": "Augmentin 625mg",
  "state": "Ogun"
}
```

Sample Response (`201 Created`):
```json
{
  "report_id": "rp_92k4_1982",
  "parsed": {
    "batch_number": "B24091",
    "anomaly_type": "DISSOLUTION_OR_TASTE_FAILURE",
    "severity": "HIGH",
    "standardized_summary": "Tablets exhibit total physical crumbling and chalk-like taste profile."
  },
  "batch_risk": {
    "batch_no": "B24091",
    "reports": 4,
    "score": 0.88,
    "level": "high"
  },
  "dataset_rows_added": 3
}
```

### 3. Risk Hotspots (`GET /api/hotspots`)

Retrieves aggregated batch risk metrics grouped by Nigerian administrative states, driving the real-time geographic intelligence dashboard.

Sample Response (`200 OK`):
```json
[
  {
    "state": "Kano",
    "flagged_batches": 5,
    "critical_count": 2,
    "highest_risk_product": "Artemether Lumefantrine",
    "risk_level": "high"
  },
  {
    "state": "Lagos",
    "flagged_batches": 2,
    "critical_count": 0,
    "highest_risk_product": "Ciprofloxacin 500mg",
    "risk_level": "low"
  }
]
```

### 4. Synthetic Dataset Export (`GET /api/dataset/export`)

Streams a compiled `.jsonl` dataset of validated packaging pairs, user anomaly submissions, and localized translations for fine-tuning open-weight multilingual models.

---

## Anomaly Taxonomy and Crowd Intelligence

When unstructured user reports are submitted in any Nigerian dialect or language, Genium maps the description into a structured clinical taxonomy:

1. `WRONG_REG_NUMBER`: Packaging displays a registration number belonging to another substance.
2. `DISSOLUTION_OR_TASTE_FAILURE`: Formulation crumbles, fails to dissolve, or tastes unusual.
3. `THERAPEUTIC_FAILURE`: Patient completes course without expected physiological effect.
4. `ADVERSE_REACTION`: Unexpected physiological side effects or toxicity symptoms.
5. `PACKAGING_DEFECT`: Faulty seals, misaligned print, misspelled chemical names, or missing tamper bands.
6. `MISSING_MAS`: Scratch-off code missing on product categories where MAS is mandatory.
7. `OTHER`: General suspicious attributes reported by healthcare professionals.

### Batch Risk Scoring Formula

The batch risk score (R) is evaluated as:
```
R = Min(1.0, (Reports * 0.25) + (PharmacistReports * 0.50) + VelocityAnomalyBonus)
```
- A score under 0.30 indicates a Low Risk batch (Green).
- A score between 0.30 and 0.70 triggers an Amber Warning for all subsequent scans.
- A score above 0.70 triggers a Red Critical Flag and initiates automated notification routing.

---

## Local Development Setup

### Prerequisites
- Node.js 20 or Node.js 24
- pnpm package manager (`npm install -g pnpm`)
- Python 3.11 with virtualenv support
- Google Gemini API key (for vision extraction and explainer reasoning)

### 1. Repository Setup
```bash
git clone https://github.com/zeekalph/genium.git
cd genium
```

### 2. ML Microservice Setup
```bash
cd ml
python -m venv venv

# On Linux or macOS:
source venv/bin/activate

# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env
# Provide your GOOGLE_API_KEY in ml/.env

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Backend Setup
```bash
cd ../backend
pnpm install

# Configure environment variables
# Set ML_SERVICE_URL=http://localhost:8000
# Set GEMINI_API_KEY_2=<your-gemini-key>

pnpm prisma generate
pnpm prisma db push

pnpm start:dev
```

### 4. Frontend Web Application Setup
```bash
cd ../app
pnpm install

# Start development server on port 3000
pnpm dev
```

Visit `http://localhost:3000` in your browser.

---

## Production Deployment

### Docker Deployment for ML Microservice
The machine learning component includes a production-ready, multi-stage Dockerfile:
```bash
cd ml
docker build -t genium-ml:latest .
docker run -d -p 8000:8000 -e GOOGLE_API_KEY="your-key-here" -e PORT=8000 genium-ml:latest
```

### DigitalOcean Droplet / App Platform Architecture
- The backend NestJS API and PostgreSQL database run on DigitalOcean with persistent volume mounts to retain SQLite or PostgreSQL database state across container deployments.
- The Next.js frontend is deployed via DigitalOcean App Platform or Vercel, using Next.js rewrites to proxy API requests directly to the backend service.
- Synthetic datasets are exported periodically to DigitalOcean Spaces S3-compatible object storage.

---

## Scope and Responsible AI Boundaries

1. Physical Packaging Verification: Genium confirms label printing, typographic consistency, barcode validity, and registry congruence. It does not replace mass spectrometry, HPLC chemical purity testing, or laboratory assay.
2. No Direct Medical Advice: Explanations provide verification context and regulatory recommendations. Genium does not prescribe medications, calculate medical dosages, or replace consultations with licensed physicians and pharmacists.
3. Fail-Safe Fallbacks: In the event of vision service latency or connectivity drops, Genium defaults to conservative, protective guidance, directing users to verify scratch codes or inspect packaging with a licensed pharmacist.

---

## License

This project is licensed under the MIT License. See the LICENSE file for complete legal terms.
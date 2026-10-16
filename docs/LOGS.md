# Genium — Build Journey, Architecture Decisions & Session Logs

> **Notice for Any AI Agent / Teammate Joining This Project:**
> This document is the **Single Source of Truth (SSOT)** for project progress, architectural decisions, completed work, and current active tasks.
> Before taking any action or writing code:
> 1. Read the **Current Status & System Snapshot** directly below to avoid redundant work.
> 2. Note the monorepo layout: **Next.js frontend lives in `app/`**, and **NestJS backend lives in `backend/`**.
> 3. Check the **Architecture & Contract Baseline** to ensure any new code strictly matches agreed endpoints.
> 4. Check **Immediate Next Steps & Active Task Board** to know exactly what to build next.
> 5. **MANDATORY**: At the conclusion of any major implementation, update the **Session Log**, **System Snapshot**, and **Decisions Record** in this document.

---

## 1. System Snapshot & Quick Status

| Attribute              | Current Value / State                                                                                                                     |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Product**            | **Genium** — Verify medicine & food via phone photo against NAFDAC Greenbook + crowd batch intelligence + multilingual Gemma 4 explainer. |
| **Active Build Phase** | **Phase 1: Skeletons, Backend Core & Frontend Shell**                                                                                    |
| **Backend Runtime**    | **NestJS 11** (TypeScript, Express platform, Node.js) in `backend/`                                                                       |
| **Frontend Runtime**   | **Next.js 16** (App Router, React 19, Tailwind CSS v4, Lucide) in `app/`                                                                  |
| **ML / AI Service**    | Gemma 4 Vision (extraction), Gemma 4 Multilingual (explainer: EN, YO, HA, IG, PCM), Gemma 4 Parser & Dataset Expander (JSONL) in `ml/`   |
| **Package Manager**    | `pnpm` (Note: requires `pnpm approve-builds` for native deps like `@parcel/watcher` in `backend/`)                                      |
| **Database**           | SQLite (dev) / Managed PostgreSQL (DigitalOcean with persistent disk)                                                                    |
| **Hosting Target**     | DigitalOcean (Droplet or App Platform with persistent volume)                                                                             |
| **Current Blocker**    | None. Backend & Frontend initialized; resolving git synchronization.                                                                     |

### Monorepo Project Layout

```
genium/
├── app/                        <-- Next.js 16 Full-Stack / Frontend (App Router, Tailwind v4, Mobile Scanner UI)
│   ├── app/                    <-- App Router (layout.tsx, page.tsx, globals.css)
│   ├── public/                 <-- Static assets, mock packaging images
│   ├── package.json            <-- Next.js 16.4.1, React 19.3.0, Tailwind v4
│   └── tsconfig.json           <-- Frontend TypeScript config
├── backend/                    <-- NestJS 11 Backend API Service
│   ├── src/                    <-- Modules: scan/, report/, batches/, dataset/, health/
│   ├── package.json            <-- NestJS 11, TypeScript, Express platform
│   └── tsconfig.json           <-- Backend TypeScript config
├── ml/                         <-- ML Scripts & Data Pipelines
│   └── scrape_greenbook.py     <-- NAFDAC Greenbook registry scraper
├── docs/                       <-- Documentation & Architecture
│   ├── ABOUT.md                <-- Core concept, problem statement, pitch narrative
│   ├── PLAN.md                 <-- 4-hour timeline, API contracts, demo checklist
│   └── LOGS.md                 <-- (THIS FILE) Single Source of Truth & build log
├── AGENTS.md                   <-- Workspace agent rules & directive protocols
├── BACKEND_PLAN.md             <-- Backend execution plan
└── LICENSE
```

### Environment & Toolchain

- **Node.js:** v24.18.0
- **Package Manager:** `pnpm` (v11 / v12)
- **Frontend Commands:** Run inside `app/` (e.g., `pnpm --dir app dev` or `cd app; pnpm dev`).
- **Backend Commands:** Run inside `backend/` (e.g., `pnpm --dir backend start:dev` or `cd backend; pnpm start:dev`).

---

## 2. API Contract Baseline (Agreed)

Frontend builds against mocks/backend; backend implements these exact shapes:

### 2.1. `POST /api/scan`

- **Request**: `multipart/form-data` with `image` (carton, required), `blister` (inner strip, optional), `lang` (`en` | `yo` | `ha` | `ig` | `pcm`)
- **Response**:

```json
{
  "scan_id": "sc_001",
  "extracted": {
    "reg_no": { "value": "A4-100137", "confidence": 0.97 },
    "product_name": { "value": "Augmentin", "confidence": 0.95 },
    "manufacturer": { "value": "Unknown Pharma Ltd", "confidence": 0.88 },
    "batch_no": { "value": "B24091", "confidence": 0.91 },
    "expiry": { "value": "2027-08", "confidence": 0.93 }
  },
  "checks": [
    { "id": "reg_exists", "pass": true, "detail": "Number found in registry" },
    {
      "id": "reg_matches_prod",
      "pass": false,
      "detail": "Number belongs to Emzor Paracetamol"
    },
    { "id": "dates_valid", "pass": true, "detail": "Expiry in the future" },
    {
      "id": "carton_vs_blister",
      "pass": null,
      "detail": "No blister photo supplied"
    },
    { "id": "batch_reports", "pass": true, "detail": "0 reports on this batch" }
  ],
  "verdict": "red",
  "explanation": "Text in the selected language",
  "explanations": {
    "en": "English explanation",
    "yo": "Yoruba explanation",
    "ha": "Hausa explanation",
    "ig": "Igbo explanation",
    "pcm": "Pidgin explanation"
  },
  "next_step": "Show this pack to a pharmacist or report to NAFDAC",
  "batch_risk": { "batch_no": "B24091", "reports": 0, "score": 0.1 }
}
```

### 2.2. `POST /api/report`

- **Request**: `{ "text": "free text", "batch_no": "B24091 (opt)", "product_hint": "opt", "state": "Lagos (opt)" }`
- **Response**:

```json
{
  "report_id": "rp_001",
  "parsed": {
    "batch_number": "B24091",
    "anomaly_type": "DISSOLUTION_OR_TASTE_FAILURE",
    "severity": "HIGH",
    "standardized_summary": "User reports tablet crumbles into chalky powder."
  },
  "batch_risk": {
    "batch_no": "B24091",
    "reports": 3,
    "score": 0.82,
    "level": "high"
  },
  "dataset_rows_added": 3
}
```

### 2.3. Dashboard & Intel Endpoints

- `GET /api/hotspots`: Returns batches grouped by state/region with report counts, risk score, and risk level (`low` | `medium` | `high`).
- `GET /api/dataset`: Live synthetic/parsed JSONL training rows for dataset drawer.
- `GET /api/dataset/export`: Streams `genium_dataset.jsonl` export for download.
- `GET /api/health`: Healthcheck endpoint for DigitalOcean deployment monitoring.

### 2.4. 3-Tier Verdict System

- **Green:** Label matches NAFDAC Greenbook, carton matches blister, 0 adverse batch reports ("No red flags found" — never claim chemical purity).
- **Amber:** Label matches Greenbook, but batch has crowd-reported quality/anomaly flags or rapid scan anomalies.
- **Red:** Number doesn't exist, belongs to another product/brand, or carton vs. blister contradicts.

---

## 3. Database Schema Blueprint

1. **`products`**: `reg_no` (PK, normalized uppercase), `name`, `manufacturer`, `category`, `description`, `mas_required`, `source`
2. **`scans`**: `id` (PK), `created_at`, `image_hash`, `extracted` (JSON), `checks` (JSON), `verdict`, `lang`, `latency_ms`
3. **`reports`**: `id` (PK), `text`, `parsed` (JSON), `batch_no`, `state`, `pharmacist_flag`, `created_at`
4. **`batches`**: `batch_no` (PK), `product_ref`, `report_count`, `score`, `level` (`green`|`amber`|`red`), `state`, `updated_at`
5. **`dataset_rows`**: `id` (PK), `instruction`, `input`, `output`, `lang`, `source` (`gemma-synthetic`), `created_at`

---

## 4. Architectural Decision Records (ADRs)

### ADR-001: Backend Framework Selection (NestJS 11)
- **Date**: 2026-10-16
- **Decision**: NestJS 11 with TypeScript over plain Express or FastAPI in `backend/`.
- **Context**: The team needed modular architecture, typed dependency injection, robust DTO/class-validator validation, and clean structure for multi-step pipelines (scan validation, Gemma calls, registry checks, batch risk engine).
- **Consequences**: Structured modules (`scan/`, `report/`, `registry/`, `batches/`, `dataset/`), fast cold starts, strong typing.

### ADR-002: Frontend Framework Selection (Next.js 16 in `app/`)
- **Date**: 2026-10-16
- **Decision**: Next.js 16 with React 19 and Tailwind CSS v4 in `app/`.
- **Context**: High-performance UI rendering, split-view desktop dashboard + mobile-first scanner, fast local dev with Turbopack.
- **Consequences**: Frontend code is strictly encapsulated in `app/`, keeping the root clean for monorepo docs and tooling.

### ADR-003: Package Manager & Native Dependency Resolution
- **Date**: 2026-10-16
- **Decision**: pnpm with approved build scripts.
- **Context**: `nest new backend` exited with a script execution block due to pnpm v11's security model for native dependencies (`@parcel/watcher`).
- **Resolution**: Ran `pnpm approve-builds --all` in `backend/`. Build and lockfile verified cleanly.

### ADR-004: All-Language Explanations in Single Scan Payload
- **Date**: 2026-10-16
- **Decision**: Include `explanations` map with all 5 languages (`en`, `yo`, `ha`, `ig`, `pcm`) alongside the active `explanation` string in `POST /api/scan`.
- **Rationale**: Enables zero-latency, offline-capable language switching in the UI without triggering a second LLM inference call or waiting for network round-trips.

### ADR-005: State Field on Reports for Real-Time Hotspot Mapping
- **Date**: 2026-10-16
- **Decision**: Make `state` an explicit (optional) field on `POST /api/report`.
- **Rationale**: Powers the `GET /api/hotspots` dashboard query directly without needing expensive geolocation reverse-geocoding on free text.

### ADR-006: Deterministic Fallback & Crash Prevention Policy
- **Date**: 2026-10-16
- **Decision**: Never allow a Gemma API timeout or JSON parsing error to crash an endpoint or return a 500 error.
- **Rationale**: For demo & production stability, any LLM timeout (12s limit) or schema invalidity triggers a canned fallback:
  - Scan extraction failure -> fallback to `"could not read label with sufficient clarity"` verdict.
  - Report parser failure -> fallback to `anomaly_type: "OTHER"`.

### ADR-007: Multi-Agent Continuity & State Logging
- **Date**: 2026-10-16
- **Decision**: Maintain `docs/LOGS.md` with updated system state, concrete ADRs, and session logs, paired with `AGENTS.md` instructions.
- **Rationale**: Avoids merge conflicts, re-asking foundational questions, and token burn across multiple agents and teammates.

---

## 5. Chronological Session Logs

### [Session 0] — 2026-10-16: Backend Setup & Workspace Alignment
- **Engineer / Agent**: Team & Antigravity AI
- **What Was Done**:
  1. Reviewed `docs/ABOUT.md`, `docs/PLAN.md`, and `BACKEND_PLAN.md`.
  2. Scaffolded backend using NestJS 11 in `backend/`.
  3. Resolved pnpm v11 script execution approval block (`pnpm approve-builds --all`).
  4. Verified `pnpm install --strict-peer-dependencies=false` and `pnpm build` complete cleanly with exit code 0.
  5. Removed nested `backend/.git` repository so the root repository tracks the workspace cleanly.
  6. Established `docs/LOGS.md` as the unified project memory and log.
  7. Created workspace memory rules in `AGENTS.md` (including explicit rule to only follow user direction).
  8. Synchronized with updated roles in `docs/PLAN.md`.
- **Current State**: Backend environment healthy, dependencies installed and built, ready for module scaffolding and endpoint implementation.

### [Session 1] — 2026-10-16: Frontend Architecture & Monorepo Cohesion
- **Engineer / Agent**: Team & Antigravity AI
- **What Was Done**:
  1. Audited repository structure: Next.js 16 in `app/`, NestJS 11 in `backend/`, scraper in `ml/`.
  2. Verified Next.js 16 + React 19 + Tailwind v4 setup in `app/`.
### [Session 2] — 2026-10-16: Prisma 7.0 & SQLite Verification Database
- **Engineer / Agent**: Team & Antigravity AI
- **What Was Done**:
  1. Installed Prisma `7.10.0`, `@prisma/client`, and `@prisma/adapter-better-sqlite3`.
  2. Configured Prisma schema with `Product`, `Scan`, `Report`, `Batch`, and `DatasetRow` models.
  3. Applied schema to SQLite (`backend/dev.db`) using `prisma db push`.
  4. Created global NestJS `PrismaModule` & `PrismaService` with `PrismaBetterSqlite3` driver adapter.
  5. Seeded `backend/dev.db` with **11,135 unique verified products** scraped from NAFDAC Greenbook & Food registry.
  6. Verified `batches` table starts clean (0 mock entries) for pure dynamic crowd reporting.
- **Current State**: SQLite database active, fully populated with 11,135 official products, ready for backend NestJS endpoints.

### [Session 3] — 2026-10-16: ML Vision Extractor v1 & Test Suite Verification
- **Engineer / Agent**: Team & Antigravity AI
- **What Was Done**:
  1. Built [ml/vision_extractor.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/vision_extractor.py) implementing packaging OCR extraction prompt v1 with calibrated per-field confidence scoring (`reg_no`, `product_name`, `manufacturer`, `batch_no`, `expiry`).
  2. Built regex brace extractor ensuring 100% valid JSON parsing regardless of model conversational preface or markdown backticks, with deterministic fallbacks (`value: null`, `confidence: 0.0`).
  3. Created [ml/test_suite.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/test_suite.py) testing 6 diverse drug packaging cases (Augmentin genuine, Emzor Paracetamol, Coartem antimalarial, cloned label prop, crowd-flagged batch prop, and damaged/scratched label).
  4. Executed the test suite with 6/6 tests passing strict contract validation.
  5. Exported contract-verified sample payload to [ml/sample_extraction_handoff.json](file:///c:/Users/USER/Documents/GitHub/genium/ml/sample_extraction_handoff.json) for Backend + Data `/api/scan` pipeline integration.
  6. Completed and checked off Hour 0:30–1:30 milestones in [ml/checklist.md](file:///c:/Users/USER/Documents/GitHub/genium/ml/checklist.md).
- **Current State**: Vision extraction engine v1 operational, tested, and contract handoff artifact ready for backend integration.

### [Session 4] — 2026-10-16: Google AI Studio Integration, Packaging Cross-Check & E2E Pipeline
- **Engineer / Agent**: Team & Antigravity AI
- **What Was Done**:
  1. Configured Google AI Studio (`GEMINI_API_KEY`) and upgraded the computer vision extraction engine ([ml/vision_extractor.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/vision_extractor.py)) to `google-genai` with `gemini-2.5-flash` in native JSON mode with sub-6s latency.
  2. Implemented strict anti-hallucination guardrails, surface awareness, and character disambiguation (`0` vs `O`, `8` vs `B`) tested across real images in `/ml/images` (`spec1.jpg` to `spec6.jpg`). Verified front-only medicine cartons return `null` and `0.0` confidence for absent flap numbers instead of hallucinating.
  3. Built [ml/blister_comparator.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/blister_comparator.py) for carton vs. blister packaging cross-examination, verifying batch numbers, expiration dates, and physical tablet appearance (verified detecting debossed `R4` on Risperdal in `spec3.jpg`).
  4. Built and verified [ml/e2e_scan_pipeline.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/e2e_scan_pipeline.py): wired vision extraction directly into the 11,135 product SQLite database (`backend/dev.db`), successfully verifying the core Genium clone detection (flagged Augmentin box with stolen Isoniazid NAFDAC `A4-100137` as `Verdict: RED`).
  5. Completed and checked off Hour 1:30–2:45 deliverables in [ml/checklist.md](file:///c:/Users/USER/Documents/GitHub/genium/ml/checklist.md).
- **Current State**: Computer vision extraction and carton vs. blister packaging comparison engines are fully operational and verified end-to-end against the live NAFDAC SQLite database.

### [Session 4] — 2026-10-16: FastAPI ML Vision Service Microservice (`ml/main.py`)
- **Engineer / Agent**: Team & Antigravity AI
- **What Was Done**:
  1. Configured FastAPI microservice in `ml/main.py` exposing `POST /extract` and `GET /health`.
  2. Implemented multipart image ingestion accepting primary (`image`/`file`) and optional secondary `blister` photos.
  3. Integrated `VisionExtractor` pipeline with robust non-crashing fallback logic and latency tracking.
  4. Verified healthcheck and error handling using Starlette TestClient (returns HTTP 200 with calibrated schema even on degraded input).
- **Current State**: `ml/main.py` active and ready to be called over HTTP by the NestJS backend `ScanService`.

### [Session 5] — 2026-10-16: Barcode Scanning, QR Code & Redirected Link Resolution Engine
- **Engineer / Agent**: Team & Antigravity AI
- **What Was Done**:
  1. Built [ml/barcode_resolver.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/barcode_resolver.py) using `zxing-cpp` to detect 1D barcodes (EAN-13, UPC, Code 128) and 2D codes (QR, DataMatrix, GS1 Digital Link) directly from packaging photos.
  2. Implemented GS1 Digital Link parser extracting Application Identifiers: GTIN `(01)`, Batch `(10)`, Expiry `(17)`, and Serial `(21)`.
  3. Built automated HTTP redirect follower (`resolve_url`): traces URL redirect chains safely, extracts destination HTML/JSON payloads, and uses Google AI Studio (`gemini-2.5-flash`) to parse structured regulatory details (`product_name`, `manufacturer`, `batch_no`, `verification_status`).
  4. Integrated `BarcodeResolver` directly into [ml/vision_extractor.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/vision_extractor.py) and [ml/main.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/main.py): single scan now simultaneously extracts packaging OCR and decodes & resolves barcode verification links.
  5. Verified end-to-end with [ml/test_integrated_barcode_scan.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/test_integrated_barcode_scan.py): scanned composite medicine pack with QR code, followed redirect chain, and extracted structured drug verification details.
- **Current State**: Vision model enhanced with dual-track verification: printed packaging OCR + barcode/QR digital link resolution.

---

## 6. Known Gotchas & Constraints

1. **pnpm v11 Script Approval**: If adding packages with C/C++ or native build scripts in `backend/`, execute `pnpm approve-builds` or configure approval.
2. **Persistence on DigitalOcean**: When deploying to DigitalOcean, ensure SQLite database is stored on a persistent mounted volume or migrate connection to Managed PostgreSQL to prevent data loss on container redeploys.
3. **Demo Cache**: Prepare pre-computed responses for the 3 demo pack images (genuine, mismatched registration, crowd-flagged batch) so presentation runs flawlessly even on venue Wi-Fi drops.
4. **Language Validation**: Translations for Yoruba, Hausa, Igbo, and Pidgin must be validated with native speaker sanity checks.

---

## 7. Active Task Board & Immediate Next Steps

### Backend Tasks (`backend/`)
- [x] Set up database service (Prisma 7.0 / Better-SQLite3) with the 5 core tables and seed 11,135 NAFDAC products.
- [ ] Create NestJS Modules:
  - `HealthModule` (`/api/health`)
  - `ScanModule` (`/api/scan`)
  - `ReportModule` (`/api/report`)
  - `BatchesModule` (`/api/hotspots`)
  - `DatasetModule` (`/api/dataset`, `/api/dataset/export`)
- [ ] Enable CORS for frontend development (`localhost:3000`, `localhost:5173`) and production URLs.
- [ ] Set up global API prefix (`/api`).
- [ ] Implement contract-shaped mock responses for all 5 endpoints so frontend development can unblock immediately.

### Frontend Tasks (`app/`)
- [ ] Curate NAFDAC Greenbook snapshot (`app/data/greenbook_snapshot.json`) with 50 high-frequency Nigerian medicines & foods.
- [ ] Build split-view layout: Mobile scanner simulator (left) + Live Risk & Hotspot Dashboard (right).
- [ ] Connect language selector (`en`, `yo`, `ha`, `ig`, `pcm`) to toggle multi-language verdict display instantly.

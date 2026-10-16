# Genium — Build Journey, Architecture Decisions & Session Logs

> **Single Source of Truth for Human & AI Teammates**  
> **How to Use This File (For AI Agents & Teammates):**  
> 1. Read the **Current Status & System Snapshot** first to avoid redundant questions or burning unnecessary tokens.  
> 2. Check the **Architecture & Contract Baseline** to ensure any new code matches already agreed-upon schemas and endpoints.  
> 3. Check **Immediate Next Steps** for the current active task.  
> 4. **MANDATORY**: At the conclusion of any major implementation, update the **Session Log**, **System Snapshot**, and **Decisions Record** in this document.

---

## 1. System Snapshot & Quick Status

| Attribute | Current Value / State |
| :--- | :--- |
| **Product** | **Genium** — Verify medicine & food via phone photo against NAFDAC Greenbook + crowd batch intelligence + multilingual Gemma 4 explainer. |
| **Active Build Phase** | **Phase 1: Backend Skeleton & Core Endpoints** (Target: Hour 0:30–1:30 of 4-hour build) |
| **Backend Runtime** | **NestJS 11** (TypeScript, Express platform, Node.js) in `backend/` |
| **Package Manager** | **pnpm v11.2.2** (Note: requires `pnpm approve-builds` for native deps like `@parcel/watcher`) |
| **Frontend Runtime** | Next.js / React + Tailwind CSS + Framer Motion + shadcn/ui (Mobile-first scan UI + desktop dual view) |
| **ML / AI Service** | Gemma 4 Vision (extraction), Gemma 4 Multilingual (explainer: EN, YO, HA, IG, PCM), Gemma 4 Parser & Dataset Expander (JSONL) |
| **Database** | SQLite (dev) / PostgreSQL (DigitalOcean droplet with persistent disk) |
| **Hosting Target** | DigitalOcean (Droplet or App Platform with persistent volume) |
| **Current Blocker** | None. Backend initialized, build passing. |

---

## 2. API Contract Baseline (Agreed)

Frontend builds against mocks; backend implements these exact shapes:

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
    { "id": "reg_matches_prod", "pass": false, "detail": "Number belongs to Emzor Paracetamol" },
    { "id": "dates_valid", "pass": true, "detail": "Expiry in the future" },
    { "id": "carton_vs_blister", "pass": null, "detail": "No blister photo supplied" },
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

---

## 3. Database Schema Blueprint

1. **`products`**: `reg_no` (PK, normalized uppercase), `name`, `manufacturer`, `category`, `description`, `mas_required`, `source`
2. **`scans`**: `id` (PK), `created_at`, `image_hash`, `extracted` (JSON), `checks` (JSON), `verdict`, `lang`, `latency_ms`
3. **`reports`**: `id` (PK), `text`, `parsed` (JSON), `batch_no`, `state`, `pharmacist_flag`, `created_at`
4. **`batches`**: `batch_no` (PK), `product_ref`, `report_count`, `score`, `level` (`green`|`amber`|`red`), `state`, `updated_at`
5. **`dataset_rows`**: `id` (PK), `instruction`, `input`, `output`, `lang`, `source` (`gemma-synthetic`), `created_at`

---

## 4. Architectural Decision Records (ADRs)

### ADR-001: Backend Framework Selection
- **Date**: 2026-10-16
- **Decision**: NestJS 11 with TypeScript over plain Express or FastAPI.
- **Context**: The team needed modular architecture, typed dependency injection, robust DTO/class-validator validation, and clean structure for multi-step pipelines (scan validation, Gemma calls, registry checks, batch risk engine).
- **Consequences**: Structured modules (`scan/`, `report/`, `registry/`, `batches/`, `dataset/`), fast cold starts, strong typing.

### ADR-002: Package Manager & Native Dependency Resolution
- **Date**: 2026-10-16
- **Decision**: pnpm v11.2.2 with approved build scripts.
- **Context**: `nest new backend` exited with a script execution block due to pnpm v11's security model for native dependencies (`@parcel/watcher`).
- **Resolution**: Ran `pnpm approve-builds --all` in `backend/`. Build and lockfile verified cleanly.

### ADR-003: All-Language Explanations in Single Scan Payload
- **Date**: 2026-10-16
- **Decision**: Include `explanations` map with all 5 languages (`en`, `yo`, `ha`, `ig`, `pcm`) alongside the active `explanation` string in `POST /api/scan`.
- **Rationale**: Enables zero-latency, offline-capable language switching in the UI without triggering a second LLM inference call or waiting for network round-trips.

### ADR-004: State Field on Reports for Real-Time Hotspot Mapping
- **Date**: 2026-10-16
- **Decision**: Make `state` an explicit (optional) field on `POST /api/report`.
- **Rationale**: Powers the `GET /api/hotspots` dashboard query directly without needing expensive geolocation reverse-geocoding on free text.

### ADR-005: Deterministic Fallback & Crash Prevention Policy
- **Date**: 2026-10-16
- **Decision**: Never allow a Gemma API timeout or JSON parsing error to crash an endpoint or return a 500 error.
- **Rationale**: For demo & production stability, any LLM timeout (12s limit) or schema invalidity triggers a canned fallback:
  - Scan extraction failure -> fallback to `"could not read label with sufficient clarity"` verdict.
  - Report parser failure -> fallback to `anomaly_type: "OTHER"`.

---

## 5. Session & Chronology Log

### Session 0: Project Setup & Baseline Alignment
- **Timestamp**: 2026-10-16
- **Engineer**: Team & Antigravity AI
- **What Was Done**:
  1. Reviewed `docs/ABOUT.md`, `docs/PLAN.md`, and `BACKEND_PLAN.md`.
  2. Scaffolded backend using NestJS 11 in `backend/`.
  3. Resolved pnpm v11 script execution approval block (`pnpm approve-builds --all`).
  4. Verified `pnpm install --strict-peer-dependencies=false` and `pnpm build` complete cleanly with exit code 0.
  5. Removed nested `backend/.git` repository so the root repository tracks the workspace cleanly.
  6. Established `docs/LOGS.md` as the unified project memory and log.
  7. Created workspace memory rules in `AGENTS.md` (including explicit rule to only follow user direction) so all future AI agent sessions inherit context instantly.
  8. Synchronized with updated roles in `docs/PLAN.md` (Backend + Data owns registry snapshot, NAFDAC lookups, datasets, and text prompts; ML owns vision extraction and blister comparison).
- **Current State**: Backend environment healthy, dependencies installed and built, ready for module scaffolding and endpoint implementation.

---

## 6. Known Gotchas & Constraints

1. **pnpm v11 Script Approval**: If adding packages with C/C++ or native build scripts, execute `pnpm approve-builds` or configure approval.
2. **Persistence on DigitalOcean**: When deploying to DigitalOcean, ensure SQLite database is stored on a persistent mounted volume or migrate connection to Managed PostgreSQL to prevent data loss on container redeploys.
3. **Demo Cache**: Prepare pre-computed responses for the 3 demo pack images (genuine, mismatched registration, crowd-flagged batch) so presentation runs flawlessly even on venue Wi-Fi drops.
4. **Language Validation**: Translations for Yoruba, Hausa, Igbo, and Pidgin must be validated with native speaker sanity checks.

---

## 7. Immediate Next Steps (Phase 1 Execution)

1. [ ] Create NestJS Modules:
   - `HealthModule` (`/api/health`)
   - `ScanModule` (`/api/scan`)
   - `ReportModule` (`/api/report`)
   - `BatchesModule` (`/api/hotspots`)
   - `DatasetModule` (`/api/dataset`, `/api/dataset/export`)
2. [ ] Enable CORS for frontend development (`localhost:3000`, `localhost:5173`) and production URLs.
3. [ ] Set up global API prefix (`/api`).
4. [ ] Implement contract-shaped mock responses for all 5 endpoints so frontend development can unblock immediately.
5. [ ] Set up database service (Prisma / TypeORM / Better-SQLite3) with the 5 core tables.

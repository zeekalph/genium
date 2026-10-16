# Genium — Project Build Logs & Agent State Directory

> **Notice for Any AI Agent / Teammate Joining This Project:**
> This document is the **Single Source of Truth (SSOT)** for project progress, architectural decisions, completed work, and current active tasks.
> Before taking any action or writing code:
> 1. Read the **Quick Context & Current System State** directly below.
> 2. Note the repository layout: **the Next.js full-stack app lives in the `app/` subdirectory**.
> 3. Check **Active Tasks & Next Steps** to know exactly what to build next.
> 4. After completing your work, update the **System State**, **Task Board**, and append an entry in the **Session Log** at the bottom.

---

## 1. Quick Context & Current System State

- **Project Name:** Genium ([docs/ABOUT.md](file:///C:/Users/PC/desktop/coding/genium/docs/ABOUT.md))
- **Primary Goal:** Multilingual counterfeit drug and food verification platform for Nigeria using Gemma 4 Vision OCR, deterministic NAFDAC Greenbook cross-checks, crowdsourced batch risk intelligence, and synthetic adaptive dataset generation.
- **Current Phase:** **Phase 1 — Skeletons & Contract Wiring**
- **Repository Root:** `C:\Users\PC\desktop\coding\genium`
- **Application Code Working Directory:** `C:\Users\PC\desktop\coding\genium\app`
- **Target Deployment:** DigitalOcean (App Platform or Droplet)
- **Supported Languages:** English (`en`), Yorùbá (`yo`), Hausa (`ha`), Igbo (`ig`), Nigerian Pidgin (`pcm`).

### Project Layout
```
genium/
├── app/                        <-- Next.js 16 Full-Stack Application (Frontend + API Routes)
│   ├── app/                    <-- App Router (layout.tsx, page.tsx, globals.css)
│   │   └── api/                <-- API Route Handlers (/api/scan, /api/report, /api/hotspots, etc.)
│   ├── public/                 <-- Static assets, mock packaging images
│   ├── package.json            <-- Next.js 16.4.1, React 19.3.0, Tailwind v4
│   ├── tsconfig.json           <-- TypeScript configuration
│   └── node_modules/
├── docs/                       <-- Documentation & Architecture
│   ├── ABOUT.md                <-- Core concept, problem statement, pitch narrative
│   ├── PLAN.md                 <-- 4-hour timeline, API contracts, demo checklist
│   └── LOGS.md                 <-- (THIS FILE) Single Source of Truth & build log
└── LICENSE
```

### Environment & Toolchain
- **Node.js:** v24.18.0
- **Package Manager:** `pnpm` (v12.4.2 installed)
- **Next.js Version:** `16.4.1` (App Router)
- **React Version:** `19.3.0`
- **Styling:** Tailwind CSS `v4` (`@tailwindcss/turbopack`)
- **Commands:** Always run package commands inside `app/` (e.g. `cd app; pnpm dev` or `pnpm --dir app dev`).

---

## 2. Architecture & Contract Quick Reference

All backend API routes live in `app/app/api/` and strictly adhere to the contracts defined in [docs/PLAN.md](file:///C:/Users/PC/desktop/coding/genium/docs/PLAN.md):

1. `POST /api/scan`:
   - **Input:** `multipart/form-data` with `image` (pack/carton), optional `blister` (inner foil), `lang` (`en|yo|ha|ig|pcm`).
   - **Output:** `{ scan_id, extracted: { reg_no, product_name, manufacturer, batch_no, expiry }, checks: [...], verdict: 'green'|'amber'|'red', explanation, next_step, batch_risk }`.
2. `POST /api/report`:
   - **Input:** `{ text, batch_no?, product_hint? }`.
   - **Output:** `{ report_id, parsed: { batch_number, anomaly_type, severity, standardized_summary }, batch_risk: { batch_no, reports, score, level }, dataset_rows_added }`.
3. `GET /api/hotspots`:
   - **Output:** Array of batches with report count, risk level, and regional summary for live dashboard polling (every 2s).
4. `GET /api/dataset`:
   - **Output:** Live generated JSONL training records for the side-drawer.
5. `GET /api/dataset/export`:
   - **Output:** File download stream (`genium_dataset.jsonl`).

### 3-Tier Verdict System
- **Green:** Label matches NAFDAC Greenbook, carton matches blister, 0 adverse batch reports.
- **Amber:** Label matches Greenbook, but batch has crowd-reported quality/anomaly flags or rapid scan anomalies.
- **Red:** Number doesn't exist, belongs to another product/brand, or carton vs. blister contradicts.

---

## 3. Active Task Board

| Task | Status | Owner / Notes |
| :--- | :---: | :--- |
| Project Log (`docs/LOGS.md`) initialization | **DONE** | Comprehensive SSOT for zero-conflict multi-agent continuity |
| Next.js App Discovery & Environment Sync | **DONE** | App initialized in `app/` with Next.js 16, React 19, Tailwind v4 |
| Curate NAFDAC Greenbook snapshot (`app/data/greenbook_snapshot.json`) | **READY** | 50 high-frequency Nigerian medicines & food products |
| Implement API Route Stubs (`app/app/api/...`) | **READY** | `/api/scan`, `/api/report`, `/api/hotspots`, `/api/dataset`, `/api/dataset/export` |
| Install UI Utilities (`lucide-react`, `clsx`, `tailwind-merge`) | **QUEUED** | Needed for icons and UI styling |
| Build Mobile-First Scan & Live Dashboard Layout | **QUEUED** | Split view: Mobile phone frame (left) + Hotspot/Dataset Dashboard (right) |
| Multilingual Explainer & Gemma 4 Prompt Service | **QUEUED** | EN, Yoruba, Hausa, Igbo, Pidgin output formatting |

---

## 4. Architectural Decision Records (ADRs)

### ADR 001: Next.js App Router in `app/` Directory
- **Date:** 2026-10-16
- **Context:** The repository has a dedicated `app/` folder containing the Next.js 16 project with React 19 and Tailwind v4.
- **Decision:** All web application code, API route handlers (`app/app/api/`), components, and public assets must remain in `app/`. Root is reserved for docs, global git config, and repo-level tooling.
- **Consequence:** Future agents and teammates must execute build/dev commands targeting `app/` and avoid re-initializing Next.js at the root.

### ADR 002: Multi-Agent Continuity & State Logging
- **Date:** 2026-10-16
- **Context:** Multiple AI agent sessions or human teammates may collaborate concurrently or sequentially. Reparsing raw code or starting from scratch wastes tokens and causes merge conflicts.
- **Decision:** Maintain `docs/LOGS.md` with:
  1. Updated System State & Task Board at the top.
  2. Concrete ADRs for all non-trivial decisions.
  3. Reverse-chronological session logs with modified files and exact next steps.

---

## 5. Chronological Session Logs

### [Session 1] — 2026-10-16: Architecture Setup & Multi-Agent Protocol
- **Author/Agent:** Antigravity AI Assistant
- **Actions Taken:**
  - Audited repository: [docs/ABOUT.md](file:///C:/Users/PC/desktop/coding/genium/docs/ABOUT.md), [docs/PLAN.md](file:///C:/Users/PC/desktop/coding/genium/docs/PLAN.md), and confirmed project scope.
  - Audited local toolchain: Node.js `v24.18.0`, pnpm `12.4.2`, Python `3.13.3`, `uv` `0.12.5`.
  - Discovered existing Next.js 16.4.1 + React 19 + Tailwind v4 project located in `app/`.
  - Documented directory structure, operational commands, and API contracts in [docs/LOGS.md](file:///C:/Users/PC/desktop/coding/genium/docs/LOGS.md).
- **Files Created / Modified:**
  - `docs/LOGS.md` (Created SSOT and agent continuity manual)
- **Current Blockers:** None.
- **Immediate Next Steps for Any Agent:**
  1. Create `app/data/greenbook_snapshot.json` with 50 curated NAFDAC medicine/food records.
  2. Implement mock-contract API route stubs in `app/app/api/`:
     - `app/app/api/scan/route.ts`
     - `app/app/api/report/route.ts`
     - `app/app/api/hotspots/route.ts`
     - `app/app/api/dataset/route.ts`
     - `app/app/api/dataset/export/route.ts`
  3. Build the split-view dashboard and mobile scanner UI in `app/app/page.tsx`.

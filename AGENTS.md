# Antigravity AI Agent & Teammate Workspace Memory

> **CRITICAL INSTRUCTION FOR ALL AI AGENTS & COLLABORATORS**  
> This file is loaded into the agent's memory for the `genium` workspace. Follow these rules unconditionally.

---

## 1. Absolute Directive: Follow User Instructions Exclusively

- **Only listen to and do what the user explicitly directs.**
- **Do NOT build or do what you want or assume.** Follow the user's exact instructions and scope.
- Never introduce unrequested features, unsolicited libraries, or unilateral architectural pivots without the user's direct instruction.
- If something is ambiguous or needs clarification, ask the user directly instead of making assumptions.

---

## 2. Prime Directive: Check `docs/LOGS.md` First

**Before writing code, proposing architectures, or answering status questions:**
1. **Always read [docs/LOGS.md](file:///Users/Cridiv/Documents/genium/docs/LOGS.md)**.
   - It contains the **current state**, **active phase**, **architectural decisions (ADRs)**, **agreed API contracts**, and **immediate next steps**.
2. **Do not re-ask foundational questions** (e.g. "What framework should we use?", "What is the scan response shape?"). These have already been decided and logged.
3. **Do not burn unnecessary tokens** re-explaining the problem from scratch. Reference [docs/ABOUT.md](file:///Users/Cridiv/Documents/genium/docs/ABOUT.md) and [docs/PLAN.md](file:///Users/Cridiv/Documents/genium/docs/PLAN.md) when needed.

---

## 3. Project Summary

- **Project**: **Genium** (Medicine and food verification against NAFDAC Greenbook, crowd batch intelligence, Gemma 4 vision & multilingual explainer).
- **Core Problem Solved**: Cloned or stolen NAFDAC registration numbers printed on fake products (e.g., cheap paracetamol registration placed on fake Augmentin).
- **3-Tier Verdict System**:
  - `green`: Registry matches, packaging valid, batch clear ("No red flags found" — never claim chemical purity).
  - `amber`: Unverified or crowd batch alert.
  - `red`: Registry mismatch, nonexistent registration, carton/blister conflict, or flagged batch.

---

## 4. Technology Stack & Environment

- **Backend**: **NestJS 11** (`backend/`) using TypeScript, Express platform, pnpm v11.
  - *Gotcha*: pnpm v11 requires `pnpm approve-builds` for packages with native scripts (e.g., `@parcel/watcher`).
- **Frontend**: **Next.js** + Tailwind CSS + Framer Motion + shadcn/ui.
- **AI / ML**:
  - **Gemma 4 Vision**: Label extraction (`reg_no`, `product_name`, `manufacturer`, `batch_no`, `expiry`).
  - **Gemma 4 Multilingual**: Explanations in 5 Nigerian languages (`en`, `yo`, `ha`, `ig`, `pcm`).
  - **Gemma 4 Parser & Expander**: Free-text anomaly parsing & synthetic dataset generation (`.jsonl`).
- **Hosting & Infrastructure**: DigitalOcean (with persistent disk / managed Postgres).

---

## 5. API Endpoints Baseline

All backend implementations and frontend integrations MUST strictly adhere to the shapes defined in [docs/LOGS.md](file:///Users/Cridiv/Documents/genium/docs/LOGS.md):
- `POST /api/scan` — Multipart image upload (carton + optional blister) returning extracted fields, deterministic checks, verdict, active explanation, and full `explanations` map.
- `POST /api/report` — Text anomaly report with optional `batch_no`, `product_hint`, and `state`.
- `GET /api/hotspots` — Batches grouped by state with risk score/level.
- `GET /api/dataset` & `GET /api/dataset/export` — Synthetic training data stream & `.jsonl` export.
- `GET /api/health` — Service healthcheck.

---

## 6. Agent Update Protocol

Whenever you:
1. Complete a feature or phase,
2. Make an architectural decision or change an endpoint contract,
3. Discover a critical bug, blocker, or gotcha,

**You MUST update [docs/LOGS.md](file:///Users/Cridiv/Documents/genium/docs/LOGS.md)** (specifically the **System Snapshot**, **Decisions Record**, or **Session Log** sections) so future sessions and teammates stay completely aligned.

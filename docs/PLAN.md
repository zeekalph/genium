# Genium: 4-Hour Build Plan

We have 5 hours. We build for 4, and the last hour is buffer, rehearsal, and fixing whatever breaks. Everyone builds in the stack they're comfortable with. Edit owners, times, and tasks freely, this is a living doc.

**Rule 1:** the demo path comes first. Anything not on the demo path is a stretch goal.
**Rule 2:** deploy in Hour 1, not Hour 4.
**Rule 3:** no auth, no landing page, no settings screens. Open straight into the app.

---

## Roles (swap names as needed)

| Role           | Owner   | Stack                                                          |
| -------------- | ------- | -------------------------------------------------------------- |
| Frontend       | Nebulaz | Next.js / React, Tailwind, Framer Motion, shadcn/ui            |
| Backend        | \_\_\_  | Next.js API routes (or FastAPI), SQLite/Postgres, DigitalOcean |
| ML / Data      | \_\_\_  | Gemma 4 prompts, JSON schemas, Greenbook snapshot              |
| Product / Demo | \_\_\_  | Props, script, pitch, QA                                       |

---

## The API contract (agree on this in the first 15 minutes)

Frontend builds against mocks of these immediately, backend swaps in the real thing.

### `POST /api/scan`

Request: `multipart/form-data` with `image` (carton), optional `blister` (inner strip), `lang` (`en|yo|ha|ig|pcm`)

Response:

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
  "next_step": "Show this pack to a pharmacist or report to NAFDAC",
  "batch_risk": { "batch_no": "B24091", "reports": 0, "score": 0.1 }
}
```

### `POST /api/report`

Request: `{ "text": "free text in any language", "batch_no": "B24091 (optional)", "product_hint": "optional" }`

Response:

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

### `GET /api/hotspots`

Returns batches with report counts, risk level, and region, for the dashboard. Poll every 2 seconds, or use SSE if there's time.

### `GET /api/dataset`

Returns the live rows (JSON) for the drawer.

### `GET /api/dataset/export`

Downloads `genium_dataset.jsonl`.

---

## Timeline

### Hour 0:00 to 0:30, Setup and alignment (everyone)

- [ ] Agree on the API contract above (paste into the team chat)
- [ ] Create repo, add everyone, set up branches or agree to commit to `main` carefully
- [ ] Get Gemma 4 access working (API key or DO), test one hello-world call
- [ ] DigitalOcean credits confirmed, backend dev creates the droplet or app
- [ ] Decide the language list: EN, Yoruba, Hausa, Igbo, Pidgin

### Hour 0:30 to 1:30, Skeletons

**Frontend**

- [ ] Project scaffold, Tailwind, shadcn/ui, Framer Motion
- [ ] Layout shell: header, desktop split view (phone frame on the left, live intel dashboard on the right)
- [ ] Mock data file matching the API contract
- [ ] Language switcher component (EN / YO / HA / IG / PCM)
- [ ] Camera/upload dropzone with a "carton + blister" instruction overlay

**Backend**

- [ ] Deploy a "hello" endpoint to DigitalOcean (live URL shared with the team by 1:00)
- [ ] DB tables: `products`, `scans`, `reports`, `batches`
- [ ] Stub all 5 endpoints returning contract-shaped mock data

**ML / Data**

- [ ] Draft `greenbook_snapshot.json` with 50 products: reg no, name, manufacturer, category, physical description, MAS required (Coartem, Amatem, Augmentin, Emzor Paracetamol, Postinor-2, Amalar, Peak Milk, Indomie, Milo, Eva Water, etc.)
- [ ] Vision extraction prompt v1 with strict JSON output and per-field confidence
- [ ] Test on 5 to 10 real photos of packs

**Product / Demo**

- [ ] Collect real packs (at least 2 genuine ones)
- [ ] Make the props: a cloned-label box (a real pack with another product's NAFDAC number stuck on)
- [ ] Draft the demo script and timing

**Checkpoint at 1:30:** the deployed URL responds, the frontend renders mock data, and the vision prompt returns valid JSON on at least one real photo.

### Hour 1:30 to 2:45, Real wiring

**Frontend**

- [ ] Scan flow: capture, loading state with animated "reading label" steps, results
- [ ] Field pills with confidence (green above 90%, amber 70 to 90%, red below 70%)
- [ ] Verdict card (Green/Amber/Red) with a smooth reveal animation
- [ ] Checks list with pass/fail/unknown icons
- [ ] Explanation block that updates instantly when the language is switched
- [ ] "Report a problem" form (text input plus a language hint)

**Backend**

- [ ] Load the Greenbook snapshot into the DB
- [ ] `/scan`: image to Gemma 4 vision, then deterministic checks, then batch lookup, then the explainer call, then JSON
- [ ] `/report`: text to Gemma parser, store, update batch score
- [ ] Batch risk rule: 2 or more reports (or 1 pharmacist-tagged) pushes the batch to amber, 3 or more to red
- [ ] Schema validation on every Gemma response, with a safe fallback so a malformed response never crashes the UI

**ML / Data**

- [ ] Explainer prompt with few-shot examples in all 5 languages (faithful to the findings, no medical advice, never says "fake", says "does not match the registry")
- [ ] Report parser prompt with the anomaly taxonomy: `WRONG_REG_NUMBER`, `DISSOLUTION_OR_TASTE_FAILURE`, `THERAPEUTIC_FAILURE`, `ADVERSE_REACTION`, `PACKAGING_DEFECT`, `MISSING_MAS`, `OTHER`
- [ ] Dataset expander prompt: from each report or scan, produce 3 localized variations as JSONL rows (`instruction`, `input`, `output`, `lang`, `source`)
- [ ] Get native speakers (or a trusted friend) to sanity check the Yoruba, Hausa, Igbo, and Pidgin outputs

**Product / Demo**

- [ ] Test every prop against the live scanner, record which photos fail and why
- [ ] Take backup photos in good lighting (these are your fallback demo images)
- [ ] Write the pitch opening (the hook is: "products carrying registration numbers that belong to entirely different products")

**Checkpoint at 2:45:** one full scan works end to end on the deployed URL, with a real verdict in at least English and Yoruba.

### Hour 2:45 to 3:30, The "wow" layer

**Frontend**

- [ ] Hotspot dashboard: batch cards or a simple Nigeria state-level view (no heavy map library, a styled grid or SVG is enough), risk badges, live updates
- [ ] Dataset drawer: slides in showing new JSONL rows appearing in real time, plus an "Export dataset" button
- [ ] Transitions between scan, verdict, and report states (Framer Motion)
- [ ] Mobile-responsive check on a real phone

**Backend**

- [ ] `/hotspots` and `/dataset` endpoints live
- [ ] `/dataset/export` downloads `.jsonl`
- [ ] Response cache for the 3 demo images, so the demo renders in about 1.5s even if Wi-Fi dies
- [ ] Seed the DB with a few pre-existing reports so the dashboard isn't empty at the start

**ML / Data**

- [ ] Carton + blister comparison prompt (batch, expiry, pill description vs registry)
- [ ] Tune prompts on failure cases found by the Product person
- [ ] Prepare the "base Gemma vs tuned prompt" comparison only if time allows (stretch)

**Product / Demo**

- [ ] Full dry run with a timer, aim for under 2 minutes
- [ ] Prepare Q&A answers (see the cheat sheet below)

### Hour 3:30 to 4:00, Polish and freeze

- [ ] **Feature freeze at 3:30.** No new features after this point.
- [ ] Fix bugs from the dry run, in priority order
- [ ] Empty states, error states, loading states
- [ ] Final deploy, confirm the URL works from a phone on mobile data
- [ ] Take screenshots and record a backup screen capture of the full demo
- [ ] Write the Devpost/submission text (reuse About.md)

### Hour 4:00 to 5:00, Buffer and rehearsal

- [ ] Two more full run-throughs with the whole team
- [ ] Assign who speaks, who drives, who handles Q&A
- [ ] Charge phones, test the projector connection, have the backup video ready
- [ ] Rest. Do not push risky changes in the last 30 minutes.

---

## Demo script (about 2 minutes)

| Time | Action                                                                  | Who                   |
| ---- | ----------------------------------------------------------------------- | --------------------- |
| 0:00 | Hook: "Every one of us has looked at a pack and wondered if it's real." | Pitch lead            |
| 0:15 | Scan 1: genuine pack, green pass                                        | Driver                |
| 0:35 | Scan 2: cloned-number pack, red mismatch, switch to Yoruba, then Pidgin | Driver                |
| 1:05 | Submit a Yoruba or Pidgin report on the batch                           | Driver                |
| 1:20 | Dashboard spikes to High Risk, dataset drawer fills with rows           | Frontend dev narrates |
| 1:40 | One-line close: scale, sponsors, honest design                          | Pitch lead            |

---

## Q&A cheat sheet

- **"Can a photo catch a perfect clone with chalk inside?"** No, and we never claim it can. We catch label and registry inconsistencies, carton vs blister mismatches, abnormal batch activity, and bad-content reports from the crowd.
- **"Why not just use NAFDAC's own check?"** It's a manual lookup, it only confirms a number exists, and it doesn't check that the number belongs to _this_ product. We also add crowd intelligence they don't have.
- **"Is your registry data real?"** It's a curated snapshot for the demo. In production we sync with NAFDAC data.
- **"What about Adaption?"** We mirror the Adaptive Data workflow with live synthetic localized data, in a format ready for AutoScientist fine-tuning once we have access.
- **"How do you stop false reports?"** Thresholds, verified-pharmacist weighting, and rate limits per device.

---

## Risk register

| Risk                                | Plan B                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Gemma 4 vision is slow or flaky     | Use cached results for the 3 demo images, keep live scanning as the stretch |
| Venue Wi-Fi dies                    | Phone hotspot, plus the local cache and a backup screen recording           |
| Yoruba/Hausa/Igbo outputs are wrong | Native speaker check, pre-generated verdict texts for the demo scans        |
| Deployment breaks late              | Keep the last good build on a second DO app, or run locally as a fallback   |
| Team member blocked                 | Shout early, pair up, the Product person is the floater                     |

---

## Stretch goals (only if ahead of schedule)

- [ ] Voice readout of the verdict (browser TTS)
- [ ] Base vs prompt-tuned comparison panel
- [ ] Pharmacist-verified report badge
- [ ] Share-to-WhatsApp button on the verdict card
- [ ] Offline-first PWA caching

---

## Definition of done

- [ ] Scan, verdict, explanation works live on the deployed URL
- [ ] Red mismatch demo works reliably in at least 2 languages
- [ ] Report to dashboard spike to dataset rows works live
- [ ] Dataset export downloads a valid `.jsonl`
- [ ] Team has rehearsed at least twice
- [ ] Backup video recorded

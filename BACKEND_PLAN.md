# Genium Backend + Data Plan

Owner: Backend + Data. Covers API, DB, deploy, Greenbook snapshot, NAFDAC lookups, datasets, and the explainer / parser / expander prompts. ML (vision) hands over only the extraction JSON.

---

## 1. Architecture

```
Frontend ──► API service ──► Gemma 4 (vision: extract)          [ML's prompt]
                 │      ├──► Gemma 4 (text: explain, parse, expand)  [your prompts]
                 │      └──► SQLite/Postgres: products, scans, reports, batches, dataset_rows
                 └── background tasks: dataset row writing, expander
```

**Decisions to make in the first 10 minutes**
- **Runtime:** if you're equally comfortable, put the API inside the Next.js app (one repo, one deploy, no CORS). Use FastAPI only if Python is clearly faster for you. Do not run both.
- **Hosting:** a droplet gives you a persistent disk and a long-lived process, which suits SQLite and background tasks. If you use a managed app platform, check whether the disk persists across deploys. If it doesn't, use managed Postgres.
- **Queue:** none. Use in-process background tasks. A real queue is out of scope.
- **Secrets:** Gemma API key in environment variables only. Ship a `.env.example`.

---

## 2. Data model

**products** (the registry snapshot)
- reg_no (normalized, unique), name, manufacturer, category, strength_form, status, active_ingredients (optional), mas_required (bool), description, source (`greenbook` | `manual-pack` | `manual-portal`), retrieved_at

**scans**
- id, created_at, image_hash, lang, extracted (JSON), checks (JSON), verdict, explanations (JSON), latency_ms, from_cache (bool)

**reports**
- id, created_at, text, lang_hint, batch_no, product_hint, state, pharmacist_flag (bool), parsed (JSON), device_id

**batches**
- batch_no (unique), product_reg_no (nullable), report_count, weighted_count, score, level (`low|amber|high`), state, updated_at

**dataset_rows**
- id, created_at, instruction, input, output, lang, source (`gemma-synthetic`), origin_type (`scan|report`), origin_id

**gemma_calls** (debug log, or a log file)
- id, kind (`extract|explain|parse|expand`), latency_ms, ok (bool), error, created_at

---

## 3. Registry (Greenbook) work

**Normalization rules (apply on load and on every lookup)**
- Uppercase, trim whitespace, normalize dashes and spaces in registration numbers.
- Product names: lowercase, strip dosage and pack text, punctuation, and common suffixes ("tablets", "syrup") before comparing.

**Build order**
1. **Demo packs first.** Every pack the team will physically hold goes in exactly as printed on the pack and as listed in the Greenbook.
2. Extend toward 50: antimalarials, antibiotics, pain relief, hormonal/other (e.g. Postinor-2), herbals, and a few packaged foods.
3. Set `mas_required` from category (antimalarials, antibiotics, antidiabetics, hypertensives).
4. Food has no bulk registry, only a per-number lookup, so food rows are manual (`source: manual-portal`).
5. Validate: unique reg_no, no blanks, spot-check about 10 rows against real pack photos.
6. Record `source` and `retrieved_at` on every row.

**Access:** the Greenbook is public but has no official API or download that I found. Use a small one-time snapshot, do not hammer the site, and say in the README that it's a curated snapshot from the public Greenbook.

**Coverage warning (important):** the snapshot has about 50 products, not 6,000+. A real product missing from your snapshot must not be shown as fake. See the verdict rules below.

---

## 4. Endpoints

### POST /api/scan
- **Input:** image (required), blister (optional), lang.
- **Validate:** file type allowlist, size cap (about 5 MB), lang in the allowed set. Reject with a clear JSON error.
- **Performance target:** under 8 seconds live, under 2 seconds from cache.
- **Output:** the contract, plus the `explanations` map.

### POST /api/report
- **Input:** text (required, length-capped), batch_no / product_hint / state (optional), device id from a header or cookie.
- **Flow:** rate-limit, parse, store, update batch, queue expander, return the contract.
- **Pharmacist flag:** a simulated toggle for the demo. Say so openly.

### GET /api/hotspots
- Batches grouped by state: counts, level, `updated_at`. One cheap query; the frontend polls every 2 seconds.

### GET /api/dataset
- Latest rows, newest first, with a limit.

### GET /api/dataset/export
- Streams `genium_dataset.jsonl` with download headers.

### GET /api/health
- Returns OK plus the build version. Used for deploy checks.

### Dev-only: POST /api/admin/reset-demo
- Clears reports and batches and restores the seeded state, for rehearsals. Disable or protect it before final submission.

---

## 5. Scan pipeline (in order)

1. **Validate** the request and hash the image bytes.
2. **Cache check:** if the hash matches a pre-run demo image, return the stored response (all five languages included).
3. **Extract:** call Gemma vision with ML's prompt. Schema-validate. On bad output, retry once, then return an "unable to read label, retake photo" result (amber, no crash).
4. **Checks** (each returns pass, fail, or null):
   - `reg_exists`: normalized number found in `products`. Null if the number is missing or confidence is below 0.7.
   - `reg_matches_prod`: the number's registry name/manufacturer matches the extracted name/manufacturer after normalization. Fail on a strong mismatch (the cloned-number case). Null if product-name confidence is low.
   - `dates_valid`: expiry parses and is in the future; manufacture date before expiry if both exist. Null if missing.
   - `carton_vs_blister`: null unless a blister image is supplied. Later wired to ML's comparison prompt.
   - `batch_reports`: true for 0 or 1 reports, null for amber, false for red.
5. **Verdict rules**
   - **Red:** `reg_matches_prod` fails, or `batch_reports` fails, or the number is not in the registry **and** the product name is in the registry (the product is known but the number differs).
   - **Amber:** number not in the registry and the product is also not in the snapshot ("can't confirm, not in our snapshot"), any key check unknown, key extraction confidence below 0.7, or batch amber.
   - **Green:** everything else. Wording: "no red flags found," never "genuine" or "safe."
6. **Explain:** call the explainer with findings only (never the image). Schema-validate. On failure, use the canned per-verdict text for that language.
7. **Respond,** store the scan, and write dataset rows in the background.

---

## 6. Report pipeline and batch risk

1. Rate-limit by device (simple in-memory limiter).
2. Parse with the parser prompt. Validate against the anomaly taxonomy; fall back to `OTHER`.
3. Store the report and update the batch.
4. Batch weight: normal report = 1, pharmacist-flagged = 2.
5. **Score** = 0.1 + 0.24 × weighted count, capped at 1.0. This reproduces your contract example (0 reports gives 0.1, 3 reports gives 0.82).
6. **Level:** amber at weighted count 2 or more, red (high) at 3 or more.
7. Queue the expander and return the contract with `dataset_rows_added`.

---

## 7. Prompts (specs, not final text)

**Explainer**
- **Input:** verdict, the checks array (ids, pass values, details), extracted product name, and the target languages.
- **Output JSON:** one object per language (en, yo, ha, ig, pcm) with `explanation` and `next_step`.
- **Rules:** use only the findings; never say "fake"; say "does not match the registry"; no medical advice; when a check is unknown, say so and point to a pharmacist; short sentences (readable by low-literacy users).
- **Few-shot:** one example per verdict in all five languages, written or checked by a native speaker.
- **Open item for the team:** the contract has a single `next_step`. Either return it in the selected language only, or add a `next_steps` map like `explanations`. Decide with the frontend in Hour 0.

**Report parser**
- **Input:** free text in any of the five languages.
- **Output JSON:** batch_number (or null), anomaly_type (taxonomy), severity (LOW/MEDIUM/HIGH), standardized_summary (English).
- **Rules:** never invent a batch number; null if absent; unknown cases go to `OTHER`.

**Dataset expander (async)**
- **Input:** a parsed report.
- **Output:** 3 localized variants as rows (instruction, input, output, lang). Dedupe against existing rows.
- **Label:** `source: gemma-synthetic` on everything.

**Language quality:** a native speaker reviews Yoruba, Hausa, Igbo, and Pidgin outputs around 2:30. Pre-write the demo verdict texts as fallbacks.

---

## 8. Datasets

- **Scan rows (free):** each language's explanation paired with its findings is one row. `instruction` = task description, `input` = findings JSON, `output` = explanation text.
- **Report rows:** original report to parsed JSON, plus expander variants.
- **Export:** JSONL, one row per line, fields `instruction`, `input`, `output`, `lang`, `source`. Test that every line parses before the demo.
- **Honesty:** the drawer and README say these rows are synthetic.

---

## 9. Reliability

- 12-second timeout and one retry on every Gemma call, with latency logged.
- Every model response is schema-validated before use; a malformed response never reaches the UI.
- Demo image cache, pre-run in all five languages.
- Upload guards: file type, size, text length caps.
- Consistent JSON errors, no stack traces in responses.
- A last good build kept running on a second deployment, or a local run script.

---

## 10. Deploy

1. Create the droplet or app and set environment variables.
2. HTTPS and a public URL shared with the team by 1:00.
3. CORS for the frontend origin (skip if the API lives in the Next.js app).
4. Health check and a process manager so it restarts on crash.
5. Redeploy flow documented in two lines in the README.
6. Test from a phone on mobile data before 4:00.

---

## 11. Testing

- **Contract check:** hit each endpoint and compare response shapes to the contract.
- **Failure injection, on purpose:** Gemma timeout, malformed JSON, missing registration number, oversized image, unsupported file type, empty report text.
- **Demo smoke test (run before every rehearsal):** genuine pack gives green, cloned pack gives red, report triggers the dashboard spike, export downloads valid JSONL.
- **Reset:** run the reset script before each rehearsal and after any live test.

---

## 12. Timeline and checkpoints

| Time        | Backend + Data work                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| 0:00-0:30   | Confirm contract (plus `state`, `explanations`), lock extraction JSON with ML, repo, Gemma test call, host chosen |
| 0:30-1:30   | Health endpoint live, schema, five stubs, upload guards, demo packs in the registry. **Checkpoint 1:30** |
| 1:30-2:45   | Registry loaded, scan and report pipelines, prompts, batch risk, validation and fallbacks. **Checkpoint 2:45** |
| 2:45-3:30   | Hotspots, dataset and export, demo cache, seeds, reset script, language re-check, carton-vs-blister wired |
| 3:30-4:00   | Freeze, rate limit, error handling, failure tests, final deploy, phone test                           |
| 4:00-5:00   | Watch logs during rehearsals, no changes after 4:30                                                   |

**Cut order if short:** registry beyond demo packs and about 20 products, then the async expander, then carton-vs-blister.
**Never cut:** demo-pack registry, scan pipeline, report parsing, batch risk, demo cache.

---

## 13. Risks specific to this role

| Risk                                           | Mitigation                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| A real product missing from the snapshot shows red | Red only on a hard mismatch; unknown product gives amber "not in our snapshot" |
| Greenbook lookup is slow or blocked            | Capture the demo packs by hand first; widen later                            |
| Gemma returns malformed JSON                   | Schema validation, one retry, canned fallback texts                          |
| Native-speaker text is wrong                   | Pre-written demo verdicts, review at 2:30                                    |
| Disk resets on redeploy                        | Droplet with persistent disk or managed Postgres                             |
| You are overloaded                             | Follow the cut order; ask the Product person to test and QA, not to own data |
# ML Engineer Deliverables & Execution Checklist

> **Role**: ML Engineer (Vision & Multimodal)  
> **Core Focus**: Gemma 4 Vision extraction prompt engineering, carton vs. blister packaging comparison, and vision failure handling.  
> **Scope Clarification (Per [docs/PLAN.md](file:///c:/Users/USER/Documents/GitHub/genium/docs/PLAN.md))**: Text prompts (explainer, report parser, dataset expander), Greenbook scraping, NAFDAC lookups, and dataset `.jsonl` generation have been moved to **Backend + Data**. **ML owns Computer Vision and multimodal prompts exclusively.**

---

## 🎯 Primary Responsibilities & Handoffs

- **Sole External Handoff**: The extraction JSON payload (field names + per-field confidence scores) handed off to Backend + Data for `/api/scan`.
- **Primary AI Model**: Gemma 4 Vision.
- **Key Deliverables**:
  1. Gemma 4 Vision Carton Extraction Prompt (v1 & tuned production prompt).
  2. Gemma 4 Vision Carton vs. Blister Comparison Prompt.
  3. JSON Schema & Confidence Calibration Specification.
  4. Test dataset of 5–10 real medicine/food pack photos (with failure case tuning).
  5. Pre-extracted demo cache payloads for the 3 live presentation packs (offline contingency).

---

## ⏱️ Timeline & Hour-by-Hour Deliverables

### Hour 0:00 – 0:30: Setup & Contract Alignment
- [ ] **Gemma 4 Vision Connectivity**:
  - [ ] Configure API access / credentials for Gemma 4 Vision.
  - [ ] Execute single "hello world" multimodal test call with a sample image.
- [ ] **Lock Extraction JSON Schema** (Collaborate with Backend + Data):
  - [ ] Agree on exact field keys: `reg_no`, `product_name`, `manufacturer`, `batch_no`, `expiry`.
  - [ ] Agree on per-field confidence format: `{"value": string, "confidence": float (0.0 to 1.0)}`.
  - [ ] Lock fallback behavior for unreadable/missing fields (`value: null`, `confidence: 0.0`).

---

### Hour 0:30 – 1:30: Prompt v1 & Baseline Extraction
- [x] **Vision Extraction Prompt v1**:
  - [x] Draft system & user instructions enforcing strict JSON output ([ml/vision_extractor.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/vision_extractor.py)).
  - [x] Instruct model to locate and extract:
    - NAFDAC Registration Number (`reg_no` / `NRN`, e.g., `A4-100137` or `04-1234`).
    - Brand / Trade Name (`product_name`, e.g., `Augmentin 625mg`).
    - Manufacturer Name (`manufacturer`, e.g., `GlaxoSmithKline`).
    - Batch / Lot Number (`batch_no`, e.g., `B24091`).
    - Expiration Date (`expiry`, e.g., `2027-08` or `08/27`).
  - [x] Instruct model to assign a calibrated confidence score (`0.0`–`1.0`) per field.
- [x] **Initial Testing**:
  - [x] Test Prompt v1 against 5 to 10 real photos of medicine boxes ([ml/test_suite.py](file:///c:/Users/USER/Documents/GitHub/genium/ml/test_suite.py) executed 6 test packs).
  - [x] Verify that model output parses cleanly into valid JSON without conversational preamble or markdown backtick issues (enforced with regex brace extraction and schema validator).
- [x] **Hour 1:30 Checkpoint**:
  - [x] Extraction prompt returns valid, parseable JSON on at least 1 real pack photo (verified across all 6 test cases).
  - [x] Hand off tested JSON response sample to Backend + Data ([ml/sample_extraction_handoff.json](file:///c:/Users/USER/Documents/GitHub/genium/ml/sample_extraction_handoff.json)).

---

### Hour 1:30 – 2:45: Edge Case Tuning & Blister Comparison
- [ ] **Extraction Resilience & Prompt Tuning**:
  - [ ] Test failure cases from the Product/Demo team (glare, angled perspectives, curved surfaces, small print, low-light).
  - [ ] Tune prompt to handle partial occlusions or ambiguous characters (e.g., distinguishing `0` vs `O`, `B` vs `8`).
  - [ ] Calibrate confidence values against frontend thresholds:
    - 🟢 Green: `> 0.90` (high confidence)
    - 🟡 Amber: `0.70 – 0.90` (medium confidence)
    - 🔴 Red: `< 0.70` (low confidence / unreadable)
- [ ] **Carton vs. Blister Comparison Prompt**:
  - [ ] Design comparison prompt accepting 2 inputs: carton image + blister pack strip image (or side-by-side photo).
  - [ ] Instruct model to compare:
    - Does blister `batch_no` match carton `batch_no`?
    - Does blister `expiry` match carton `expiry`?
    - Does blister tablet/capsule visual description match expected product format?
  - [ ] Output standardized check verdict: `carton_vs_blister: { pass: boolean | null, detail: string }`.
- [ ] **Hour 2:45 Checkpoint**:
  - [ ] End-to-end scan pipeline verified with live vision extraction feeding deterministic registry lookup.

---

### Hour 2:45 – 3:30: Final Polish & Handoff
- [ ] **Finalize Carton vs. Blister Check**:
  - [ ] Hand over finalized carton + blister prompt to Backend team for integration into `/api/scan`.
- [ ] **Edge Case Hardening**:
  - [ ] Ensure prompt explicitly instructs the model to return `null` rather than hallucinating when a field is absent.
- [ ] **Stretch Goal (Optional / If Ahead of Schedule)**:
  - [ ] Prepare comparison metrics: "Base Gemma vs. Prompt-Tuned Gemma" demonstrating improved extraction accuracy.

---

### Hour 3:30 – 4:00: Freeze & Offline Demo Cache Preparation
- [ ] **Feature Freeze (3:30 PM)**:
  - [ ] No new prompt changes or architectural alterations.
- [ ] **Pre-computed Demo Image Cache**:
  - [ ] Generate and store pre-extracted JSON responses for the 3 physical presentation packs:
    1. **Pack 1 (Genuine)**: Clean pass (e.g. valid Augmentin or Emzor Paracetamol).
    2. **Pack 2 (Cloned NAFDAC Number)**: Box with stolen NAFDAC registration number (triggers Red mismatch).
    3. **Pack 3 (Flagged Batch)**: Box with batch `B24091` (triggers crowd anomaly alert).
  - [ ] Ensure pre-computed extractions are delivered to Backend for instant cache lookup in case of venue network drop.

---

### Hour 4:00 – 5:00: Dry Runs & Q&A Preparation
- [ ] Participate in 2 full team rehearsal dry runs.
- [ ] Prepare technical talking points for judge Q&A:
  - Explain vision prompt design and how per-field confidence is calibrated.
  - Reinforce the core safety stance: *Genium verifies packaging and registry consistency, not chemical composition.*

---

## 📋 Technical Deliverables Specification

### 1. Extraction JSON Schema Contract
```json
{
  "extracted": {
    "reg_no": {
      "value": "A4-100137",
      "confidence": 0.97
    },
    "product_name": {
      "value": "Augmentin 625mg",
      "confidence": 0.95
    },
    "manufacturer": {
      "value": "GlaxoSmithKline",
      "confidence": 0.88
    },
    "batch_no": {
      "value": "B24091",
      "confidence": 0.91
    },
    "expiry": {
      "value": "2027-08",
      "confidence": 0.93
    }
  }
}
```

### 2. Carton vs. Blister Comparison Contract
```json
{
  "check_id": "carton_vs_blister",
  "pass": true,
  "detail": "Batch B24091 and expiry 2027-08 on blister match outer carton.",
  "confidence": 0.94
}
```

---

## 🏁 Definition of Done for ML Engineer

- [ ] Single pack extraction prompt produces strictly valid JSON 100% of the time.
- [ ] Real demo pack photos extract correct `reg_no`, `batch_no`, and `product_name`.
- [ ] Carton vs. blister comparison prompt reliably identifies mismatched batch numbers or expiration dates.
- [ ] Pre-computed fallback JSON extractions for all 3 demo packs are tested and committed.

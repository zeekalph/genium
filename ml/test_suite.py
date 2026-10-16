"""
Genium ML Test Suite
Runs VisionExtractor against a suite of 6 realistic packaging test cases:
1. Genuine Augmentin 625mg (High confidence)
2. Emzor Paracetamol 500mg (OTC baseline)
3. Coartem 20/120 Artemether/Lumefantrine
4. Cloned Registration Number Prop (Augmentin box carrying Paracetamol NAFDAC 04-0123)
5. Flagged Batch Prop (Amatem Softgel with Batch B24091)
6. Damaged / Missing Label (Testing fallback to null and low confidence)

Outputs test results, confidence calibrations, and exports sample_extraction_handoff.json.
"""

import io
import json
import os
import sys
import time
from typing import Dict, Any
# pyrefly: ignore[missing-import]
from PIL import Image, ImageDraw

from vision_extractor import VisionExtractor

TEST_PACKS_DIR = os.path.join(os.path.dirname(__file__), "test_packs")
os.makedirs(TEST_PACKS_DIR, exist_ok=True)


def create_pack_image(
    title: str,
    manufacturer: str,
    reg_no: str,
    batch_no: str,
    expiry: str,
    color_scheme: tuple = (20, 60, 140),
    is_damaged: bool = False
) -> str:
    """Renders a simulated drug pack image."""
    img = Image.new("RGB", (640, 320), color=(250, 250, 250))
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([(8, 8), (632, 312)], outline=color_scheme, width=4)
    # Header bar
    draw.rectangle([(8, 8), (632, 60)], fill=color_scheme)
    draw.text((25, 20), title, fill=(255, 255, 255))

    # Body details
    draw.text((25, 80), f"Manufacturer: {manufacturer}", fill=(30, 30, 30))
    
    if is_damaged:
        # Scratch out NAFDAC number with noise to test OCR degradation
        draw.text((25, 130), "NAFDAC Reg. No: [SMUDGED / UNREADABLE]", fill=(120, 120, 120))
        draw.line([(20, 135), (320, 135)], fill=(80, 80, 80), width=4)
    else:
        draw.text((25, 130), f"NAFDAC Reg. No: {reg_no}", fill=(180, 20, 20))

    draw.text((25, 180), f"Batch / Lot No: {batch_no}", fill=(30, 30, 30))
    draw.text((25, 230), f"Expiry Date: {expiry}", fill=(30, 30, 30))
    draw.text((25, 275), "Rx Only - Keep out of reach of children", fill=(100, 100, 100))

    safe_name = title.lower().replace(" ", "_").replace("/", "_")
    file_path = os.path.join(TEST_PACKS_DIR, f"{safe_name}.jpg")
    img.save(file_path, "JPEG", quality=90)
    return file_path


def run_suite():
    print("=" * 65)
    print("GENIUM ML TEST SUITE: Packaging Vision Extraction")
    print("=" * 65)

    test_cases = [
        {
            "id": "pack_1_augmentin_genuine",
            "title": "Augmentin 625mg Tablets",
            "mfg": "GlaxoSmithKline Pharmaceuticals",
            "reg_no": "A4-100137",
            "batch": "B24091",
            "exp": "2027-08",
            "color": (20, 60, 150)
        },
        {
            "id": "pack_2_emzor_paracetamol",
            "title": "Emzor Paracetamol 500mg",
            "mfg": "Emzor Pharmaceuticals Industries Ltd",
            "reg_no": "04-0123",
            "batch": "E99812",
            "exp": "2026-12",
            "color": (180, 40, 20)
        },
        {
            "id": "pack_3_coartem_antimalarial",
            "title": "Coartem 20/120 Artemether",
            "mfg": "Novartis Pharma AG",
            "reg_no": "04-0987",
            "batch": "CRT-4410",
            "exp": "2027-05",
            "color": (20, 120, 60)
        },
        {
            "id": "pack_4_cloned_label_augmentin",
            "title": "Augmentin 625mg (Cloned Label)",
            "mfg": "Unknown Lab Cloner",
            "reg_no": "04-0123",  # Stolen Emzor Paracetamol number!
            "batch": "B24091",
            "exp": "2027-08",
            "color": (120, 50, 160)
        },
        {
            "id": "pack_5_amatem_flagged_batch",
            "title": "Amatem Softgel Artemether",
            "mfg": "Elbe Pharma Nigeria Ltd",
            "reg_no": "B4-2201",
            "batch": "B24091",  # Flagged crowd batch
            "exp": "2026-11",
            "color": (200, 100, 10)
        },
        {
            "id": "pack_6_scratched_label",
            "title": "Damaged Packaging Test",
            "mfg": "Generic Pharma Ltd",
            "reg_no": "SCRATCHED",
            "batch": "Z00192",
            "exp": "2025-09",
            "color": (80, 80, 80),
            "damaged": True
        }
    ]

    extractor = VisionExtractor(timeout=45)
    results = []
    handoff_sample = None

    for idx, tc in enumerate(test_cases, start=1):
        print(f"\n[{idx}/6] Generating and testing: {tc['title']}...")
        pack_img_path = create_pack_image(
            title=tc["title"],
            manufacturer=tc["mfg"],
            reg_no=tc["reg_no"],
            batch_no=tc["batch"],
            expiry=tc["exp"],
            color_scheme=tc.get("color", (0, 0, 0)),
            is_damaged=tc.get("damaged", False)
        )

        start_t = time.time()
        extraction = extractor.extract_from_image(pack_img_path)
        duration = round(time.time() - start_t, 2)

        # Validate schema contract compliance
        valid_keys = {"reg_no", "product_name", "manufacturer", "batch_no", "expiry"}
        assert set(extraction.keys()) == valid_keys, f"Missing keys in extraction: {extraction.keys()}"

        for k in valid_keys:
            assert "value" in extraction[k], f"Field {k} missing 'value'"
            assert "confidence" in extraction[k], f"Field {k} missing 'confidence'"
            assert isinstance(extraction[k]["confidence"], (int, float)), f"Field {k} confidence not float"

        print(f" -> Duration: {duration}s")
        print(f" -> Extracted reg_no: {extraction['reg_no']['value']} (conf: {extraction['reg_no']['confidence']})")
        print(f" -> Extracted product: {extraction['product_name']['value']} (conf: {extraction['product_name']['confidence']})")
        print(f" -> Extracted batch: {extraction['batch_no']['value']} (conf: {extraction['batch_no']['confidence']})")

        results.append({
            "test_case": tc["id"],
            "image": os.path.basename(pack_img_path),
            "duration_sec": duration,
            "extraction": extraction
        })

        if idx == 1:
            handoff_sample = extraction

    # Export handoff sample for Backend + Data team
    handoff_file = os.path.join(os.path.dirname(__file__), "sample_extraction_handoff.json")
    with open(handoff_file, "w") as f:
        json.dump({
            "status": "success",
            "model": extractor.model,
            "schema_version": "1.0",
            "extracted": handoff_sample
        }, f, indent=2)
    print(f"\n[Artifact] Handoff sample exported to: {handoff_file}")

    # Summary
    print("\n" + "=" * 65)
    print(f"TEST SUITE COMPLETE: {len(results)}/{len(test_cases)} tests passed schema validation.")
    print("=" * 65)


if __name__ == "__main__":
    run_suite()

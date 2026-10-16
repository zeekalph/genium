#!/usr/bin/env python3
"""
Fast downloader for NAFDAC datasets:
1. Greenbook medicines (8,946 records) via direct DataTables AJAX API.
2. Registered food products (3,000 records) via Ninja Tables AJAX API.
3. Produces unified normalized products_master.json for NestJS database seeding.
"""

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
import requests

HEADERS_GREENBOOK = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Referer": "https://greenbook.nafdac.gov.ng/",
}

HEADERS_FOOD = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Referer": "https://nafdac.gov.ng/food-products-database/",
}

FOOD_AJAX_URL = (
    "https://nafdac.gov.ng/wp-admin/admin-ajax.php"
    "?action=wp_ajax_ninja_tables_public_action"
    "&table_id=19494"
    "&target_action=get-all-data"
    "&default_sorting=old_first"
    "&skip_rows=0"
    "&limit_rows=0"
    "&ninja_table_public_nonce=19c1d4f2d2"
    "&chunk_number=0"
)

# MAS (Mobile Authentication Scheme) covers antimalarials and antibiotics primarily
MAS_KEYWORDS = ["artemether", "lumefantrine", "amoxicillin", "clavulanate", "ciprofloxacin", "paracetamol", "coartem", "amatem", "augmentin", "lonart"]

def fetch_with_retry(url, params=None, headers=None, max_retries=4, timeout=35):
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                return resp.json()
            print(f"  [Attempt {attempt}] HTTP {resp.status_code}, retrying...")
        except Exception as e:
            print(f"  [Attempt {attempt}] Error: {e}, retrying in {attempt * 2}s...")
            time.sleep(attempt * 2)
    return None


def scrape_greenbook():
    print("\n[1/3] Downloading Greenbook medicines from direct DataTables API...")
    url = "https://greenbook.nafdac.gov.ng"
    page_size = 1000
    all_records = []
    start = 0

    # First fetch to get recordsTotal
    first_resp = fetch_with_retry(
        url,
        params={"draw": "1", "start": "0", "length": "10", "search[value]": "", "search[regex]": "false"},
        headers=HEADERS_GREENBOOK,
    )
    total_expected = first_resp.get("recordsTotal", 8946) if first_resp else 8946
    print(f"Total records in Greenbook: {total_expected}")

    while start < total_expected:
        print(f"Fetching records {start} to {min(start + page_size, total_expected)}...")
        params = {
            "draw": str((start // page_size) + 1),
            "start": str(start),
            "length": str(page_size),
            "search[value]": "",
            "search[regex]": "false",
        }
        res = fetch_with_retry(url, params=params, headers=HEADERS_GREENBOOK)
        if not res or "data" not in res:
            print(f"Failed to fetch chunk starting at {start}")
            break

        data_chunk = res["data"]
        all_records.extend(data_chunk)
        print(f"  Fetched {len(data_chunk)} items (Total collected: {len(all_records)})")
        start += page_size
        time.sleep(0.5)

    return all_records, total_expected


def scrape_food_products():
    print("\n[2/3] Downloading Food Database from Ninja Tables API...")
    res = fetch_with_retry(FOOD_AJAX_URL, headers=HEADERS_FOOD)
    if not res or not isinstance(res, list):
        print("Failed to fetch food products directly. Attempting fallback parse...")
        return []
    
    print(f"Successfully fetched {len(res)} food products!")
    return res


def normalize_reg_no(reg_no):
    if not reg_no:
        return ""
    # Uppercase, remove spaces, unify dashes
    return re.sub(r"\s+", "", str(reg_no).strip().upper())


def build_unified_master(greenbook_records, food_records):
    print("\n[3/3] Normalizing and building master products registry...")
    master = []
    seen_reg_nos = set()

    # Process Greenbook Medicines
    for r in greenbook_records:
        reg_no = normalize_reg_no(r.get("NAFDAC") or r.get("reg_no"))
        if not reg_no:
            continue
        
        name = str(r.get("product_name") or "").strip()
        applicant = r.get("applicant")
        if isinstance(applicant, dict):
            applicant_name = applicant.get("name")
        else:
            applicant_name = r.get("applicant_name")
        manufacturer = str(applicant_name or "").strip()
        description = f"{r.get('form_name') or ''} {r.get('strength') or ''} - {r.get('pack_size') or ''}".strip()
        
        # Check MAS requirement
        mas_req = any(kw in name.lower() or kw in str(r.get("composition") or "").lower() for kw in MAS_KEYWORDS)

        item = {
            "reg_no": reg_no,
            "name": name,
            "manufacturer": manufacturer,
            "category": "Drugs",
            "description": description,
            "strength": str(r.get("strength") or "").strip(),
            "dosage_form": str(r.get("form_name") or "").strip(),
            "active_ingredient": str(r.get("ingredient_name") or "").strip(),
            "mas_required": mas_req,
            "approval_date": r.get("approval_date"),
            "expiry_date": r.get("expiry_date"),
            "status": str(r.get("status") or "Active"),
            "source": "greenbook",
        }
        master.append(item)
        seen_reg_nos.add(reg_no)

    # Process Food Products
    for f in food_records:
        val = f.get("value") if isinstance(f, dict) and "value" in f else f
        reg_no = normalize_reg_no(val.get("nafdacnumber"))
        if not reg_no or reg_no in seen_reg_nos:
            continue

        name = str(val.get("productname") or "").strip()
        manufacturer = str(val.get("manufacturer") or val.get("applicantname") or "").strip()
        presentation = str(val.get("presentation") or val.get("packsize") or "").strip()
        subcategory = str(val.get("subcategory") or "").strip()
        description = f"{subcategory} - {presentation}".strip() if subcategory else presentation

        item = {
            "reg_no": reg_no,
            "name": name,
            "manufacturer": manufacturer,
            "category": "Food",
            "description": description,
            "strength": "",
            "dosage_form": subcategory,
            "active_ingredient": "",
            "mas_required": False,
            "approval_date": val.get("issuedate"),
            "expiry_date": val.get("expirydate"),
            "status": "Active",
            "source": "nafdac_food",
        }
        master.append(item)
        seen_reg_nos.add(reg_no)

    print(f"Total unified products created: {len(master)}")
    return master


def main():
    start_time = time.time()
    greenbook_records, expected = scrape_greenbook()
    food_records = scrape_food_products()

    # Ensure output directories exist
    os.makedirs("ml", exist_ok=True)
    os.makedirs("backend/data", exist_ok=True)

    # Save Greenbook Snapshot immediately
    greenbook_snapshot = {
        "source": "https://greenbook.nafdac.gov.ng",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "total_records": len(greenbook_records),
        "records": greenbook_records,
    }
    for path in ["ml/greenbook_snapshot.json", "backend/data/greenbook_snapshot.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(greenbook_snapshot, f, ensure_ascii=False, indent=2)
        print(f"Saved: {path} ({len(greenbook_records)} records)")

    # Save Food Snapshot immediately
    food_snapshot = {
        "source": "https://nafdac.gov.ng/food-products-database/",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "total_records": len(food_records),
        "records": food_records,
    }
    for path in ["ml/food_products_snapshot.json", "backend/data/food_products_snapshot.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(food_snapshot, f, ensure_ascii=False, indent=2)
        print(f"Saved: {path} ({len(food_records)} records)")

    # Build and normalize unified master
    master_records = build_unified_master(greenbook_records, food_records)

    # Save Master Unified Database
    master_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_products": len(master_records),
        "drug_count": len([p for p in master_records if p["category"] == "Drugs"]),
        "food_count": len([p for p in master_records if p["category"] == "Food"]),
        "products": master_records,
    }
    for path in ["ml/products_master.json", "backend/data/products_master.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(master_payload, f, ensure_ascii=False, indent=2)
        print(f"Saved: {path} ({len(master_records)} total products)")

    duration = round(time.time() - start_time, 2)
    print(f"\nAll datasets scraped, normalized, and saved in {duration} seconds!")


if __name__ == "__main__":
    main()

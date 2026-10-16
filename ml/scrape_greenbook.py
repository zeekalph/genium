"""
Scrape the NAFDAC Greenbook table into greenbook_snapshot.json

Setup:
    pip install playwright
    playwright install chromium
Run:
    python scrape_greenbook.py

Strategy: open the page in a real browser, set the table page size as large
as possible, then click "Next" until the last page, collecting every row.
Output is de-duplicated by NRN + product name and compared with the
expected 8,946 total.
"""
import json
import re
import sys
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

URL = "https://greenbook.nafdac.gov.ng/"
EXPECTED = 8946
OUT = "greenbook_snapshot.json"


def read_rows(page, headers):
    rows = []
    for tr in page.query_selector_all("table tbody tr"):
        cells = [c.inner_text().strip() for c in tr.query_selector_all("td")]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))
    return rows


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(URL, wait_until="networkidle", timeout=120_000)
        page.wait_for_selector("table tbody tr td", timeout=120_000)

        headers = [h.inner_text().strip() for h in page.query_selector_all("table thead th")]
        print("Columns:", headers)

        # Try to enlarge the page size (DataTables-style select), if present.
        sel = page.query_selector("select[name$='_length'], .dataTables_length select")
        if sel:
            options = [o.get_attribute("value") for o in sel.query_selector_all("option")]
            best = max(options, key=lambda v: int(v))  # -1 means "All" in DataTables
            best = "-1" if "-1" in options else best
            sel.select_option(best)
            page.wait_for_load_state("networkidle")

        seen, records = set(), []
        page_no = 0
        while True:
            page.wait_for_selector("table tbody tr td")
            for row in read_rows(page, headers):
                key = (row.get("NRN", ""), row.get("Product Name", ""), row.get("Strengths", ""))
                if key not in seen:
                    seen.add(key)
                    records.append(row)
            page_no += 1
            print(f"page {page_no}: {len(records)} records", end="\r")

            nxt = page.query_selector("a.next:not(.disabled), li.next:not(.disabled) a, .paginate_button.next:not(.disabled)")
            if not nxt:
                break
            first_before = page.query_selector("table tbody tr td").inner_text()
            nxt.click()
            page.wait_for_function(
                "prev => document.querySelector('table tbody tr td')?.innerText !== prev",
                arg=first_before,
                timeout=30_000,
            )
        browser.close()

    snapshot = {
        "source": URL,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "expected_count": EXPECTED,
        "record_count": len(records),
        "columns": headers,
        "records": records,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(records)} records to {OUT}")
    if len(records) != EXPECTED:
        print(f"WARNING: expected {EXPECTED}, got {len(records)}", file=sys.stderr)


if __name__ == "__main__":
    main()
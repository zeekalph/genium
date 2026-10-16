"""
Genium Barcode & QR Digital Link Resolution Engine
Scans 1D and 2D barcodes (EAN-13, QR Code, DataMatrix, GS1 Digital Link),
follows redirects safely, and extracts structured regulatory details from the destination page.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
import requests
import zxingcpp

load_dotenv()


class BarcodeResolver:
    def __init__(
        self,
        api_key: Optional[str] = None,
        fallback_api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: int = 8
    ):
        primary_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        fallback_key = fallback_api_key or os.getenv("GOOGLE_FALLBACK_API_KEY") or os.getenv("GEMINI_FALLBACK_API_KEY")

        self.api_keys = [k for k in [primary_key, fallback_key] if k]
        self.model = model or os.getenv("GOOGLE_VISION_MODEL", "gemini-2.5-flash")
        self.timeout = timeout
        self.clients = [genai.Client(api_key=k) for k in self.api_keys]
        self.client = self.clients[0] if self.clients else None
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 "
                "GeniumMedicineVerifier/1.0"
            )
        })

    def decode_barcodes(self, image_input: Union[str, Image.Image]) -> List[Dict[str, Any]]:
        """
        Scans all 1D (EAN, UPC, Code 128) and 2D (QR, DataMatrix) barcodes from the image.
        Uses fast native zxing-cpp decoding.
        """
        if isinstance(image_input, str):
            if not os.path.exists(image_input):
                return []
            img = Image.open(image_input)
        else:
            img = image_input

        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        barcodes = []
        try:
            results = zxingcpp.read_barcodes(img)
            for b in results:
                barcodes.append({
                    "format": str(b.format).replace("BarcodeFormat.", ""),
                    "text": b.text.strip(),
                    "valid": b.valid
                })
        except Exception as e:
            print(f"[BarcodeResolver] Barcode decoding error: {e}")

        return barcodes

    def parse_gs1_digital_link(self, text: str) -> Optional[Dict[str, Any]]:
        """Parses standard GS1 Digital Link Application Identifiers from URLs or DataMatrix strings."""
        # e.g., https://id.gs1.org/01/05391234567890/10/B24091/17/270831/21/12345
        # or (01)05391234567890(10)B24091(17)270831
        parsed = {}
        # AI (01): GTIN
        gtin_match = re.search(r"(?:/01/|\(01\))(\d{8,14})", text)
        if gtin_match:
            parsed["gtin"] = gtin_match.group(1)

        # AI (10): Batch / Lot
        lot_match = re.search(r"(?:/10/|\(10\))([A-Za-z0-9\-_]+)", text)
        if lot_match:
            parsed["batch_no"] = lot_match.group(1)

        # AI (17): Expiration date YYMMDD
        exp_match = re.search(r"(?:/17/|\(17\))(\d{6})", text)
        if exp_match:
            exp_str = exp_match.group(1)
            yy, mm, dd = exp_str[:2], exp_str[2:4], exp_str[4:6]
            parsed["expiry"] = f"20{yy}-{mm}"

        # AI (21): Serial number
        sn_match = re.search(r"(?:/21/|\(21\))([A-Za-z0-9\-_]+)", text)
        if sn_match:
            parsed["serial_no"] = sn_match.group(1)

        return parsed if parsed else None

    def resolve_url(self, raw_url: str) -> Dict[str, Any]:
        """
        Follows redirects and extracts structured verification details from the destination page.
        """
        parsed_uri = urlparse(raw_url)
        if parsed_uri.scheme not in ("http", "https"):
            return {
                "valid_url": False,
                "error": f"Invalid URL scheme: {parsed_uri.scheme}"
            }

        result = {
            "valid_url": True,
            "original_url": raw_url,
            "final_url": raw_url,
            "status_code": None,
            "redirect_chain": [],
            "extracted_details": None
        }

        try:
            resp = self.session.get(raw_url, timeout=self.timeout, allow_redirects=True)
            result["status_code"] = resp.status_code
            result["final_url"] = resp.url
            if resp.history:
                result["redirect_chain"] = [h.url for h in resp.history]

            content_type = resp.headers.get("Content-Type", "")

            # 1. If JSON response (API endpoint)
            if "application/json" in content_type:
                try:
                    data = resp.json()
                    result["extracted_details"] = self._normalize_json_details(data)
                    return result
                except Exception:
                    pass

            # 2. If HTML response
            if "text/html" in content_type or resp.text:
                soup = BeautifulSoup(resp.text[:50000], "html.parser")
                title = soup.title.string.strip() if soup.title and soup.title.string else ""
                
                # Check for meta description and schema.org JSON-LD
                meta_desc = ""
                desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
                if desc_tag and desc_tag.get("content"):
                    meta_desc = desc_tag["content"].strip()

                text_snippet = soup.get_text(separator=" ", strip=True)[:4000]

                # Use Gemini to extract structured product details from destination page
                if self.client and (title or text_snippet):
                    extracted = self._extract_details_from_page_content(
                        url=resp.url,
                        title=title,
                        meta_desc=meta_desc,
                        content=text_snippet
                    )
                    result["extracted_details"] = extracted

        except Exception as e:
            result["error"] = str(e)

        return result

    def _normalize_json_details(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes API JSON responses from verification servers."""
        details = {}
        for k, v in data.items():
            kl = k.lower()
            if "product" in kl or "name" in kl or "brand" in kl:
                details["product_name"] = str(v)
            elif "batch" in kl or "lot" in kl:
                details["batch_no"] = str(v)
            elif "expir" in kl:
                details["expiry"] = str(v)
            elif "mfg" in kl or "manuf" in kl:
                details["manufacturer"] = str(v)
            elif "status" in kl or "valid" in kl or "authentic" in kl:
                details["verification_status"] = str(v)
        return details

    def _extract_details_from_page_content(
        self,
        url: str,
        title: str,
        meta_desc: str,
        content: str
    ) -> Optional[Dict[str, Any]]:
        """Uses Gemini Flash to parse product verification fields from HTML text."""
        prompt = (
            "You are a regulatory verification parser. "
            "Extract structured medicine or food verification details from this web page content into JSON.\n"
            f"URL: {url}\n"
            f"Title: {title}\n"
            f"Description: {meta_desc}\n"
            f"Page Text Snippet: {content[:3000]}\n\n"
            "Output must be valid JSON with this structure:\n"
            "{\n"
            '  "product_name": string or null,\n'
            '  "manufacturer": string or null,\n'
            '  "batch_no": string or null,\n'
            '  "expiry": string or null,\n'
            '  "reg_no": string or null,\n'
            '  "verification_status": "AUTHENTIC" | "COUNTERFEIT" | "EXPIRED" | "UNKNOWN",\n'
            '  "summary": "1-sentence summary of what the destination page confirms"\n'
            "}"
        )
        for client_idx, client in enumerate(self.clients):
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )
                return json.loads(response.text.strip())
            except Exception as e:
                if client_idx < len(self.clients) - 1:
                    print(f"[BarcodeResolver] Primary API key error ({type(e).__name__}). Retrying with fallback API key...")
                    continue
                else:
                    print(f"[BarcodeResolver] Web content extraction error: {e}")
                    return None
        return None

    def scan_and_resolve(self, image_input: Union[str, Image.Image]) -> Dict[str, Any]:
        """
        Complete barcode scan and resolution workflow:
        1. Decodes 1D barcodes and QR/DataMatrix codes.
        2. Detects URLs and follows redirects.
        3. Extracts structured product verification details from the destination.
        """
        barcodes = self.decode_barcodes(image_input)
        if not barcodes:
            return {
                "detected": False,
                "barcodes": [],
                "link_resolution": None
            }

        primary = barcodes[0]
        raw_text = primary["text"]
        gs1_info = self.parse_gs1_digital_link(raw_text)

        link_res = None
        # Check if text is or contains a web URL
        url_match = re.search(r"https?://[^\s]+", raw_text)
        if url_match:
            target_url = url_match.group(0)
            link_res = self.resolve_url(target_url)

        return {
            "detected": True,
            "primary": {
                "format": primary["format"],
                "raw_text": raw_text,
                "is_url": bool(url_match),
                "gs1_metadata": gs1_info
            },
            "all_barcodes": barcodes,
            "link_resolution": link_res
        }


if __name__ == "__main__":
    resolver = BarcodeResolver()

    # Test 1: Generate a test QR code with a redirected link
    import qrcode
    test_url = "https://httpbin.org/redirect-to?url=https://en.wikipedia.org/wiki/Amoxicillin/clavulanic_acid"
    qr_img = qrcode.make(test_url)
    test_qr_path = os.path.join(os.path.dirname(__file__), "test_qr_redirect.png")
    qr_img.save(test_qr_path)
    print(f"Created test QR code at {test_qr_path}")

    print("\nScanning and resolving QR code link...")
    res = resolver.scan_and_resolve(test_qr_path)
    print(json.dumps(res, indent=2))

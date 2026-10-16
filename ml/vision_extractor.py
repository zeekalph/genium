"""
Genium Vision Extraction Engine (v3 - Powered by Google AI Studio)
Extracts NAFDAC registration number, product name, manufacturer, batch number, and expiry date
with calibrated per-field confidence scores from drug and food packaging photos.
"""

import io
import json
import os
import re
from typing import Any, Dict, Optional, Union
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

from barcode_resolver import BarcodeResolver

load_dotenv()

SYSTEM_PROMPT = """You are an expert pharmaceutical packaging inspection and forensic OCR AI.
Your task is to inspect medicine and food packaging images and extract EXACTLY what is visibly printed on the physical packaging.

CRITICAL INTEGRITY DIRECTIVES:
1. ZERO HALLUCINATION: Extract ONLY characters and numbers that are physically visible on the packaging in this specific photo.
2. DO NOT GUESS OR REUSE ANY SAMPLE NUMBERS: Under NO circumstances should you output default, sample, or fabricated numbers. If a number is not visible on the packaging surface shown in the photo, you MUST return null with confidence 0.0.
3. CHARACTER DISAMBIGUATION:
   - Carefully distinguish '0' (digit zero) from 'O' (letter O).
   - Distinguish '1' (digit one) from 'I' or 'l' (letter).
   - Distinguish '8' (digit eight) from 'B' (letter B).
   - Distinguish '5' (digit five) from 'S' (letter S).
   - Distinguish '2' (digit two) from 'Z' (letter Z).
4. SURFACE AWARENESS: Many medicine packages display the brand and manufacturer on the front face, while regulatory numbers (NAFDAC, Batch, Expiry) are stamped on the side or top flaps. If this photo shows a face without these regulatory stamps, mark reg_no, batch_no, and expiry as null with 0.0 confidence.

FIELDS TO EXTRACT:
1. reg_no: Official NAFDAC Registration Number (NRN). Format is typically 2-3 alphanumeric characters, a hyphen, and 4-6 digits (e.g., '04-0123', 'A4-100137'). Output ONLY the identifier string without prefixes like 'NAFDAC Reg. No:'. If not visible, return null.
2. product_name: The brand / trade name (e.g., 'Risperdal 4mg Tablets', 'Famagyl Metronidazole 200mg', 'Augmentin 625mg').
3. manufacturer: The manufacturing pharmaceutical or food company name (e.g., 'Janssen-Cilag', 'Tabuk Pharmaceuticals', 'GlaxoSmithKline').
4. batch_no: The batch / lot number. Output ONLY the batch code without prefixes like 'BN' or 'LOT'. If not visible, return null.
5. expiry: The expiration date normalized to YYYY-MM or MM/YYYY. If not visible, return null.

CONFIDENCE SCORING RUBRIC (Matching Frontend Badges):
- 0.90 to 1.00 (GREEN): High confidence. Characters are sharp, high-contrast, fully legible, and completely read from the packaging.
- 0.70 to 0.89 (AMBER): Medium confidence. Minor blur, lighting glare, curved surface angle, or partial character degradation.
- Below 0.70 (RED): Low confidence. Significant glare, small degraded print, or partially occluded.
- 0.00: Not visible. The field is absent from the visible packaging surface."""


class VisionExtractor:
    def __init__(
        self,
        api_key: Optional[str] = None,
        fallback_api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[int] = None
    ):
        self.timeout = timeout
        primary_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        fallback_key = fallback_api_key or os.getenv("GOOGLE_FALLBACK_API_KEY") or os.getenv("GEMINI_FALLBACK_API_KEY")

        self.api_keys = [k for k in [primary_key, fallback_key] if k]
        self.model = model or os.getenv("GOOGLE_VISION_MODEL", "gemini-2.5-flash")
        
        # Initialize Google GenAI clients for failover
        self.clients = [genai.Client(api_key=k) for k in self.api_keys]
        self.client = self.clients[0] if self.clients else None
        self.barcode_resolver = BarcodeResolver(api_key=primary_key, fallback_api_key=fallback_key, model=self.model)

    def _prepare_image(self, image_input: Union[str, Image.Image, bytes]) -> Image.Image:
        """Loads and prepares PIL Image."""
        if isinstance(image_input, str):
            if os.path.exists(image_input):
                img = Image.open(image_input)
            else:
                raise FileNotFoundError(f"Image file not found: {image_input}")
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            img = image_input
        else:
            raise TypeError("Unsupported image input type")

        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Resize if dimensions exceed 1280 to maintain optimal latency
        max_dim = 1280
        if max(img.size) > max_dim:
            scale = max_dim / max(img.size)
            new_size = (int(img.size[0] * scale), int(img.size[1] * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        return img

    def extract_from_image(self, image_input: Union[str, Image.Image, bytes]) -> Dict[str, Any]:
        """
        Executes vision extraction via Google AI Studio with native JSON mode.
        Guaranteed to return contract-compliant schema.
        """
        default_fallback = {
            "reg_no": {"value": None, "confidence": 0.0},
            "product_name": {"value": None, "confidence": 0.0},
            "manufacturer": {"value": None, "confidence": 0.0},
            "batch_no": {"value": None, "confidence": 0.0},
            "expiry": {"value": None, "confidence": 0.0},
            "barcode": {"detected": False, "barcodes": [], "link_resolution": None}
        }

        try:
            img = self._prepare_image(image_input)
        except Exception as e:
            print(f"[VisionExtractor] Image preparation error: {e}")
            return default_fallback

        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            "Inspect the provided packaging image and extract the fields in strict JSON format:\n"
            "{\n"
            '  "reg_no": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
            '  "product_name": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
            '  "manufacturer": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
            '  "batch_no": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
            '  "expiry": {"value": string or null, "confidence": float between 0.0 and 1.0}\n'
            "}"
        )

        for client_idx, client in enumerate(self.clients):
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=[img, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )

                raw_text = response.text.strip()
                parsed = json.loads(raw_text)

                validated: Dict[str, Any] = {}
                for field in ["reg_no", "product_name", "manufacturer", "batch_no", "expiry"]:
                    field_data = parsed.get(field, {})
                    if isinstance(field_data, dict):
                        val = field_data.get("value")
                        conf = float(field_data.get("confidence", 0.0))
                    elif isinstance(field_data, (str, type(None))):
                        val = field_data
                        conf = 0.85 if val is not None else 0.0
                    else:
                        val = str(field_data)
                        conf = 0.50

                    # Clean strings indicating absent values
                    if isinstance(val, str):
                        val = val.strip()
                        if val.lower() in ("not visible", "null", "none", "n/a", "unknown", ""):
                            val = None
                            conf = 0.0

                    # Sanitize reg_no
                    if field == "reg_no" and val:
                        val = re.sub(r"(?i)^(nafdac\s*(reg(\.|\s*no)?:?|nrn:?))\s*", "", str(val)).strip()

                    validated[field] = {
                        "value": str(val).strip() if val is not None else None,
                        "confidence": round(max(0.0, min(1.0, conf)), 2)
                    }

                # Scan barcodes and resolve any redirected verification links
                try:
                    validated["barcode"] = self.barcode_resolver.scan_and_resolve(img)
                except Exception as e:
                    print(f"[VisionExtractor] Barcode scan error: {e}")
                    validated["barcode"] = {"detected": False, "barcodes": [], "link_resolution": None}

                return validated

            except Exception as e:
                # If there is another client in reserve, silently retry with the fallback key
                if client_idx < len(self.clients) - 1:
                    print(f"[VisionExtractor] Primary Google AI Studio key encountered error ({type(e).__name__}). Seamlessly retrying with fallback API key...")
                    continue
                else:
                    print(f"[VisionExtractor] All Google AI Studio API keys exhausted. Error: {e}")
                    return default_fallback

        return default_fallback


if __name__ == "__main__":
    extractor = VisionExtractor()
    sample_path = os.path.join(os.path.dirname(__file__), "sample_pack.png")
    print(f"Running Google AI Studio extraction on {sample_path}...")
    result = extractor.extract_from_image(sample_path)
    print("Validated Result:")
    print(json.dumps(result, indent=2))

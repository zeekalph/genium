"""
Genium Vision Extraction Engine (v1)
Extracts NAFDAC registration number, product name, manufacturer, batch number, and expiry date
with calibrated per-field confidence scores from drug and food packaging photos.
"""

import base64
import io
import json
import os
import re
from typing import Any, Dict, Optional, Union
import requests
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv
# pyrefly: ignore[missing-import]
from PIL import Image

load_dotenv()

SYSTEM_PROMPT = """You are an expert pharmaceutical packaging inspection and OCR AI.
Your sole mission is to extract key regulatory and identification fields from medicine and food packaging images with extreme precision.

Extract these exact 5 fields:
1. reg_no: The official NAFDAC Registration Number (NRN). Format is typically 2-3 alphanumeric characters, a hyphen, and 4-6 digits (e.g., 'A4-100137', '04-1234', 'B4-5678'). Strip away labels like 'NAFDAC Reg No:' or 'NRN:' - output ONLY the identifier string.
2. product_name: The primary trade/brand name (e.g., 'Augmentin 625mg', 'Emzor Paracetamol 500mg').
3. manufacturer: The manufacturing pharmaceutical/food company name (e.g., 'GlaxoSmithKline Pharmaceuticals Ltd', 'Emzor Pharma').
4. batch_no: The batch or lot number (e.g., 'B24091', 'L8924'). Strip prefixes like 'Batch No:', 'B/N:', or 'LOT:'.
5. expiry: The expiration date normalized to YYYY-MM or MM/YYYY (e.g., '2027-08', '08/2027'). Strip prefixes like 'EXP:' or 'Expiry Date:'.

CONFIDENCE SCORING RUBRIC (per field):
- 0.90 to 1.00: High confidence. Text is clear, sharp, high contrast, and completely legible.
- 0.70 to 0.89: Medium confidence. Minor blur, glare, perspective distortion, or slight ambiguity.
- Below 0.70: Low confidence. Significant degradation, partial occlusion, or guessed characters.
- 0.00: Missing/unreadable. The field is not present on the visible pack surfaces.

FALLBACK RULE:
If any field cannot be found or is completely unreadable, set value to null and confidence to 0.0.

OUTPUT REQUIREMENTS:
Output MUST be strict, parseable JSON matching this exact structure:
{
  "reg_no": {"value": string or null, "confidence": float},
  "product_name": {"value": string or null, "confidence": float},
  "manufacturer": {"value": string or null, "confidence": float},
  "batch_no": {"value": string or null, "confidence": float},
  "expiry": {"value": string or null, "confidence": float}
}
Do NOT include markdown backticks (```json), code blocks, or conversational text. Return only the JSON object."""

USER_PROMPT = "Inspect this packaging photo carefully. Extract the regulatory and manufacturing fields according to instructions and output the strict JSON."


class VisionExtractor:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: int = 15
    ):
        self.api_key = api_key or os.getenv("NVIDIA_API_KEY")
        self.base_url = base_url or os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
        # Default to the vision-capable model on the endpoint
        self.model = model or os.getenv("VISION_MODEL", "meta/llama-3.2-11b-vision-instruct")
        self.timeout = timeout
        self.invoke_url = f"{self.base_url.rstrip('/')}/chat/completions"

    def _prepare_image_data_url(self, image_input: Union[str, Image.Image, bytes]) -> str:
        """Converts file path, PIL Image, or bytes to an optimized base64 data URI."""
        if isinstance(image_input, str):
            if image_input.startswith("data:image/"):
                return image_input
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

        # Convert to RGB if needed
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Resize if dimensions exceed 1024 to keep payload lightweight and fast
        max_dim = 1024
        if max(img.size) > max_dim:
            scale = max_dim / max(img.size)
            new_size = (int(img.size[0] * scale), int(img.size[1] * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{b64_str}"

    def extract_from_image(self, image_input: Union[str, Image.Image, bytes]) -> Dict[str, Any]:
        """
        Executes vision extraction and returns validated schema-compliant dictionary.
        Guaranteed to never raise an unhandled exception or return malformed shapes.
        """
        default_fallback = {
            "reg_no": {"value": None, "confidence": 0.0},
            "product_name": {"value": None, "confidence": 0.0},
            "manufacturer": {"value": None, "confidence": 0.0},
            "batch_no": {"value": None, "confidence": 0.0},
            "expiry": {"value": None, "confidence": 0.0},
        }

        try:
            image_url = self._prepare_image_data_url(image_input)
        except Exception as e:
            print(f"[VisionExtractor] Image preparation error: {e}")
            return default_fallback

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "max_tokens": 512,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": USER_PROMPT},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]
                }
            ]
        }

        try:
            response = requests.post(self.invoke_url, headers=headers, json=payload, timeout=self.timeout)
            if response.status_code != 200:
                print(f"[VisionExtractor] API returned error {response.status_code}: {response.text}")
                return default_fallback

            res_json = response.json()
            raw_text = res_json.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

            # Robust JSON extraction: Find JSON substring from first { to last }
            first_brace = raw_text.find("{")
            last_brace = raw_text.rfind("}")
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                json_text = raw_text[first_brace : last_brace + 1]
            else:
                json_text = raw_text

            parsed = json.loads(json_text)

            # Ensure all contract keys exist and adhere to structure
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

                # Sanitize reg_no if it contains label
                if field == "reg_no" and val:
                    val = re.sub(r"(?i)^(nafdac\s*(reg(\.|\s*no)?:?|nrn:?))\s*", "", str(val)).strip()

                validated[field] = {
                    "value": str(val).strip() if val is not None else None,
                    "confidence": round(max(0.0, min(1.0, conf)), 2)
                }

            return validated

        except Exception as e:
            print(f"[VisionExtractor] Extraction failure: {e}")
            return default_fallback


if __name__ == "__main__":
    extractor = VisionExtractor()
    sample_path = os.path.join(os.path.dirname(__file__), "sample_pack.png")
    if os.path.exists(sample_path):
        print(f"Running test extraction on {sample_path}...")
        result = extractor.extract_from_image(sample_path)
        print("Validated Result:")
        print(json.dumps(result, indent=2))

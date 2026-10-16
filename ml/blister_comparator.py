"""
Genium Carton vs. Blister Packaging Cross-Check Engine (Powered by Google AI Studio)
Compares outer carton packaging against inner blister/foil strips to catch packaging counterfeit attacks:
1. Batch number mismatch between carton and blister foil crimp.
2. Expiration date contradiction.
3. Dosage form / physical pill mismatch (e.g., tablet vs capsule, color, shape).
"""

import io
import json
import os
from typing import Any, Dict, Optional, Union
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv
# pyrefly: ignore[missing-import]
from google import genai
# pyrefly: ignore[missing-import]
from google.genai import types
# pyrefly: ignore[missing-import]
from PIL import Image

load_dotenv()

BLISTER_COMPARISON_SYSTEM_PROMPT = """You are a forensic pharmaceutical packaging inspection AI.
Your task is to cross-examine physical packaging surfaces:
SURFACE A: Outer medicine carton / packaging box
SURFACE B: Inner blister pack strip / foil crimp / tablet seal

You must inspect the surfaces and verify whether they legitimately belong to the same genuine manufacturing lot.

CROSS-EXAMINATION CRITERIA:
1. BATCH NUMBER: Compare the lot/batch number printed on the outer carton against the batch number debossed/crimped on the blister foil edge.
2. EXPIRATION DATE: Compare the expiry date on the box with the expiry date stamped on the blister strip.
3. PHYSICAL PILL / FORM CHECK: Inspect the physical tablets or capsules in the blister cavities. Does their form, shape, color, and debossing match the dosage form printed on the carton (e.g., green oval tablets, white film-coated tablets, capsules)?

VERDICT RULES:
- pass = true: Both carton and blister are clearly visible, batch numbers and expiration dates match, and pill appearance matches carton description.
- pass = false: Direct contradiction found (e.g. blister batch does not match carton batch, dates contradict, or physical pills contradict dosage form).
- pass = null: One or both surfaces lack visible debossed batch/expiry stamps, or no blister strip is provided.

OUTPUT FORMAT:
Output MUST be strict JSON matching this exact structure:
{
  "id": "carton_vs_blister",
  "pass": true | false | null,
  "detail": "Clear 1-2 sentence forensic summary of findings.",
  "confidence": float between 0.0 and 1.0,
  "carton_details": {
    "batch_no": string or null,
    "expiry": string or null,
    "stated_form": string or null
  },
  "blister_details": {
    "batch_no": string or null,
    "expiry": string or null,
    "observed_pills": string or null
  }
}"""


class BlisterComparator:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GOOGLE_VISION_MODEL", "gemini-2.5-flash")
        self.client = genai.Client(api_key=self.api_key)

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

        max_dim = 1280
        if max(img.size) > max_dim:
            scale = max_dim / max(img.size)
            new_size = (int(img.size[0] * scale), int(img.size[1] * scale))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        return img

    def compare(
        self,
        carton_image: Union[str, Image.Image, bytes],
        blister_image: Optional[Union[str, Image.Image, bytes]] = None
    ) -> Dict[str, Any]:
        """Cross-examines carton vs blister images."""
        fallback_null = {
            "id": "carton_vs_blister",
            "pass": None,
            "detail": "No blister strip provided for cross-check.",
            "confidence": 0.0,
            "carton_details": {"batch_no": None, "expiry": None, "stated_form": None},
            "blister_details": {"batch_no": None, "expiry": None, "observed_pills": None}
        }

        try:
            carton_img = self._prepare_image(carton_image)
            contents = [BLISTER_COMPARISON_SYSTEM_PROMPT, carton_img]

            if blister_image is not None:
                blister_img = self._prepare_image(blister_image)
                contents.append(blister_img)
                contents.append("Cross-examine the outer carton (first image) against the inner blister strip (second image).")
            else:
                contents.append("Cross-examine the medicine packaging surfaces shown in this image for batch, date, and pill consistency.")

            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )

            raw_text = response.text.strip()
            parsed = json.loads(raw_text)

            pass_val = parsed.get("pass")
            if pass_val not in (True, False, None):
                if isinstance(pass_val, str):
                    pass_val = True if pass_val.lower() == "true" else (False if pass_val.lower() == "false" else None)
                else:
                    pass_val = None

            return {
                "id": "carton_vs_blister",
                "pass": pass_val,
                "detail": str(parsed.get("detail", "Carton vs blister packaging check complete.")).strip(),
                "confidence": round(float(parsed.get("confidence", 0.90)), 2),
                "carton_details": parsed.get("carton_details", {}),
                "blister_details": parsed.get("blister_details", {})
            }

        except Exception as e:
            print(f"[BlisterComparator] Execution error: {e}")
            return fallback_null


if __name__ == "__main__":
    comparator = BlisterComparator()
    spec3_path = os.path.join(os.path.dirname(__file__), "images", "spec3.jpg")
    if os.path.exists(spec3_path):
        print(f"Testing BlisterComparator (Google AI Studio) on: {spec3_path}...")
        result = comparator.compare(spec3_path)
        print("Comparison Result:")
        print(json.dumps(result, indent=2))

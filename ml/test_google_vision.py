import json
import os
import time
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv
# pyrefly: ignore[missing-import]
from google import genai
# pyrefly: ignore[missing-import]
from google.genai import types
# pyrefly: ignore[missing-import]
from PIL import Image

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

sample_img_path = os.path.join(os.path.dirname(__file__), "sample_pack.png")
image = Image.open(sample_img_path)

prompt = """Extract the following 5 fields from this medicine pack image into strict JSON:
- reg_no: NAFDAC registration number
- product_name: brand or trade name
- manufacturer: pharmaceutical manufacturing company
- batch_no: batch or lot number
- expiry: expiry date

Format:
{
  "reg_no": {"value": string or null, "confidence": float between 0.0 and 1.0},
  "product_name": {"value": string or null, "confidence": float between 0.0 and 1.0},
  "manufacturer": {"value": string or null, "confidence": float between 0.0 and 1.0},
  "batch_no": {"value": string or null, "confidence": float between 0.0 and 1.0},
  "expiry": {"value": string or null, "confidence": float between 0.0 and 1.0}
}
"""

print(f"Testing Google AI Studio Vision with API key on {sample_img_path}...")
t0 = time.time()
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[image, prompt],
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.0
    )
)
dt = round(time.time() - t0, 2)
print(f"Latency: {dt}s")
print("Response JSON:")
print(json.dumps(json.loads(response.text), indent=2))

import os
import requests
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
}

r = requests.get(f"{base_url}/models", headers=headers)
if r.status_code == 200:
    models = [m["id"] for m in r.json().get("data", [])]
    print(f"Total models available: {len(models)}")
    print("\n--- Gemma Models ---")
    for m in models:
        if "gemma" in m.lower():
            print(m)
    print("\n--- Vision / Multimodal / OCR Models ---")
    for m in models:
        if any(term in m.lower() for term in ["vision", "vl", "ocr", "florence", "paligemma", "llama-3.2-11b-vision", "phi-3-vision", "deplot"]):
            print(m)
else:
    print(f"Failed to fetch models: {r.status_code} - {r.text}")

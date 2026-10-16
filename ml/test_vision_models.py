import base64
import io
import json
import os
import requests
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv
# pyrefly: ignore[missing-import]
from PIL import Image, ImageDraw

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
invoke_url = f"{base_url}/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
}

# Create a small, clean test JPEG image
img = Image.new("RGB", (320, 160), color=(255, 255, 255))
draw = ImageDraw.Draw(img)
draw.rectangle([(5, 5), (315, 155)], outline=(0, 0, 0), width=2)
draw.text((20, 20), "Augmentin 625mg", fill=(0, 0, 0))
draw.text((20, 50), "NAFDAC: A4-100137", fill=(0, 0, 0))
draw.text((20, 80), "Batch: B24091", fill=(0, 0, 0))
draw.text((20, 110), "Exp: 2027-08", fill=(0, 0, 0))

buf = io.BytesIO()
img.save(buf, format="JPEG", quality=85)
b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
data_uri = f"data:image/jpeg;base64,{b64_str}"

models_to_test = [
    "google/gemma-4-31b-it",
    "google/gemma-3-12b-it",
    "google/gemma-3-4b-it",
    "meta/llama-3.2-11b-vision-instruct"
]

prompt = "Extract the NAFDAC number, product name, batch number, and expiry date from this medicine label. Respond with strict JSON."

for model in models_to_test:
    print(f"\n--- Testing model: {model} ---")
    payload = {
        "model": model,
        "max_tokens": 512,
        "temperature": 0.1,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_uri}}
                ]
            }
        ]
    }
    try:
        r = requests.post(invoke_url, headers=headers, json=payload, timeout=45)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            content = r.json()["choices"][0]["message"]["content"]
            print(f"Output:\n{content[:300]}...")
            print(f"--> {model} SUPPORTS VISION!")
            break
        else:
            print(f"Response: {r.text[:200]}")
    except Exception as e:
        print(f"Request failed: {e}")

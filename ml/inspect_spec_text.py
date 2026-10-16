import json
import os
import requests
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv
from vision_extractor import VisionExtractor

load_dotenv()
extractor = VisionExtractor()

prompt = "Transcribe all text visible in this image verbatim. Do not assume or guess any fields. If you cannot see a NAFDAC registration number, batch number, or expiry date, explicitly state 'Not visible'."

for fname in ["spec1.jpg", "spec2.jpg", "spec3.jpg"]:
    fpath = os.path.join(os.path.dirname(__file__), "images", fname)
    image_url = extractor._prepare_image_data_url(fpath)
    
    payload = {
        "model": extractor.model,
        "max_tokens": 512,
        "temperature": 0.0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }
        ]
    }
    
    headers = {
        "Authorization": f"Bearer {extractor.api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    r = requests.post(extractor.invoke_url, headers=headers, json=payload, timeout=45)
    print(f"\n=== VERBATIM OCR FOR {fname} ===")
    if r.status_code == 200:
        print(r.json()["choices"][0]["message"]["content"])
    else:
        print("Error:", r.status_code, r.text)

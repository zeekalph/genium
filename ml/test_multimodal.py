import base64
import io
import json
import os
import requests
from dotenv import load_dotenv
from PIL import Image, ImageDraw

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
model = os.getenv("GEMMA_MODEL", "google/gemma-4-31b-it")

invoke_url = f"{base_url}/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
}

# 1. Create a synthetic medicine pack image for testing
img = Image.new("RGB", (600, 300), color=(255, 255, 255))
draw = ImageDraw.Draw(img)

# Draw simulated medicine carton text
draw.rectangle([(10, 10), (590, 290)], outline=(30, 80, 160), width=4)
draw.text((30, 30), "Augmentin 625mg Tablets", fill=(0, 0, 0))
draw.text((30, 80), "Manufacturer: GlaxoSmithKline Pharmaceuticals", fill=(0, 0, 0))
draw.text((30, 130), "NAFDAC Reg. No: A4-100137", fill=(180, 0, 0))
draw.text((30, 180), "Batch No: B24091", fill=(0, 0, 0))
draw.text((30, 230), "Mfg: 08/2024   Exp: 08/2027", fill=(0, 0, 0))

# Save image locally for reference
sample_img_path = os.path.join(os.path.dirname(__file__), "sample_pack.png")
img.save(sample_img_path)
print(f"Sample pack image saved to: {sample_img_path}")

# Encode to base64
buffered = io.BytesIO()
img.save(buffered, format="PNG")
img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
image_data_url = f"data:image/png;base64,{img_b64}"

# 2. Test Multimodal Call with Gemma
extraction_instruction = (
    "You are an expert pharmaceutical packaging OCR model. "
    "Inspect the image of the medicine pack and extract the following fields in strict JSON format:\n"
    "- reg_no: NAFDAC registration number (e.g. A4-100137)\n"
    "- product_name: brand or trade name\n"
    "- manufacturer: manufacturing company name\n"
    "- batch_no: batch or lot number\n"
    "- expiry: expiration date (YYYY-MM or MM/YYYY)\n\n"
    "Output must be valid JSON with this exact structure:\n"
    "{\n"
    '  "reg_no": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
    '  "product_name": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
    '  "manufacturer": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
    '  "batch_no": {"value": string or null, "confidence": float between 0.0 and 1.0},\n'
    '  "expiry": {"value": string or null, "confidence": float between 0.0 and 1.0}\n'
    "}\n"
    "Return ONLY the JSON object, with no markdown formatting and no extra text."
)

payload = {
    "model": model,
    "max_tokens": 1024,
    "temperature": 0.1,
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": extraction_instruction},
                {"type": "image_url", "image_url": {"url": image_data_url}}
            ]
        }
    ]
}

print(f"Sending multimodal request to {model}...")
response = requests.post(invoke_url, headers=headers, json=payload)
print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    res_data = response.json()
    raw_content = res_data.get("choices", [{}])[0].get("message", {}).get("content", "")
    print("\n--- Raw Model Output ---")
    print(raw_content)
    
    # Clean possible markdown wrapping if any
    cleaned = raw_content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    try:
        parsed_json = json.loads(cleaned)
        print("\n--- Successfully Parsed JSON ---")
        print(json.dumps(parsed_json, indent=2))
        print("\nSUCCESS: Hello-world multimodal extraction call completed successfully!")
    except json.JSONDecodeError as e:
        print(f"\nWarning: JSON parsing failed: {e}")
else:
    print(f"Error: {response.status_code} - {response.text}")

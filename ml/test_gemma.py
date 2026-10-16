import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
model = os.getenv("GEMMA_MODEL", "google/gemma-4-31b-it")

invoke_url = f"{base_url}/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
}

print(f"Testing connectivity to {model} at {invoke_url}...")

# 1. Basic text test
payload = {
    "model": model,
    "max_tokens": 1024,
    "temperature": 0.2,
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is 17 * 23? Reply with only the number."}
    ]
}

response = requests.post(invoke_url, headers=headers, json=payload)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    res_data = response.json()
    reply = res_data.get("choices", [{}])[0].get("message", {}).get("content", "")
    print(f"Model Response: {reply.strip()}")
    print("SUCCESS: Gemma 4 API connectivity confirmed!")
else:
    print(f"Error Response: {response.text}")

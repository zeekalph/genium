import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("NVIDIA_API_KEY")
base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json",
}

r = requests.get(f"{base_url}/models/google/gemma-4-31b-it", headers=headers)
print("Model info status:", r.status_code)
print(r.text)

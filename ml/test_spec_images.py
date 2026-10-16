import json
import os
import time
from vision_extractor import VisionExtractor

IMAGES_DIR = os.path.join(os.path.dirname(__file__), "images")
extractor = VisionExtractor(timeout=45)

print(f"Scanning images in {IMAGES_DIR}...")
for fname in sorted(os.listdir(IMAGES_DIR)):
    if fname.lower().endswith((".jpg", ".jpeg", ".png")):
        fpath = os.path.join(IMAGES_DIR, fname)
        print(f"\n--- Testing {fname} ---")
        t0 = time.time()
        res = extractor.extract_from_image(fpath)
        dt = round(time.time() - t0, 2)
        print(f"Time: {dt}s")
        print(json.dumps(res, indent=2))

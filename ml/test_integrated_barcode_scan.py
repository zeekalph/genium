"""
Test VisionExtractor with Barcode & QR Redirect Link Extraction.
Combines OCR extraction of packaging text + 1D/2D barcode scanning + link redirect resolution.
"""

import json
import os
# pyrefly: ignore[missing-import]
from PIL import Image
from vision_extractor import VisionExtractor

# 1. Compose a realistic medicine pack image with a verification QR code
base_img_path = os.path.join(os.path.dirname(__file__), "sample_pack.png")
qr_img_path = os.path.join(os.path.dirname(__file__), "test_qr_redirect.png")

base_img = Image.open(base_img_path)
qr_img = Image.open(qr_img_path).resize((90, 90))

# Paste QR code onto bottom-right of packaging
composite_img = base_img.copy()
composite_img.paste(qr_img, (490, 195))

composite_path = os.path.join(os.path.dirname(__file__), "pack_with_qr.png")
composite_img.save(composite_path)
print(f"Created composite packaging image with QR code: {composite_path}")

# 2. Run VisionExtractor
extractor = VisionExtractor()
print("\nExecuting VisionExtractor with Barcode & Link Resolution...")
result = extractor.extract_from_image(composite_path)

print("\n=== INTEGRATED EXTRACTION RESULT ===")
print(json.dumps(result, indent=2))

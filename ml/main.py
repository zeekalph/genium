import io
import os
import time
from typing import Any, Dict, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Load environment variables with override
load_dotenv(override=True)

from vision_extractor import VisionExtractor
from blister_comparator import BlisterComparator

app = FastAPI(
    title="Genium ML Vision Service",
    description="Vision extraction and multimodal intelligence service for medicine and food packaging verification.",
    version="1.0.0",
)

# Enable CORS for local backend (NestJS on port 3000/3001) and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
extractor = VisionExtractor()
comparator = BlisterComparator()


@app.get("/")
def root():
    return {
        "service": "Genium ML Vision Service",
        "status": "online",
        "docs": "/docs",
        "model": extractor.model,
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model": extractor.model,
        "api_configured": bool(getattr(extractor, "api_key", None) or getattr(extractor, "api_keys", None)),
    }


@app.post("/extract")
async def extract_packaging(
    image: Optional[UploadFile] = File(None, description="Primary packaging / carton image"),
    file: Optional[UploadFile] = File(None, description="Alias for primary packaging image"),
    blister: Optional[UploadFile] = File(None, description="Optional secondary blister pack or inner vial image"),
) -> Dict[str, Any]:
    """
    Extracts NAFDAC registration number, product name, manufacturer, batch number,
    and expiry date from uploaded drug/food packaging photos.
    Optionally cross-examines carton vs blister if blister image is provided.
    """
    primary_file = image or file
    if not primary_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No primary image provided. Upload using multipart field 'image' or 'file'."
        )

    start_time = time.time()

    try:
        image_bytes = await primary_file.read()
        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image file is empty."
            )

        # Run vision extraction on carton/primary image
        extracted = extractor.extract_from_image(image_bytes)

        # If blister photo is also supplied, extract fields from blister and run cross-check
        blister_extracted = None
        carton_vs_blister = None
        if blister:
            blister_bytes = await blister.read()
            if blister_bytes:
                blister_extracted = extractor.extract_from_image(blister_bytes)
                try:
                    carton_vs_blister = comparator.compare(image_bytes, blister_bytes)
                except Exception as comp_err:
                    carton_vs_blister = {
                        "id": "carton_vs_blister",
                        "pass": None,
                        "detail": f"Comparison error: {str(comp_err)}",
                        "confidence": 0.0,
                    }

        elapsed_ms = int((time.time() - start_time) * 1000)

        return {
            "success": True,
            "extracted": extracted,
            "blister_extracted": blister_extracted,
            "carton_vs_blister": carton_vs_blister,
            "latency_ms": elapsed_ms,
        }

    except HTTPException:
        raise
    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "error": str(e),
            "extracted": {
                "reg_no": {"value": None, "confidence": 0.0},
                "product_name": {"value": None, "confidence": 0.0},
                "manufacturer": {"value": None, "confidence": 0.0},
                "batch_no": {"value": None, "confidence": 0.0},
                "expiry": {"value": None, "confidence": 0.0},
                "barcode": {"detected": False, "barcodes": [], "link_resolution": None},
            },
            "blister_extracted": None,
            "carton_vs_blister": None,
            "latency_ms": elapsed_ms,
        }


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("ML_PORT", "8000")))
    reload = os.getenv("ENV", "development").lower() == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)


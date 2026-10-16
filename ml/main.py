import io
import os
import time
from typing import Any, Dict, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Load environment variables
load_dotenv()

from vision_extractor import VisionExtractor

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

# Initialize VisionExtractor instance
extractor = VisionExtractor()


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
        "api_configured": bool(extractor.api_key),
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

        # If blister photo is also supplied, extract fields from blister as well
        blister_extracted = None
        if blister:
            blister_bytes = await blister.read()
            if blister_bytes:
                blister_extracted = extractor.extract_from_image(blister_bytes)

        elapsed_ms = int((time.time() - start_time) * 1000)

        return {
            "success": True,
            "extracted": extracted,
            "blister_extracted": blister_extracted,
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
            },
            "blister_extracted": None,
            "latency_ms": elapsed_ms,
        }


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

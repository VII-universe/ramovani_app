"""
POST /analyze — main vision endpoint.
Orchestrates: decode → edge detect → warp → dimension calc → persist → respond.
"""

import os
import time
import uuid
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.request import AnalyzeRequest
from app.schemas.response import (
    ArtworkDimensions,
    HomographyResult,
    VisionError,
    VisionResult,
)
from app.services.dimension_calc import calculate_dimensions
from app.services.edge_detector import ArtworkNotFoundError, detect_artwork_corners
from app.services.homography import warp_artwork

router = APIRouter(prefix="/analyze", tags=["vision"])


@router.post(
    "",
    response_model=VisionResult,
    responses={
        422: {"model": VisionError},
        500: {"model": VisionError},
    },
)
async def analyze_artwork(
    file: UploadFile,
    known_dimension_axis: str = Form(...),
    known_dimension_mm: float = Form(...),
) -> VisionResult:
    t_start = time.perf_counter()

    # ── Validate request fields ───────────────────────────────────────────────
    try:
        req = AnalyzeRequest(
            known_dimension_axis=known_dimension_axis,  # type: ignore[arg-type]
            known_dimension_mm=known_dimension_mm,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=VisionError(
                code="INVALID_DIMENSION",
                message="Invalid dimension parameters.",
                detail=str(exc),
            ).model_dump(),
        ) from exc

    # ── Read and decode image ─────────────────────────────────────────────────
    raw = await file.read()
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=VisionError(code="INVALID_IMAGE", message="File too large.").model_dump(),
        )

    nparr = np.frombuffer(raw, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=VisionError(
                code="INVALID_IMAGE", message="Could not decode image."
            ).model_dump(),
        )

    # ── Edge detection ────────────────────────────────────────────────────────
    try:
        corners, confidence = detect_artwork_corners(image, settings.min_contour_area)
    except ArtworkNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=VisionError(
                code="NO_ARTWORK_DETECTED",
                message="Could not detect artwork edges. Ensure the artwork has clear borders on a contrasting background.",
                detail=str(exc),
            ).model_dump(),
        ) from exc

    warnings: list[str] = []
    if confidence < settings.confidence_warn_threshold:
        warnings.append(
            f"Low detection confidence ({confidence:.0%}). Please verify the dimensions."
        )

    # ── Perspective warp ──────────────────────────────────────────────────────
    warped, transform_matrix = warp_artwork(image, corners)
    h_px, w_px = warped.shape[:2]

    # ── Dimension calculation ─────────────────────────────────────────────────
    dims = calculate_dimensions(
        width_px=w_px,
        height_px=h_px,
        known_axis=req.known_dimension_axis,
        known_mm=req.known_dimension_mm,
    )

    # ── Persist cropped image ─────────────────────────────────────────────────
    analysis_id = str(uuid.uuid4())
    static_dir = Path(settings.static_dir)
    static_dir.mkdir(parents=True, exist_ok=True)

    out_path = static_dir / f"{analysis_id}.jpg"
    cv2.imwrite(str(out_path), warped, [cv2.IMWRITE_JPEG_QUALITY, 92])

    cropped_url = f"/static/{analysis_id}.jpg"

    processing_ms = (time.perf_counter() - t_start) * 1000

    return VisionResult(
        id=analysis_id,
        original_filename=file.filename or "upload",
        cropped_image_url=cropped_url,
        dimensions=ArtworkDimensions(
            width_mm=dims["width_mm"],
            height_mm=dims["height_mm"],
            width_px=w_px,
            height_px=h_px,
            pixels_per_mm=dims["pixels_per_mm"],
            aspect_ratio=dims["aspect_ratio"],
        ),
        homography=HomographyResult(
            corners=corners.tolist(),
            transform_matrix=transform_matrix.tolist(),
            confidence=confidence,
        ),
        processing_time_ms=round(processing_ms, 2),
        warnings=warnings,
    )

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class ArtworkDimensions(BaseModel):
    """
    Physical vs. pixel dimensional matrix for the detected artwork.

    All mm values are rounded to 2 decimal places.
    pixels_per_mm is the calibrated scale factor derived from the user's
    reference measurement; it is the single source of truth for the
    pixel ↔ physical conversion.
    """

    model_config = ConfigDict(frozen=True)

    width_mm: Annotated[float, Field(gt=0, description="Artwork width in millimetres")]
    height_mm: Annotated[float, Field(gt=0, description="Artwork height in millimetres")]
    width_px: Annotated[int, Field(gt=0, description="Rectified (warped) image width in pixels")]
    height_px: Annotated[int, Field(gt=0, description="Rectified (warped) image height in pixels")]
    pixels_per_mm: Annotated[
        float,
        Field(gt=0, description="Scale factor: pixels per physical millimetre"),
    ]
    aspect_ratio: Annotated[
        float,
        Field(gt=0, description="width_mm / height_mm"),
    ]


class HomographyResult(BaseModel):
    """
    Raw output of the perspective-warp step.

    corners: 4 points ordered TL → TR → BR → BL, each as [x, y] in the
             coordinate space of the *original* (pre-warp) image.
    transform_matrix: the 3×3 homography matrix flattened row-major to 9 floats.
    confidence: detector quality score in [0, 1].
    """

    model_config = ConfigDict(frozen=True)

    corners: Annotated[
        list[list[float]],
        Field(min_length=4, max_length=4, description="4 corners [[x,y], ...] TL→TR→BR→BL"),
    ]
    transform_matrix: Annotated[
        list[float],
        Field(min_length=9, max_length=9, description="3×3 homography matrix, row-major"),
    ]
    confidence: Annotated[float, Field(ge=0.0, le=1.0, description="Detection quality in [0, 1]")]

    @field_validator("corners")
    @classmethod
    def corners_must_be_xy_pairs(cls, v: list[list[float]]) -> list[list[float]]:
        for i, point in enumerate(v):
            if len(point) != 2:  # noqa: PLR2004
                raise ValueError(
                    f"corners[{i}] must be a 2-element [x, y] list, got {len(point)} elements"
                )
        return v


# ---------------------------------------------------------------------------
# Top-level success response
# ---------------------------------------------------------------------------

class VisionResult(BaseModel):
    """
    Full response body for a successful POST /analyze call.
    """

    model_config = ConfigDict(frozen=True)

    id: str = Field(..., description="UUID identifying this analysis run")
    original_filename: str = Field(..., description="Filename supplied by the caller")
    cropped_image_url: str = Field(..., description="Server-relative URL of the rectified crop")
    dimensions: ArtworkDimensions
    homography: HomographyResult
    processing_time_ms: Annotated[
        float,
        Field(ge=0, description="Wall-clock time for the full pipeline in milliseconds"),
    ]
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal advisory messages (e.g. low detection confidence)",
    )


# ---------------------------------------------------------------------------
# Error response
# ---------------------------------------------------------------------------

class VisionErrorCode(StrEnum):
    """
    Machine-readable error codes returned in VisionError payloads.
    Using StrEnum so values serialize to plain strings and can be compared
    with string literals without an extra .value call.
    """

    NO_ARTWORK_DETECTED = "NO_ARTWORK_DETECTED"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    INVALID_IMAGE = "INVALID_IMAGE"
    INVALID_DIMENSION = "INVALID_DIMENSION"
    PROCESSING_FAILED = "PROCESSING_FAILED"


class VisionError(BaseModel):
    """
    Standardised error payload.  Always accompanies 4xx / 5xx responses.
    """

    model_config = ConfigDict(frozen=True)

    code: Literal[
        "NO_ARTWORK_DETECTED",
        "LOW_CONFIDENCE",
        "INVALID_IMAGE",
        "INVALID_DIMENSION",
        "PROCESSING_FAILED",
    ]
    message: str = Field(..., description="Human-readable error summary")
    detail: str | None = Field(default=None, description="Optional debugging detail")

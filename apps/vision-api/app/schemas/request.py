from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Incoming request — non-file fields from the multipart POST /analyze body.
# The image binary is handled separately as FastAPI UploadFile.
# ---------------------------------------------------------------------------

KnownAxis = Literal["width", "height"]

# Annotated type re-used in both the model and anywhere else that needs
# a validated mm measurement.
MillimetreValue = Annotated[
    float,
    Field(
        gt=0.0,
        le=5_000.0,
        description=(
            "Physical measurement in millimetres for the known axis. "
            "Must be > 0 and ≤ 5 000 mm (roughly 5 m — the largest expected artwork)."
        ),
    ),
]


class AnalyzeRequest(BaseModel):
    """
    Validated payload for POST /analyze.

    Pydantic will reject:
      - extra fields not listed here (extra="forbid")
      - known_dimension_mm ≤ 0 or > 5 000
      - known_dimension_axis values other than 'width' | 'height'
    """

    model_config = ConfigDict(extra="forbid")

    known_dimension_axis: KnownAxis = Field(
        ...,
        description=(
            "Which physical axis the caller measured. "
            "Accepted values: 'width' | 'height'."
        ),
    )
    known_dimension_mm: MillimetreValue

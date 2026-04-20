"""
Dimension calculation service.

Given the pixel dimensions of a rectified (perspective-corrected) artwork
image and one known physical measurement supplied by the user, this module
derives:

  1. pixels_per_mm  — the calibrated scale factor
  2. The missing physical dimension (width or height in mm)
  3. The aspect ratio (width_mm / height_mm)

Math
----
If the user knows the *width*:

    pixels_per_mm = width_px / known_mm
    height_mm     = height_px / pixels_per_mm

If the user knows the *height*:

    pixels_per_mm = height_px / known_mm
    width_mm      = width_px  / pixels_per_mm

Both branches are exact (no approximation) given the input values.
"""

from typing import Literal, TypedDict


class DimensionResult(TypedDict):
    """
    Typed mapping returned by :func:`calculate_dimensions`.

    All millimetre values are rounded to 2 decimal places.
    ``pixels_per_mm`` is rounded to 4 decimal places to preserve enough
    precision for downstream frame-cutting calculations.
    """

    width_mm: float
    height_mm: float
    pixels_per_mm: float
    aspect_ratio: float


def calculate_dimensions(
    width_px: int,
    height_px: int,
    known_axis: Literal["width", "height"],
    known_mm: float,
) -> DimensionResult:
    """
    Convert pixel dimensions to physical millimetres using one reference measurement.

    Parameters
    ----------
    width_px:
        Width of the rectified artwork image in pixels.  Must be > 0.
    height_px:
        Height of the rectified artwork image in pixels.  Must be > 0.
    known_axis:
        Which axis the caller physically measured — ``'width'`` or ``'height'``.
    known_mm:
        Physical size of ``known_axis`` in millimetres.  Must be > 0.

    Returns
    -------
    DimensionResult
        ``width_mm``, ``height_mm``, ``pixels_per_mm``, ``aspect_ratio``.

    Raises
    ------
    ValueError
        If any input violates a precondition (non-positive pixel size,
        non-positive known_mm, or unrecognised axis).

    Examples
    --------
    >>> calculate_dimensions(600, 440, "width", 297.0)
    {'width_mm': 297.0, 'height_mm': 217.98, 'pixels_per_mm': 2.0202, 'aspect_ratio': 1.362...}

    >>> calculate_dimensions(600, 440, "height", 210.0)
    {'width_mm': 286.36, 'height_mm': 210.0, 'pixels_per_mm': 2.0952, 'aspect_ratio': 1.363...}
    """
    # ── Precondition checks ────────────────────────────────────────────────────
    if width_px <= 0:
        raise ValueError(f"width_px must be > 0, got {width_px}")
    if height_px <= 0:
        raise ValueError(f"height_px must be > 0, got {height_px}")
    if known_mm <= 0:
        raise ValueError(f"known_mm must be > 0, got {known_mm}")
    if known_axis not in ("width", "height"):
        raise ValueError(f"known_axis must be 'width' or 'height', got {known_axis!r}")

    # ── Scale factor + missing dimension ──────────────────────────────────────
    if known_axis == "width":
        pixels_per_mm: float = width_px / known_mm
        width_mm: float = known_mm
        height_mm: float = height_px / pixels_per_mm
    else:  # known_axis == "height"
        pixels_per_mm = height_px / known_mm
        height_mm = known_mm
        width_mm = width_px / pixels_per_mm

    # ── Aspect ratio ──────────────────────────────────────────────────────────
    # height_mm is always > 0 here because height_px > 0 and known_mm > 0.
    aspect_ratio: float = width_mm / height_mm

    return DimensionResult(
        width_mm=round(width_mm, 2),
        height_mm=round(height_mm, 2),
        pixels_per_mm=round(pixels_per_mm, 4),
        aspect_ratio=round(aspect_ratio, 6),
    )

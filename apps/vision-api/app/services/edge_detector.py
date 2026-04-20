"""
Edge detection service.

Pipeline
--------
1. Grayscale conversion
2. Gaussian blur  (reduces noise before edge detection)
3. Adaptive Canny (thresholds derived from Otsu's method — robust across
   different image exposures and contrast levels)
4. Morphological CLOSE then DILATE  (seals broken edge lines before
   finding contours)
5. External contour extraction
6. Best quadrilateral selection using multi-epsilon polygon approximation
   (tries progressively looser fits so slightly curved artwork edges are
   still matched)
7. TL→TR→BR→BL corner ordering
8. Confidence scoring (area coverage × rectangularity)

Error handling
--------------
`ArtworkNotFoundError` is raised when no quadrilateral with sufficient area
can be found.  Callers are responsible for turning this into an HTTP error.
"""

import cv2
import numpy as np
from numpy.typing import NDArray


# ---------------------------------------------------------------------------
# Exception
# ---------------------------------------------------------------------------

class ArtworkNotFoundError(Exception):
    """
    Raised by :func:`detect_artwork_corners` when the image contains no
    quadrilateral contour large enough to be considered an artwork.
    """


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Canny: use Otsu threshold as high, half as low (standard 2:1 ratio).
_CANNY_SIGMA: float = 0.5  # low = (1 - σ) * otsu, high = otsu

# Polygon approximation: try these epsilon fractions of the perimeter in
# order; first one that yields exactly 4 vertices wins.
_EPSILON_FRACTIONS: tuple[float, ...] = (0.01, 0.02, 0.03, 0.04, 0.05, 0.06)

# Morphological kernels.
_CLOSE_KERNEL_SIZE: int = 5   # seals small breaks in edge lines
_DILATE_KERNEL_SIZE: int = 5  # fattens remaining edges for cleaner contours
_DILATE_ITERATIONS: int = 1

# Confidence: full area score when artwork covers this fraction of the image.
_AREA_SCORE_FULL_AT: float = 0.20  # 20 % coverage → area_score = 1.0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def order_corners(pts: NDArray[np.float32]) -> NDArray[np.float32]:
    """
    Sort 4 corner points into [TL, TR, BR, BL] order.

    Strategy
    --------
    - TL has the smallest (x + y) sum.
    - BR has the largest  (x + y) sum.
    - TR has the smallest (y - x) diff.
    - BL has the largest  (y - x) diff.
    """
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # TL
    rect[2] = pts[np.argmax(s)]   # BR
    diff = np.diff(pts, axis=1).ravel()
    rect[1] = pts[np.argmin(diff)]  # TR
    rect[3] = pts[np.argmax(diff)]  # BL
    return rect


def _otsu_canny(gray_blurred: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """
    Run Canny with thresholds derived from Otsu's binarisation threshold.

    Using the Otsu value removes the need for hardcoded thresholds and
    adapts automatically to each image's contrast range.
    """
    otsu_val, _ = cv2.threshold(
        gray_blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    high = float(otsu_val)
    low = float(otsu_val) * _CANNY_SIGMA
    # Guard: if the image is nearly uniform (otsu ≈ 0), fall back to
    # safe defaults so Canny still runs.
    if high < 1.0:
        low, high = 30.0, 100.0
    return cv2.Canny(gray_blurred, low, high)


def _best_quad(
    contours: tuple[NDArray, ...],
    min_area: int,
) -> tuple[NDArray[np.float32], float] | None:
    """
    Find the largest quadrilateral among *contours* with area ≥ *min_area*.

    Returns ``(corners_4x2, contour_area)`` or ``None`` if no quad qualifies.
    Multi-epsilon polygon approximation is tried for each candidate so that
    artwork with slightly bowed edges is still matched.
    """
    best_quad: NDArray[np.float32] | None = None
    best_area: float = 0.0

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        peri = cv2.arcLength(contour, closed=True)
        quad: NDArray[np.float32] | None = None

        for eps_frac in _EPSILON_FRACTIONS:
            approx = cv2.approxPolyDP(contour, eps_frac * peri, closed=True)
            if len(approx) == 4:  # noqa: PLR2004
                quad = approx.reshape(4, 2).astype(np.float32)
                break  # accept the tightest fit that gives 4 vertices

        if quad is not None and area > best_area:
            best_area = area
            best_quad = quad

    if best_quad is None:
        return None
    return best_quad, best_area


def _compute_confidence(
    contour_area: float,
    image_area: float,
    quad: NDArray[np.float32],
) -> float:
    """
    Compute a detection quality score in [0, 1].

    Score = area_score × rectangularity

    area_score:
        Fraction of the image covered by the detected quad, normalised so
        that `_AREA_SCORE_FULL_AT` coverage gives a score of 1.0.  This
        prevents tiny slivers getting unfairly low scores while still
        penalising quads that are implausibly small.

    rectangularity:
        Ratio of the quad's pixel area to its convex hull area.  A perfect
        rectangle scores 1.0; a very irregular quadrilateral scores lower.
    """
    area_fraction = contour_area / image_area if image_area > 0 else 0.0
    area_score = min(area_fraction / _AREA_SCORE_FULL_AT, 1.0)

    hull = cv2.convexHull(quad.astype(np.int32))
    hull_area = float(cv2.contourArea(hull))
    rectangularity = contour_area / hull_area if hull_area > 0 else 0.5

    return float(np.clip(area_score * rectangularity, 0.0, 1.0))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_artwork_corners(
    image: NDArray[np.uint8],
    min_contour_area: int = 5_000,
) -> tuple[NDArray[np.float32], float]:
    """
    Detect the four corners of the largest rectangular artwork in *image*.

    Parameters
    ----------
    image:
        BGR image as a ``(H, W, 3)`` uint8 numpy array.
    min_contour_area:
        Minimum contour area in pixels.  Contours smaller than this are
        ignored.  Defaults to 5 000 px², which filters out noise while
        accepting artwork as small as ~70×70 px.

    Returns
    -------
    corners:
        ``(4, 2)`` float32 array of corner coordinates ordered TL→TR→BR→BL
        in the original image's coordinate space.
    confidence:
        Detection quality in **[0, 1]**.  Values below the router's
        ``confidence_reject_threshold`` (default 0.2) cause the request to
        be rejected.  Values between that and ``confidence_warn_threshold``
        (default 0.5) trigger a warning in the response.

    Raises
    ------
    ArtworkNotFoundError
        If no quadrilateral contour with area ≥ *min_contour_area* can be
        found.  Callers should surface this as an HTTP 422 error.
    ValueError
        If *image* is not a 3-channel 2-D array.
    """
    if image.ndim != 3 or image.shape[2] != 3:  # noqa: PLR2004
        raise ValueError(
            f"Expected a 3-channel BGR image, got shape {image.shape}"
        )

    h, w = image.shape[:2]
    image_area = float(h * w)

    # ── 1. Grayscale ──────────────────────────────────────────────────────────
    gray: NDArray[np.uint8] = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # ── 2. Gaussian blur ─────────────────────────────────────────────────────
    blurred: NDArray[np.uint8] = cv2.GaussianBlur(gray, (7, 7), 0)

    # ── 3. Adaptive Canny ────────────────────────────────────────────────────
    edges: NDArray[np.uint8] = _otsu_canny(blurred)

    # ── 4. Morphological CLOSE then DILATE ───────────────────────────────────
    close_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (_CLOSE_KERNEL_SIZE, _CLOSE_KERNEL_SIZE)
    )
    closed: NDArray[np.uint8] = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, close_kernel)

    dilate_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (_DILATE_KERNEL_SIZE, _DILATE_KERNEL_SIZE)
    )
    dilated: NDArray[np.uint8] = cv2.dilate(
        closed, dilate_kernel, iterations=_DILATE_ITERATIONS
    )

    # ── 5. Contour extraction ─────────────────────────────────────────────────
    contours, _ = cv2.findContours(
        dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    # ── 6. Best quadrilateral selection ──────────────────────────────────────
    result = _best_quad(contours, min_contour_area)
    if result is None:
        raise ArtworkNotFoundError(
            f"No quadrilateral contour with area ≥ {min_contour_area} px² found. "
            "Ensure the artwork has clear borders on a contrasting background."
        )

    best_quad, contour_area = result

    # ── 7. Order corners TL → TR → BR → BL ───────────────────────────────────
    ordered = order_corners(best_quad)

    # ── 8. Confidence scoring ─────────────────────────────────────────────────
    confidence = _compute_confidence(contour_area, image_area, best_quad)

    return ordered, confidence

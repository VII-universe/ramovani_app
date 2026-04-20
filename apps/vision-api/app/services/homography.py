"""
Homography warp service.

Given the four corner points produced by the edge detector, this module:

1. Computes the output canvas size from the average of opposing side lengths
   (more accurate than ``max()`` for mildly perspective-distorted quads).
2. Validates that the output dimensions are within safe bounds.
3. Builds the 3×3 perspective transform via ``cv2.getPerspectiveTransform``.
4. Warps the original image to a flat, top-down, axis-aligned rectangle via
   ``cv2.warpPerspective`` with Lanczos-4 interpolation.

The returned transform matrix is flattened row-major to 9 float32 elements
so it can be stored in the ``HomographyResult`` response schema directly.
"""

import cv2
import numpy as np
from numpy.typing import NDArray


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Minimum and maximum dimension (in pixels) for the warped output.
# Too small → unusable crop.  Too large → memory explosion / DoS vector.
_MIN_OUTPUT_DIM: int = 50
_MAX_OUTPUT_DIM: int = 8_192


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _euclidean(a: NDArray[np.float32], b: NDArray[np.float32]) -> float:
    """Return the Euclidean distance between two 2-D points."""
    return float(np.linalg.norm(b - a))


def _is_degenerate(corners: NDArray[np.float32]) -> bool:
    """
    Return True if the four corners form a degenerate quadrilateral
    (zero area or any side with zero length).

    A degenerate quad would cause ``cv2.getPerspectiveTransform`` to
    produce a singular matrix, crashing the warp step.
    """
    tl, tr, br, bl = corners
    sides = [
        _euclidean(tl, tr),
        _euclidean(tr, br),
        _euclidean(br, bl),
        _euclidean(bl, tl),
    ]
    return any(s < 1.0 for s in sides)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_output_size(corners: NDArray[np.float32]) -> tuple[int, int]:
    """
    Compute the ``(width, height)`` of the warped output canvas.

    Method
    ------
    Average the lengths of the two opposing sides for each axis.  This is
    more accurate than ``max()`` for quads that are only slightly distorted:

    - ``max`` overestimates by using the longest side.
    - ``average`` produces the expected dimension of the original rectangle.

    The result is clamped to ``[_MIN_OUTPUT_DIM, _MAX_OUTPUT_DIM]`` to
    prevent degenerate or memory-exhausting outputs.

    Parameters
    ----------
    corners:
        ``(4, 2)`` float32 array ordered TL → TR → BR → BL.

    Returns
    -------
    (width, height) in pixels.
    """
    tl, tr, br, bl = corners

    width = int(round((_euclidean(tl, tr) + _euclidean(bl, br)) / 2.0))
    height = int(round((_euclidean(tl, bl) + _euclidean(tr, br)) / 2.0))

    width = int(np.clip(width, _MIN_OUTPUT_DIM, _MAX_OUTPUT_DIM))
    height = int(np.clip(height, _MIN_OUTPUT_DIM, _MAX_OUTPUT_DIM))

    return width, height


def warp_artwork(
    image: NDArray[np.uint8],
    corners: NDArray[np.float32],
) -> tuple[NDArray[np.uint8], NDArray[np.float32]]:
    """
    Apply a perspective warp to produce a flat, top-down crop of the artwork.

    The function maps the four detected corners of the artwork to the four
    corners of a new axis-aligned rectangle, effectively removing any
    perspective distortion.

    Parameters
    ----------
    image:
        Original BGR image as a ``(H, W, 3)`` uint8 numpy array.
    corners:
        ``(4, 2)`` float32 array of corner coordinates ordered
        TL → TR → BR → BL, as returned by
        :func:`~app.services.edge_detector.detect_artwork_corners`.

    Returns
    -------
    warped:
        Rectified BGR image as a ``(height, width, 3)`` uint8 array.
    transform_matrix:
        The 3×3 homography matrix flattened to 9 float32 values, row-major.
        Stored in ``HomographyResult.transform_matrix`` for downstream use.

    Raises
    ------
    ValueError
        If *image* is not a 3-channel 2-D array, if *corners* does not have
        shape ``(4, 2)``, or if the corners form a degenerate quadrilateral
        (any side length < 1 px).
    """
    if image.ndim != 3 or image.shape[2] != 3:  # noqa: PLR2004
        raise ValueError(
            f"Expected a 3-channel BGR image, got shape {image.shape}"
        )
    if corners.shape != (4, 2):
        raise ValueError(
            f"corners must have shape (4, 2), got {corners.shape}"
        )
    if _is_degenerate(corners):
        raise ValueError(
            "Degenerate quadrilateral: one or more sides have length < 1 px. "
            "The artwork corners may be co-linear or collapsed to a single point."
        )

    out_w, out_h = compute_output_size(corners)

    # Destination: axis-aligned rectangle matching the computed output size.
    dst = np.array(
        [
            [0, 0],
            [out_w - 1, 0],
            [out_w - 1, out_h - 1],
            [0, out_h - 1],
        ],
        dtype=np.float32,
    )

    # Ensure source corners are float32 (getPerspectiveTransform requires it).
    src = corners.astype(np.float32)

    matrix: NDArray[np.float64] = cv2.getPerspectiveTransform(src, dst)
    warped: NDArray[np.uint8] = cv2.warpPerspective(
        image,
        matrix,
        (out_w, out_h),
        flags=cv2.INTER_LANCZOS4,
    )

    # Flatten the 3×3 matrix to 9 float32 values, row-major.
    transform_flat: NDArray[np.float32] = matrix.flatten().astype(np.float32)

    return warped, transform_flat

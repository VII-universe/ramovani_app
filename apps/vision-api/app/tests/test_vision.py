"""
Unit + integration tests for the Vision Engine.
Uses a synthetic test image (white rectangle on dark background) for deterministic results.
"""

import io
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient

from app.services.edge_detector import detect_artwork_corners, order_corners
from app.services.homography import warp_artwork, compute_output_size
from app.services.dimension_calc import calculate_dimensions


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_test_image(
    img_w: int = 800,
    img_h: int = 600,
    rect_x: int = 100,
    rect_y: int = 80,
    rect_w: int = 600,
    rect_h: int = 440,
) -> bytes:
    """Generate a synthetic image: white rectangle on dark grey background."""
    img = np.full((img_h, img_w, 3), fill_value=40, dtype=np.uint8)
    cv2.rectangle(img, (rect_x, rect_y), (rect_x + rect_w, rect_y + rect_h), (240, 240, 240), -1)
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return buf.tobytes()


# ── Unit tests ────────────────────────────────────────────────────────────────

class TestDimensionCalc:
    def test_known_width(self) -> None:
        result = calculate_dimensions(600, 440, "width", 297.0)
        assert result["width_mm"] == pytest.approx(297.0, abs=0.1)
        assert result["pixels_per_mm"] == pytest.approx(600 / 297.0, rel=1e-4)
        assert result["height_mm"] == pytest.approx(440 / (600 / 297.0), abs=0.1)

    def test_known_height(self) -> None:
        result = calculate_dimensions(600, 440, "height", 210.0)
        assert result["height_mm"] == pytest.approx(210.0, abs=0.1)
        assert result["pixels_per_mm"] == pytest.approx(440 / 210.0, rel=1e-4)

    def test_aspect_ratio(self) -> None:
        result = calculate_dimensions(600, 400, "width", 300.0)
        assert result["aspect_ratio"] == pytest.approx(300.0 / (400 / 2.0), rel=1e-3)


class TestEdgeDetector:
    def test_detects_rectangle(self) -> None:
        raw = make_test_image()
        nparr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        corners, confidence = detect_artwork_corners(img, min_contour_area=1000)
        assert corners.shape == (4, 2)
        assert confidence > 0.5

    def test_order_corners_tl_first(self) -> None:
        pts = np.array([[100, 80], [700, 80], [700, 520], [100, 520]], dtype=np.float32)
        np.random.shuffle(pts)
        ordered = order_corners(pts)
        # TL should have smallest x+y sum
        assert ordered[0][0] < ordered[1][0]  # TL.x < TR.x
        assert ordered[0][1] < ordered[3][1]  # TL.y < BL.y


# ── Integration tests ─────────────────────────────────────────────────────────

class TestAnalyzeEndpoint:
    def test_health(self, client: TestClient) -> None:
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_analyze_success(self, client: TestClient) -> None:
        image_bytes = make_test_image()
        resp = client.post(
            "/analyze",
            data={"known_dimension_axis": "width", "known_dimension_mm": "297"},
            files={"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "id" in body
        assert body["dimensions"]["width_mm"] == pytest.approx(297.0, abs=1.0)

    def test_analyze_missing_file(self, client: TestClient) -> None:
        resp = client.post(
            "/analyze",
            data={"known_dimension_axis": "width", "known_dimension_mm": "297"},
        )
        assert resp.status_code == 422

    def test_analyze_invalid_dimension(self, client: TestClient) -> None:
        image_bytes = make_test_image()
        resp = client.post(
            "/analyze",
            data={"known_dimension_axis": "width", "known_dimension_mm": "-10"},
            files={"file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg")},
        )
        assert resp.status_code == 422

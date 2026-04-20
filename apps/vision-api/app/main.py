"""
Node Alpha — Vision Engine
FastAPI application factory.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers.vision import router as vision_router


def create_app() -> FastAPI:
    application = FastAPI(
        title="Ramovani Vision API",
        description=(
            "Node Alpha — artwork edge detection, homography warp, "
            "and physical dimension calculation."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    # allow_credentials=True is required so the Next.js frontend can send
    # session cookies / Authorization headers cross-origin.
    # allow_origins must list explicit origins (not "*") whenever
    # allow_credentials is True — this is enforced by browsers.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,   # default: ["http://localhost:3000"]
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    # ── Static files (rectified artwork crops) ────────────────────────────────
    static_dir = Path(settings.static_dir)
    static_dir.mkdir(parents=True, exist_ok=True)
    application.mount(
        "/static",
        StaticFiles(directory=str(static_dir)),
        name="static",
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    application.include_router(vision_router)

    # ── Health ────────────────────────────────────────────────────────────────
    @application.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "node": "alpha"}

    return application


app = create_app()

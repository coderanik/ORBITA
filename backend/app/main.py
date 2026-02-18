"""
ORBITA - Orbital Registry for Big Data, Intelligence, and Traffic Analysis
==========================================================================
FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import (
    space_objects,
    orbits,
    telemetry,
    conjunctions,
    ground_stations,
    space_weather,
    stats,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    # ── startup ──
    print(f"  ORBITA v{settings.APP_VERSION} starting ({settings.ENVIRONMENT})")
    print(f"  Database: {settings.DATABASE_URL[:50]}...")
    yield
    # ── shutdown ──
    print("  ORBITA shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────
API_V1 = "/api/v1"

app.include_router(space_objects.router, prefix=API_V1)
app.include_router(orbits.router,        prefix=API_V1)
app.include_router(telemetry.router,     prefix=API_V1)
app.include_router(conjunctions.router,  prefix=API_V1)
app.include_router(ground_stations.router, prefix=API_V1)
app.include_router(space_weather.router, prefix=API_V1)
app.include_router(stats.router,         prefix=API_V1)


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

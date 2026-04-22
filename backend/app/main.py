"""
ORBITA-ATSAD — Orbital Registry for Big Data, Intelligence, and Traffic Analysis
================================================================================
Integrated Platform for Benchmarking and Operational Deployment of
LLM-Based Anomaly Detection in Spacecraft Telemetry.

FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import async_session
from app.auth.bootstrap import ensure_default_admin
from app.api.routes import (
    space_objects,
    orbits,
    telemetry,
    conjunctions,
    ground_stations,
    space_weather,
    stats,
    # ── Phase 2: Complete catalog & analytics routes ──
    operators,
    launch_vehicles,
    launches,
    missions,
    observations,
    propagations,
    maneuvers,
    breakup_events,
    reentry_events,
    # ── ML & Anomaly Detection routes ──
    anomaly_alerts,
    debris_classifications,
    congestion_reports,
    # ── High-Fidelity Physics ──
    physics,
    # ── ATSAD Benchmark ──
    benchmark,
    graphs,
    # ── Auth ──
    auth,
    tle,
    # ── WebSockets & Agents ──
    websockets,
    agents,
    kessler,
    system_ops,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    # ── startup ──
    print(f"  ORBITA-ATSAD v{settings.APP_VERSION} starting ({settings.ENVIRONMENT})")
    print(f"  Database: {settings.DATABASE_URL[:50]}...")
    async with async_session() as session:
        await ensure_default_admin(session)
    yield
    # ── shutdown ──
    print("  ORBITA-ATSAD shutting down")


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

# Core catalog
app.include_router(auth.router,              prefix=API_V1)
app.include_router(space_objects.router,     prefix=API_V1)
app.include_router(operators.router,         prefix=API_V1)
app.include_router(launch_vehicles.router,   prefix=API_V1)
app.include_router(launches.router,          prefix=API_V1)
app.include_router(missions.router,          prefix=API_V1)

# Tracking & orbit
app.include_router(orbits.router,            prefix=API_V1)
app.include_router(observations.router,      prefix=API_V1)
app.include_router(propagations.router,      prefix=API_V1)
app.include_router(ground_stations.router,   prefix=API_V1)

# Telemetry
app.include_router(telemetry.router,         prefix=API_V1)

# Analytics
app.include_router(conjunctions.router,      prefix=API_V1)
app.include_router(maneuvers.router,         prefix=API_V1)
app.include_router(breakup_events.router,    prefix=API_V1)
app.include_router(reentry_events.router,    prefix=API_V1)
app.include_router(space_weather.router,     prefix=API_V1)

# ML & Anomaly Detection
app.include_router(anomaly_alerts.router,    prefix=API_V1)
app.include_router(debris_classifications.router, prefix=API_V1)
app.include_router(congestion_reports.router, prefix=API_V1)

# ATSAD Benchmark
app.include_router(benchmark.router,         prefix=API_V1)

# Dashboard
app.include_router(stats.router,             prefix=API_V1)
app.include_router(graphs.router,            prefix=API_V1)

# High-Fidelity Physics
app.include_router(physics.router,           prefix=API_V1)

# WebSockets
app.include_router(websockets.router,        prefix=API_V1)

# AI Agents
app.include_router(agents.router,            prefix=API_V1)

# Kessler Syndrome Simulator
app.include_router(kessler.router,           prefix=API_V1)

# System operations
app.include_router(system_ops.router,        prefix=API_V1)

# TLE Positions
app.include_router(tle.router,               prefix=API_V1)



@app.get("/", tags=["Health"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "status": "operational",
        "docs": "/docs",
        "benchmark": "/api/v1/atsad",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

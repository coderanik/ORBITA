"""Endpoints for satellite telemetry data."""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.telemetry import SatelliteTelemetry
from app.schemas.telemetry import TelemetryCreate, TelemetryBatchCreate, TelemetryRead
from app.workers.tasks.telemetry_ingest import process_telemetry_batch

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.get("/{object_id}", response_model=list[TelemetryRead])
async def get_telemetry(
    object_id: int,
    subsystem: str | None = Query(None),
    parameter_name: str | None = Query(None),
    quality: str | None = Query(None),
    from_ts: datetime | None = Query(None),
    to_ts: datetime | None = Query(None),
    limit: int = Query(200, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
):
    """Query telemetry for a satellite, with optional filters."""
    query = select(SatelliteTelemetry).where(SatelliteTelemetry.object_id == object_id)

    if subsystem:
        query = query.where(SatelliteTelemetry.subsystem == subsystem.upper())
    if parameter_name:
        query = query.where(SatelliteTelemetry.parameter_name == parameter_name)
    if quality:
        query = query.where(SatelliteTelemetry.quality == quality.upper())
    if from_ts:
        query = query.where(SatelliteTelemetry.ts >= from_ts)
    if to_ts:
        query = query.where(SatelliteTelemetry.ts <= to_ts)

    query = query.order_by(SatelliteTelemetry.ts.desc()).limit(limit)
    result = await db.execute(query)
    rows = result.scalars().all()
    return [TelemetryRead.model_validate(r) for r in rows]


@router.post("/", response_model=TelemetryRead, status_code=201)
async def create_telemetry(
    payload: TelemetryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Insert a single telemetry point."""
    t = SatelliteTelemetry(**payload.model_dump(exclude_unset=True))
    db.add(t)
    await db.flush()
    await db.refresh(t)
    return TelemetryRead.model_validate(t)


@router.post("/batch", status_code=201)
async def create_telemetry_batch(
    payload: TelemetryBatchCreate,
    async_ingest: bool = Query(True, description="Queue background ML ingestion pipeline"),
    db: AsyncSession = Depends(get_db),
):
    """Batch-ingest telemetry data points."""
    if async_ingest:
        try:
            task = process_telemetry_batch.delay(
                [item.model_dump(exclude_unset=True, mode="json") for item in payload.items]
            )
            return {"ingested": len(payload.items), "queued": True, "task_id": task.id}
        except Exception:
            # Fall through to direct DB ingestion if queueing fails.
            pass

    records = [SatelliteTelemetry(**item.model_dump(exclude_unset=True)) for item in payload.items]
    db.add_all(records)
    await db.flush()
    return {"ingested": len(records), "queued": False}

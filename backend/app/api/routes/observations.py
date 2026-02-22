"""CRUD endpoints for Tracking Observations."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.tracking_observation import TrackingObservation
from app.schemas.tracking_observation import (
    TrackingObservationCreate,
    TrackingObservationRead,
    TrackingObservationList,
)

router = APIRouter(prefix="/observations", tags=["Tracking Observations"])


@router.get("/", response_model=TrackingObservationList)
async def list_observations(
    object_id: int | None = Query(None),
    station_id: int | None = Query(None),
    observation_type: str | None = Query(None),
    from_time: datetime | None = Query(None),
    to_time: datetime | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """List tracking observations with filters."""
    query = select(TrackingObservation)
    count_query = select(func.count()).select_from(TrackingObservation)

    if object_id:
        query = query.where(TrackingObservation.object_id == object_id)
        count_query = count_query.where(TrackingObservation.object_id == object_id)
    if station_id:
        query = query.where(TrackingObservation.station_id == station_id)
        count_query = count_query.where(TrackingObservation.station_id == station_id)
    if observation_type:
        query = query.where(TrackingObservation.observation_type == observation_type.upper())
        count_query = count_query.where(TrackingObservation.observation_type == observation_type.upper())
    if from_time:
        query = query.where(TrackingObservation.observation_time >= from_time)
        count_query = count_query.where(TrackingObservation.observation_time >= from_time)
    if to_time:
        query = query.where(TrackingObservation.observation_time <= to_time)
        count_query = count_query.where(TrackingObservation.observation_time <= to_time)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(TrackingObservation.observation_time.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return TrackingObservationList(
        total=total, items=[TrackingObservationRead.model_validate(o) for o in items]
    )


@router.get("/{observation_id}", response_model=TrackingObservationRead)
async def get_observation(observation_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single tracking observation."""
    result = await db.execute(
        select(TrackingObservation).where(TrackingObservation.observation_id == observation_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Observation not found")
    return TrackingObservationRead.model_validate(obj)


@router.post("/", response_model=TrackingObservationRead, status_code=201)
async def create_observation(payload: TrackingObservationCreate, db: AsyncSession = Depends(get_db)):
    """Record a new tracking observation."""
    obj = TrackingObservation(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return TrackingObservationRead.model_validate(obj)


@router.post("/batch", status_code=201)
async def create_observations_batch(
    payloads: list[TrackingObservationCreate],
    db: AsyncSession = Depends(get_db),
):
    """Batch-ingest tracking observations."""
    records = [TrackingObservation(**p.model_dump(exclude_unset=True)) for p in payloads]
    db.add_all(records)
    await db.flush()
    return {"ingested": len(records)}

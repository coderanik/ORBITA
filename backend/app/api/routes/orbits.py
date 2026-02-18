"""Endpoints for orbit state data."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.orbit_state import OrbitState
from app.schemas.orbit_state import OrbitStateCreate, OrbitStateRead

router = APIRouter(prefix="/orbits", tags=["Orbit States"])


@router.get("/{object_id}", response_model=list[OrbitStateRead])
async def get_orbit_history(
    object_id: int,
    from_epoch: datetime | None = Query(None, description="Start of time window (UTC)"),
    to_epoch: datetime | None = Query(None, description="End of time window (UTC)"),
    source: str | None = Query(None, description="Filter by source: TLE, RADAR, PROPAGATED, etc."),
    limit: int = Query(100, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """Get orbit state history for a space object."""
    query = select(OrbitState).where(OrbitState.object_id == object_id)

    if from_epoch:
        query = query.where(OrbitState.epoch >= from_epoch)
    if to_epoch:
        query = query.where(OrbitState.epoch <= to_epoch)
    if source:
        query = query.where(OrbitState.source == source.upper())

    query = query.order_by(OrbitState.epoch.desc()).limit(limit)
    result = await db.execute(query)
    states = result.scalars().all()
    return [OrbitStateRead.model_validate(s) for s in states]


@router.get("/{object_id}/latest", response_model=OrbitStateRead)
async def get_latest_orbit(
    object_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent orbit state for a space object."""
    result = await db.execute(
        select(OrbitState)
        .where(OrbitState.object_id == object_id)
        .order_by(OrbitState.epoch.desc())
        .limit(1)
    )
    state = result.scalar_one_or_none()
    if not state:
        raise HTTPException(status_code=404, detail="No orbit data found for this object")
    return OrbitStateRead.model_validate(state)


@router.post("/", response_model=OrbitStateRead, status_code=201)
async def create_orbit_state(
    payload: OrbitStateCreate,
    db: AsyncSession = Depends(get_db),
):
    """Insert a new orbit state record."""
    state = OrbitState(**payload.model_dump(exclude_unset=True))
    db.add(state)
    await db.flush()
    await db.refresh(state)
    return OrbitStateRead.model_validate(state)


@router.post("/batch", response_model=list[OrbitStateRead], status_code=201)
async def create_orbit_states_batch(
    payloads: list[OrbitStateCreate],
    db: AsyncSession = Depends(get_db),
):
    """Batch-insert orbit states (e.g., after TLE ingestion)."""
    states = [OrbitState(**p.model_dump(exclude_unset=True)) for p in payloads]
    db.add_all(states)
    await db.flush()
    for s in states:
        await db.refresh(s)
    return [OrbitStateRead.model_validate(s) for s in states]

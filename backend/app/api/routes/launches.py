"""CRUD endpoints for Launch Events."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.launch_event import LaunchEvent
from app.schemas.launch_event import LaunchEventCreate, LaunchEventRead, LaunchEventList

router = APIRouter(prefix="/launches", tags=["Launch Events"])


@router.get("/", response_model=LaunchEventList)
async def list_launches(
    outcome: str | None = Query(None, description="SUCCESS, FAILURE, PARTIAL"),
    orbit_target: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List launch events with optional filters."""
    query = select(LaunchEvent)
    count_query = select(func.count()).select_from(LaunchEvent)

    if outcome:
        query = query.where(LaunchEvent.outcome == outcome.upper())
        count_query = count_query.where(LaunchEvent.outcome == outcome.upper())
    if orbit_target:
        query = query.where(LaunchEvent.orbit_target == orbit_target.upper())
        count_query = count_query.where(LaunchEvent.orbit_target == orbit_target.upper())
    if from_date:
        query = query.where(LaunchEvent.launch_date >= from_date)
        count_query = count_query.where(LaunchEvent.launch_date >= from_date)
    if to_date:
        query = query.where(LaunchEvent.launch_date <= to_date)
        count_query = count_query.where(LaunchEvent.launch_date <= to_date)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(LaunchEvent.launch_date.desc()).offset(offset).limit(limit))
    items = result.scalars().all()

    return LaunchEventList(total=total, items=[LaunchEventRead.model_validate(e) for e in items])


@router.get("/{launch_id}", response_model=LaunchEventRead)
async def get_launch(launch_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single launch event by ID."""
    result = await db.execute(select(LaunchEvent).where(LaunchEvent.launch_id == launch_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Launch event not found")
    return LaunchEventRead.model_validate(obj)


@router.post("/", response_model=LaunchEventRead, status_code=201)
async def create_launch(payload: LaunchEventCreate, db: AsyncSession = Depends(get_db)):
    """Record a new launch event."""
    obj = LaunchEvent(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return LaunchEventRead.model_validate(obj)

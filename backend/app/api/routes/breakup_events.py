"""CRUD endpoints for Breakup Events."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.breakup_event import BreakupEvent
from app.schemas.breakup_event import (
    BreakupEventCreate,
    BreakupEventRead,
    BreakupEventUpdate,
    BreakupEventList,
)

router = APIRouter(prefix="/breakup-events", tags=["Breakup Events"])


@router.get("/", response_model=BreakupEventList)
async def list_breakup_events(
    event_type: str | None = Query(None, description="EXPLOSION, COLLISION, UNKNOWN"),
    is_confirmed: bool | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List breakup events with optional filters."""
    query = select(BreakupEvent)
    count_query = select(func.count()).select_from(BreakupEvent)

    if event_type:
        query = query.where(BreakupEvent.event_type == event_type.upper())
        count_query = count_query.where(BreakupEvent.event_type == event_type.upper())
    if is_confirmed is not None:
        query = query.where(BreakupEvent.is_confirmed == is_confirmed)
        count_query = count_query.where(BreakupEvent.is_confirmed == is_confirmed)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(BreakupEvent.event_time.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return BreakupEventList(total=total, items=[BreakupEventRead.model_validate(e) for e in items])


@router.get("/{breakup_id}", response_model=BreakupEventRead)
async def get_breakup_event(breakup_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single breakup event."""
    result = await db.execute(select(BreakupEvent).where(BreakupEvent.breakup_id == breakup_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Breakup event not found")
    return BreakupEventRead.model_validate(obj)


@router.post("/", response_model=BreakupEventRead, status_code=201)
async def create_breakup_event(payload: BreakupEventCreate, db: AsyncSession = Depends(get_db)):
    """Record a new breakup event."""
    obj = BreakupEvent(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return BreakupEventRead.model_validate(obj)


@router.patch("/{breakup_id}", response_model=BreakupEventRead)
async def update_breakup_event(
    breakup_id: int,
    payload: BreakupEventUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a breakup event (e.g., confirm fragments)."""
    result = await db.execute(select(BreakupEvent).where(BreakupEvent.breakup_id == breakup_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Breakup event not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return BreakupEventRead.model_validate(obj)

"""CRUD endpoints for Reentry Events."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.reentry_event import ReentryEvent
from app.schemas.reentry_event import (
    ReentryEventCreate,
    ReentryEventRead,
    ReentryEventUpdate,
    ReentryEventList,
)

router = APIRouter(prefix="/reentry-events", tags=["Reentry Events"])


@router.get("/", response_model=ReentryEventList)
async def list_reentry_events(
    status: str | None = Query(None, description="PREDICTED, IMMINENT, COMPLETED"),
    risk_level: str | None = Query(None),
    is_controlled: bool | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List reentry events with optional filters."""
    query = select(ReentryEvent)
    count_query = select(func.count()).select_from(ReentryEvent)

    if status:
        query = query.where(ReentryEvent.status == status.upper())
        count_query = count_query.where(ReentryEvent.status == status.upper())
    if risk_level:
        query = query.where(ReentryEvent.risk_level == risk_level.upper())
        count_query = count_query.where(ReentryEvent.risk_level == risk_level.upper())
    if is_controlled is not None:
        query = query.where(ReentryEvent.is_controlled == is_controlled)
        count_query = count_query.where(ReentryEvent.is_controlled == is_controlled)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(ReentryEvent.reentry_id.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return ReentryEventList(total=total, items=[ReentryEventRead.model_validate(e) for e in items])


@router.get("/{reentry_id}", response_model=ReentryEventRead)
async def get_reentry_event(reentry_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single reentry event."""
    result = await db.execute(select(ReentryEvent).where(ReentryEvent.reentry_id == reentry_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Reentry event not found")
    return ReentryEventRead.model_validate(obj)


@router.post("/", response_model=ReentryEventRead, status_code=201)
async def create_reentry_event(payload: ReentryEventCreate, db: AsyncSession = Depends(get_db)):
    """Record a new reentry event."""
    obj = ReentryEvent(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return ReentryEventRead.model_validate(obj)


@router.patch("/{reentry_id}", response_model=ReentryEventRead)
async def update_reentry_event(
    reentry_id: int,
    payload: ReentryEventUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a reentry event (e.g., update status, actual coordinates)."""
    result = await db.execute(select(ReentryEvent).where(ReentryEvent.reentry_id == reentry_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Reentry event not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return ReentryEventRead.model_validate(obj)

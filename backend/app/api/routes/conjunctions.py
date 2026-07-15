"""Endpoints for conjunction events and collision risk."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.scoping import enforce_org_scope
from app.core.database import get_db
from app.models.conjunction import ConjunctionEvent
from app.models.space_object import SpaceObject
from app.schemas.conjunction import (
    ConjunctionCreate,
    ConjunctionRead,
    ConjunctionUpdate,
    ConjunctionAlert,
)

router = APIRouter(prefix="/conjunctions", tags=["Conjunction Events"])


@router.get("/", response_model=list[ConjunctionRead])
async def list_conjunctions(
    risk_level: str | None = Query(None, description="LOW, MEDIUM, HIGH, CRITICAL, RED"),
    status: str | None = Query(None),
    from_tca: datetime | None = Query(None),
    to_tca: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List conjunction events with optional filters."""
    query = enforce_org_scope(select(ConjunctionEvent), ConjunctionEvent, current_user)

    if risk_level:
        query = query.where(ConjunctionEvent.risk_level == risk_level.upper())
    if status:
        query = query.where(ConjunctionEvent.status == status.upper())
    if from_tca:
        query = query.where(ConjunctionEvent.time_of_closest_approach >= from_tca)
    if to_tca:
        query = query.where(ConjunctionEvent.time_of_closest_approach <= to_tca)

    query = query.order_by(ConjunctionEvent.collision_probability.desc()).limit(limit)
    result = await db.execute(query)
    events = result.scalars().all()
    return [ConjunctionRead.model_validate(e) for e in events]


@router.get("/alerts", response_model=list[ConjunctionAlert])
async def get_active_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get active high-risk conjunction alerts for the next 7 days."""
    from datetime import timedelta

    now = datetime.utcnow()
    base_query = (
        select(ConjunctionEvent, SpaceObject)
        .join(SpaceObject, ConjunctionEvent.primary_object_id == SpaceObject.object_id)
        .where(ConjunctionEvent.time_of_closest_approach > now)
        .where(ConjunctionEvent.time_of_closest_approach < now + timedelta(days=7))
        .where(ConjunctionEvent.risk_level.in_(["HIGH", "CRITICAL", "RED"]))
        .order_by(ConjunctionEvent.collision_probability.desc())
    )
    query = enforce_org_scope(base_query, ConjunctionEvent, current_user)
    result = await db.execute(query)
    rows = result.all()

    alerts = []
    for event, primary_obj in rows:
        # Fetch secondary object name
        sec_result = await db.execute(
            select(SpaceObject.name).where(SpaceObject.object_id == event.secondary_object_id)
        )
        sec_name = sec_result.scalar_one_or_none() or "UNKNOWN"

        alerts.append(ConjunctionAlert(
            conjunction_id=event.conjunction_id,
            primary_name=primary_obj.name,
            secondary_name=sec_name,
            time_of_closest_approach=event.time_of_closest_approach,
            miss_distance_km=event.miss_distance_km,
            collision_probability=event.collision_probability,
            risk_level=event.risk_level,
            status=event.status,
        ))

    return alerts


@router.get("/{conjunction_id}", response_model=ConjunctionRead)
async def get_conjunction(
    conjunction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single conjunction event by ID."""
    query = enforce_org_scope(select(ConjunctionEvent), ConjunctionEvent, current_user).where(
        ConjunctionEvent.conjunction_id == conjunction_id
    )
    result = await db.execute(query)
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Conjunction event not found")
    return ConjunctionRead.model_validate(event)


@router.post("/", response_model=ConjunctionRead, status_code=201)
async def create_conjunction(
    payload: ConjunctionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new conjunction event record."""
    event = ConjunctionEvent(
        **payload.model_dump(exclude_unset=True),
        org_id=current_user.get("org_id"),
        created_by=current_user.get("user_id"),
        updated_by=current_user.get("user_id"),
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return ConjunctionRead.model_validate(event)


@router.patch("/{conjunction_id}", response_model=ConjunctionRead)
async def update_conjunction(
    conjunction_id: int,
    payload: ConjunctionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a conjunction event (e.g., change status after analysis)."""
    query = enforce_org_scope(select(ConjunctionEvent), ConjunctionEvent, current_user).where(
        ConjunctionEvent.conjunction_id == conjunction_id
    )
    result = await db.execute(query)
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Conjunction event not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    event.updated_by = current_user.get("user_id")

    await db.flush()
    await db.refresh(event)
    return ConjunctionRead.model_validate(event)

"""CRUD endpoints for Maneuver Logs."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.maneuver import ManeuverLog
from app.schemas.maneuver import ManeuverCreate, ManeuverRead, ManeuverUpdate, ManeuverList

router = APIRouter(prefix="/maneuvers", tags=["Maneuvers"])


@router.get("/", response_model=ManeuverList)
async def list_maneuvers(
    object_id: int | None = Query(None),
    status: str | None = Query(None, description="PLANNED, EXECUTED, CANCELLED"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List maneuver logs with optional filters."""
    query = select(ManeuverLog)
    count_query = select(func.count()).select_from(ManeuverLog)

    if object_id:
        query = query.where(ManeuverLog.object_id == object_id)
        count_query = count_query.where(ManeuverLog.object_id == object_id)
    if status:
        query = query.where(ManeuverLog.status == status.upper())
        count_query = count_query.where(ManeuverLog.status == status.upper())

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(ManeuverLog.planned_time.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return ManeuverList(total=total, items=[ManeuverRead.model_validate(m) for m in items])


@router.get("/{maneuver_id}", response_model=ManeuverRead)
async def get_maneuver(maneuver_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single maneuver log entry."""
    result = await db.execute(
        select(ManeuverLog).where(ManeuverLog.maneuver_id == maneuver_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Maneuver not found")
    return ManeuverRead.model_validate(obj)


@router.post("/", response_model=ManeuverRead, status_code=201)
async def create_maneuver(payload: ManeuverCreate, db: AsyncSession = Depends(get_db)):
    """Record a new maneuver plan."""
    obj = ManeuverLog(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return ManeuverRead.model_validate(obj)


@router.patch("/{maneuver_id}", response_model=ManeuverRead)
async def update_maneuver(
    maneuver_id: int,
    payload: ManeuverUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a maneuver (e.g., mark as executed)."""
    result = await db.execute(
        select(ManeuverLog).where(ManeuverLog.maneuver_id == maneuver_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Maneuver not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return ManeuverRead.model_validate(obj)

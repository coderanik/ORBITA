"""CRUD endpoints for Missions."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.scoping import enforce_org_scope
from app.models.mission import Mission
from app.schemas.mission import MissionCreate, MissionRead, MissionUpdate, MissionList

router = APIRouter(prefix="/missions", tags=["Missions"])


@router.get("/", response_model=MissionList)
async def list_missions(
    status: str | None = Query(None, description="PLANNED, ACTIVE, COMPLETED, DECOMMISSIONED"),
    search: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List missions with optional filters."""
    query = enforce_org_scope(select(Mission), Mission, current_user)
    count_query = enforce_org_scope(select(func.count()).select_from(Mission), Mission, current_user)

    if status:
        query = query.where(Mission.status == status.upper())
        count_query = count_query.where(Mission.status == status.upper())
    if search:
        query = query.where(Mission.name.ilike(f"%{search}%"))
        count_query = count_query.where(Mission.name.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(Mission.mission_id.desc()).offset(offset).limit(limit))
    items = result.scalars().all()

    return MissionList(total=total, items=[MissionRead.model_validate(m) for m in items])


@router.get("/{mission_id}", response_model=MissionRead)
async def get_mission(
    mission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single mission by ID."""
    query = enforce_org_scope(select(Mission), Mission, current_user).where(Mission.mission_id == mission_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mission not found")
    return MissionRead.model_validate(obj)


@router.post("/", response_model=MissionRead, status_code=201)
async def create_mission(
    payload: MissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new mission."""
    obj = Mission(
        **payload.model_dump(exclude_unset=True),
        org_id=current_user.get("org_id"),
        created_by=current_user.get("user_id"),
        updated_by=current_user.get("user_id"),
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return MissionRead.model_validate(obj)


@router.patch("/{mission_id}", response_model=MissionRead)
async def update_mission(
    mission_id: int,
    payload: MissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a mission."""
    query = enforce_org_scope(select(Mission), Mission, current_user).where(Mission.mission_id == mission_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mission not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_by = current_user.get("user_id")

    await db.flush()
    await db.refresh(obj)
    return MissionRead.model_validate(obj)


@router.delete("/{mission_id}", status_code=204)
async def delete_mission(
    mission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a mission."""
    query = enforce_org_scope(select(Mission), Mission, current_user).where(Mission.mission_id == mission_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Mission not found")
    obj.is_deleted = True
    obj.deleted_at = func.now()
    obj.updated_by = current_user.get("user_id")

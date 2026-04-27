"""CRUD endpoints for Space Objects (satellites, debris, rocket bodies)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.scoping import enforce_org_scope
from app.models.space_object import SpaceObject
from app.schemas.space_object import (
    SpaceObjectCreate,
    SpaceObjectRead,
    SpaceObjectUpdate,
    SpaceObjectList,
)

router = APIRouter(prefix="/space-objects", tags=["Space Objects"])


@router.get("/", response_model=SpaceObjectList)
async def list_space_objects(
    object_type: str | None = Query(None, description="Filter by SATELLITE, DEBRIS, ROCKET_BODY, UNKNOWN"),
    orbit_class: str | None = Query(None, description="Filter by LEO, MEO, GEO, HEO, SSO"),
    status: str | None = Query(None, description="Filter by ACTIVE, INACTIVE, DECAYED"),
    country_code: str | None = Query(None, description="Filter by 3-letter country code"),
    search: str | None = Query(None, description="Fuzzy search by name"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List and filter space objects in the catalog."""
    query = enforce_org_scope(select(SpaceObject), SpaceObject, current_user)
    count_query = enforce_org_scope(select(func.count()).select_from(SpaceObject), SpaceObject, current_user)

    if object_type:
        query = query.where(SpaceObject.object_type == object_type.upper())
        count_query = count_query.where(SpaceObject.object_type == object_type.upper())
    if orbit_class:
        query = query.where(SpaceObject.orbit_class == orbit_class.upper())
        count_query = count_query.where(SpaceObject.orbit_class == orbit_class.upper())
    if status:
        query = query.where(SpaceObject.status == status.upper())
        count_query = count_query.where(SpaceObject.status == status.upper())
    if country_code:
        query = query.where(SpaceObject.country_code == country_code.upper())
        count_query = count_query.where(SpaceObject.country_code == country_code.upper())
    if search:
        query = query.where(SpaceObject.name.ilike(f"%{search}%"))
        count_query = count_query.where(SpaceObject.name.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(SpaceObject.object_id).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return SpaceObjectList(total=total, items=[SpaceObjectRead.model_validate(i) for i in items])


@router.get("/{object_id}", response_model=SpaceObjectRead)
async def get_space_object(
    object_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single space object by ID."""
    query = enforce_org_scope(select(SpaceObject), SpaceObject, current_user).where(SpaceObject.object_id == object_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Space object not found")
    return SpaceObjectRead.model_validate(obj)


@router.get("/norad/{norad_id}", response_model=SpaceObjectRead)
async def get_by_norad(
    norad_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a space object by its NORAD catalog ID."""
    query = enforce_org_scope(select(SpaceObject), SpaceObject, current_user).where(SpaceObject.norad_id == norad_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail=f"No object with NORAD ID {norad_id}")
    return SpaceObjectRead.model_validate(obj)


@router.post("/", response_model=SpaceObjectRead, status_code=201)
async def create_space_object(
    payload: SpaceObjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Register a new space object in the catalog."""
    obj = SpaceObject(
        **payload.model_dump(exclude_unset=True),
        org_id=current_user.get("org_id"),
        created_by=current_user.get("user_id"),
        updated_by=current_user.get("user_id"),
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return SpaceObjectRead.model_validate(obj)


@router.patch("/{object_id}", response_model=SpaceObjectRead)
async def update_space_object(
    object_id: int,
    payload: SpaceObjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update fields on an existing space object."""
    query = enforce_org_scope(select(SpaceObject), SpaceObject, current_user).where(SpaceObject.object_id == object_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Space object not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(obj, field, value)
    obj.updated_by = current_user.get("user_id")

    await db.flush()
    await db.refresh(obj)
    return SpaceObjectRead.model_validate(obj)


@router.delete("/{object_id}", status_code=204)
async def delete_space_object(
    object_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove a space object and all related data (cascade)."""
    query = enforce_org_scope(select(SpaceObject), SpaceObject, current_user).where(SpaceObject.object_id == object_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Space object not found")
    obj.is_deleted = True
    obj.deleted_at = func.now()
    obj.updated_by = current_user.get("user_id")

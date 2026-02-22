"""CRUD endpoints for Launch Vehicles."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.launch_vehicle import LaunchVehicle
from app.schemas.launch_vehicle import LaunchVehicleCreate, LaunchVehicleRead, LaunchVehicleList

router = APIRouter(prefix="/launch-vehicles", tags=["Launch Vehicles"])


@router.get("/", response_model=LaunchVehicleList)
async def list_launch_vehicles(
    country_code: str | None = Query(None),
    status: str | None = Query(None),
    family: str | None = Query(None),
    search: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List launch vehicles with optional filters."""
    query = select(LaunchVehicle)
    count_query = select(func.count()).select_from(LaunchVehicle)

    if country_code:
        query = query.where(LaunchVehicle.country_code == country_code.upper())
        count_query = count_query.where(LaunchVehicle.country_code == country_code.upper())
    if status:
        query = query.where(LaunchVehicle.status == status.upper())
        count_query = count_query.where(LaunchVehicle.status == status.upper())
    if family:
        query = query.where(LaunchVehicle.family.ilike(f"%{family}%"))
        count_query = count_query.where(LaunchVehicle.family.ilike(f"%{family}%"))
    if search:
        query = query.where(LaunchVehicle.name.ilike(f"%{search}%"))
        count_query = count_query.where(LaunchVehicle.name.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(LaunchVehicle.name).offset(offset).limit(limit))
    items = result.scalars().all()

    return LaunchVehicleList(total=total, items=[LaunchVehicleRead.model_validate(v) for v in items])


@router.get("/{vehicle_id}", response_model=LaunchVehicleRead)
async def get_launch_vehicle(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single launch vehicle by ID."""
    result = await db.execute(select(LaunchVehicle).where(LaunchVehicle.vehicle_id == vehicle_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Launch vehicle not found")
    return LaunchVehicleRead.model_validate(obj)


@router.post("/", response_model=LaunchVehicleRead, status_code=201)
async def create_launch_vehicle(payload: LaunchVehicleCreate, db: AsyncSession = Depends(get_db)):
    """Register a new launch vehicle."""
    obj = LaunchVehicle(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return LaunchVehicleRead.model_validate(obj)

"""Endpoints for ground stations."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.scoping import enforce_org_scope
from app.models.ground_station import GroundStation
from app.schemas.ground_station import GroundStationCreate, GroundStationRead, GroundStationUpdate

router = APIRouter(prefix="/ground-stations", tags=["Ground Stations"])


@router.get("/", response_model=list[GroundStationRead])
async def list_ground_stations(
    active_only: bool = Query(True),
    station_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all ground stations."""
    query = enforce_org_scope(select(GroundStation), GroundStation, current_user)
    if active_only:
        query = query.where(GroundStation.is_active.is_(True))
    if station_type:
        query = query.where(GroundStation.station_type == station_type.upper())

    result = await db.execute(query.order_by(GroundStation.name))
    stations = result.scalars().all()
    return [GroundStationRead.model_validate(s) for s in stations]


@router.get("/{station_id}", response_model=GroundStationRead)
async def get_ground_station(
    station_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single ground station."""
    query = enforce_org_scope(select(GroundStation), GroundStation, current_user).where(
        GroundStation.station_id == station_id
    )
    result = await db.execute(query)
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Ground station not found")
    return GroundStationRead.model_validate(station)


@router.post("/", response_model=GroundStationRead, status_code=201)
async def create_ground_station(
    payload: GroundStationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Register a new ground station (location via lat/lon/alt)."""
    # Build the station, inserting location via raw PostGIS function
    station = GroundStation(
        name=payload.name,
        country_code=payload.country_code,
        operator=payload.operator,
        station_type=payload.station_type,
        frequency_bands=payload.frequency_bands,
        antenna_diameter_m=payload.antenna_diameter_m,
        min_elevation_deg=payload.min_elevation_deg,
        capabilities=payload.capabilities,
        is_active=payload.is_active,
    )
    db.add(station)
    await db.flush()

    # Set PostGIS location separately
    await db.execute(
        text(
            "UPDATE tracking.ground_station "
            "SET location = ST_SetSRID(ST_MakePoint(:lon, :lat, :alt), 4326) "
            "WHERE station_id = :sid"
        ),
        {"lon": payload.longitude, "lat": payload.latitude, "alt": payload.altitude_m, "sid": station.station_id},
    )
    await db.refresh(station)
    return GroundStationRead.model_validate(station)


@router.patch("/{station_id}", response_model=GroundStationRead)
async def update_ground_station(
    station_id: int,
    payload: GroundStationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a ground station, including optional geospatial position."""
    query = enforce_org_scope(select(GroundStation), GroundStation, current_user).where(
        GroundStation.station_id == station_id
    )
    result = await db.execute(query)
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Ground station not found")

    update_data = payload.model_dump(exclude_unset=True)
    location_fields = ("longitude", "latitude", "altitude_m")
    has_location_update = any(field in update_data for field in location_fields)

    for field in ("name", "country_code", "operator", "station_type", "frequency_bands", "antenna_diameter_m", "min_elevation_deg", "capabilities", "is_active"):
        if field in update_data:
            setattr(station, field, update_data[field])

    if has_location_update:
        lon = update_data.get("longitude")
        lat = update_data.get("latitude")
        alt = update_data.get("altitude_m", 0.0)
        if lon is None or lat is None:
            raise HTTPException(status_code=400, detail="Both latitude and longitude are required for location updates")
        await db.execute(
            text(
                "UPDATE tracking.ground_station "
                "SET location = ST_SetSRID(ST_MakePoint(:lon, :lat, :alt), 4326) "
                "WHERE station_id = :sid"
            ),
            {"lon": lon, "lat": lat, "alt": alt, "sid": station_id},
        )

    await db.flush()
    await db.refresh(station)
    return GroundStationRead.model_validate(station)


@router.delete("/{station_id}", status_code=204)
async def delete_ground_station(
    station_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a ground station record."""
    query = enforce_org_scope(select(GroundStation), GroundStation, current_user).where(
        GroundStation.station_id == station_id
    )
    result = await db.execute(query)
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Ground station not found")
    await db.delete(station)

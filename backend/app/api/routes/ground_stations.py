"""Endpoints for ground stations."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.ground_station import GroundStation
from app.schemas.ground_station import GroundStationCreate, GroundStationRead

router = APIRouter(prefix="/ground-stations", tags=["Ground Stations"])


@router.get("/", response_model=list[GroundStationRead])
async def list_ground_stations(
    active_only: bool = Query(True),
    station_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all ground stations."""
    query = select(GroundStation)
    if active_only:
        query = query.where(GroundStation.is_active.is_(True))
    if station_type:
        query = query.where(GroundStation.station_type == station_type.upper())

    result = await db.execute(query.order_by(GroundStation.name))
    stations = result.scalars().all()
    return [GroundStationRead.model_validate(s) for s in stations]


@router.get("/{station_id}", response_model=GroundStationRead)
async def get_ground_station(station_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single ground station."""
    result = await db.execute(
        select(GroundStation).where(GroundStation.station_id == station_id)
    )
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Ground station not found")
    return GroundStationRead.model_validate(station)


@router.post("/", response_model=GroundStationRead, status_code=201)
async def create_ground_station(
    payload: GroundStationCreate,
    db: AsyncSession = Depends(get_db),
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

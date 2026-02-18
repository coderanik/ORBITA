"""Endpoints for space weather data."""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.space_weather import SpaceWeather
from app.schemas.space_weather import SpaceWeatherCreate, SpaceWeatherRead

router = APIRouter(prefix="/space-weather", tags=["Space Weather"])


@router.get("/", response_model=list[SpaceWeatherRead])
async def list_space_weather(
    from_ts: datetime | None = Query(None),
    to_ts: datetime | None = Query(None),
    forecast_only: bool = Query(False),
    limit: int = Query(100, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """Query space weather observations and forecasts."""
    query = select(SpaceWeather)

    if from_ts:
        query = query.where(SpaceWeather.ts >= from_ts)
    if to_ts:
        query = query.where(SpaceWeather.ts <= to_ts)
    if forecast_only:
        query = query.where(SpaceWeather.is_forecast.is_(True))

    query = query.order_by(SpaceWeather.ts.desc()).limit(limit)
    result = await db.execute(query)
    rows = result.scalars().all()
    return [SpaceWeatherRead.model_validate(r) for r in rows]


@router.get("/latest", response_model=SpaceWeatherRead)
async def get_latest_weather(db: AsyncSession = Depends(get_db)):
    """Get the most recent space weather observation."""
    result = await db.execute(
        select(SpaceWeather)
        .where(SpaceWeather.is_forecast.is_(False))
        .order_by(SpaceWeather.ts.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No space weather data available")
    return SpaceWeatherRead.model_validate(row)


@router.post("/", response_model=SpaceWeatherRead, status_code=201)
async def create_space_weather(
    payload: SpaceWeatherCreate,
    db: AsyncSession = Depends(get_db),
):
    """Insert a space weather data point."""
    sw = SpaceWeather(**payload.model_dump(exclude_unset=True))
    db.add(sw)
    await db.flush()
    await db.refresh(sw)
    return SpaceWeatherRead.model_validate(sw)

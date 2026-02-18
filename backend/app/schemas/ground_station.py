"""Pydantic schemas for GroundStation."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class GroundStationBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    altitude_m: float = 0.0
    country_code: str | None = None
    operator: str | None = None
    station_type: str | None = None
    frequency_bands: list | None = None
    antenna_diameter_m: float | None = None
    min_elevation_deg: float = 5.0
    capabilities: dict | None = None
    is_active: bool = True


class GroundStationCreate(GroundStationBase):
    pass


class GroundStationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    station_id: int
    name: str
    country_code: str | None = None
    operator: str | None = None
    station_type: str | None = None
    frequency_bands: list | None = None
    antenna_diameter_m: float | None = None
    min_elevation_deg: float | None = None
    capabilities: dict | None = None
    is_active: bool
    created_at: datetime

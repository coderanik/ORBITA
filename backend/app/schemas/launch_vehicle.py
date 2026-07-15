"""Pydantic schemas for LaunchVehicle CRUD."""
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class LaunchVehicleBase(BaseModel):
    name: str
    family: str | None = None
    variant: str | None = None
    operator_id: int | None = None
    country_code: str | None = None
    num_stages: int | None = None
    payload_leo_kg: float | None = None
    payload_gto_kg: float | None = None
    height_m: float | None = None
    diameter_m: float | None = None
    liftoff_mass_kg: float | None = None
    status: str = "ACTIVE"
    maiden_flight: date | None = None

class LaunchVehicleCreate(LaunchVehicleBase):
    pass


class LaunchVehicleUpdate(BaseModel):
    name: str | None = None
    family: str | None = None
    variant: str | None = None
    operator_id: int | None = None
    country_code: str | None = None
    num_stages: int | None = None
    payload_leo_kg: float | None = None
    payload_gto_kg: float | None = None
    height_m: float | None = None
    diameter_m: float | None = None
    liftoff_mass_kg: float | None = None
    status: str | None = None
    maiden_flight: date | None = None

class LaunchVehicleRead(LaunchVehicleBase):
    model_config = ConfigDict(from_attributes=True)
    vehicle_id: int
    created_at: datetime

class LaunchVehicleList(BaseModel):
    total: int
    items: list[LaunchVehicleRead]

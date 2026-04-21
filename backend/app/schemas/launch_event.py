"""Pydantic schemas for LaunchEvent CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LaunchEventBase(BaseModel):
    launch_date: datetime
    vehicle_id: int | None = None
    operator_id: int | None = None
    launch_site: str | None = None
    outcome: str = "SUCCESS"
    orbit_target: str | None = None
    payload_count: int | None = None
    flight_number: str | None = None
    notes: str | None = None

class LaunchEventCreate(LaunchEventBase):
    pass

class LaunchEventRead(LaunchEventBase):
    model_config = ConfigDict(from_attributes=True)
    launch_id: int
    created_at: datetime

class LaunchEventList(BaseModel):
    total: int
    items: list[LaunchEventRead]

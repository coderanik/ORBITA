"""Pydantic schemas for ReentryEvent CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ReentryEventBase(BaseModel):
    object_id: int
    predicted_time: datetime | None = None
    actual_time: datetime | None = None
    predicted_lat: float | None = None
    predicted_lon: float | None = None
    actual_lat: float | None = None
    actual_lon: float | None = None
    is_controlled: bool = False
    risk_level: str = "LOW"
    surviving_mass_kg: float | None = None
    casualty_area_m2: float | None = None
    status: str = "PREDICTED"
    source: str | None = None
    notes: str | None = None

class ReentryEventCreate(ReentryEventBase):
    pass

class ReentryEventUpdate(BaseModel):
    actual_time: datetime | None = None
    actual_lat: float | None = None
    actual_lon: float | None = None
    status: str | None = None
    risk_level: str | None = None
    notes: str | None = None

class ReentryEventRead(ReentryEventBase):
    model_config = ConfigDict(from_attributes=True)
    reentry_id: int
    created_at: datetime
    updated_at: datetime

class ReentryEventList(BaseModel):
    total: int
    items: list[ReentryEventRead]

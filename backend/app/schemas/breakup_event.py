"""Pydantic schemas for BreakupEvent CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class BreakupEventBase(BaseModel):
    parent_object_id: int
    event_time: datetime
    event_type: str
    altitude_km: float | None = None
    fragment_count: int | None = None
    debris_cloud_desc: str | None = None
    is_confirmed: bool = False
    source: str | None = None
    notes: str | None = None

class BreakupEventCreate(BreakupEventBase):
    pass

class BreakupEventUpdate(BaseModel):
    fragment_count: int | None = None
    is_confirmed: bool | None = None
    notes: str | None = None

class BreakupEventRead(BreakupEventBase):
    model_config = ConfigDict(from_attributes=True)
    breakup_id: int
    created_at: datetime

class BreakupEventList(BaseModel):
    total: int
    items: list[BreakupEventRead]

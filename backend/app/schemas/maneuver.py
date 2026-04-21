"""Pydantic schemas for ManeuverLog CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ManeuverBase(BaseModel):
    object_id: int
    conjunction_id: int | None = None
    planned_time: datetime
    executed_time: datetime | None = None
    delta_v_m_s: float | None = None
    direction: dict | None = None
    status: str = "PLANNED"
    notes: str | None = None

class ManeuverCreate(ManeuverBase):
    pass

class ManeuverUpdate(BaseModel):
    executed_time: datetime | None = None
    delta_v_m_s: float | None = None
    status: str | None = None
    notes: str | None = None

class ManeuverRead(ManeuverBase):
    model_config = ConfigDict(from_attributes=True)
    maneuver_id: int
    created_at: datetime

class ManeuverList(BaseModel):
    total: int
    items: list[ManeuverRead]

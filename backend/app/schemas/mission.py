"""Pydantic schemas for Mission CRUD."""
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class MissionBase(BaseModel):
    name: str
    description: str | None = None
    operator_id: int | None = None
    operator: str | None = None
    launch_date: date | None = None
    end_date: date | None = None
    status: str = "PLANNED"

class MissionCreate(MissionBase):
    pass

class MissionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    end_date: date | None = None

class MissionRead(MissionBase):
    model_config = ConfigDict(from_attributes=True)
    mission_id: int
    created_at: datetime
    updated_at: datetime

class MissionList(BaseModel):
    total: int
    items: list[MissionRead]

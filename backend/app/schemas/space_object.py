"""Pydantic schemas for SpaceObject CRUD."""

from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class SpaceObjectBase(BaseModel):
    norad_id: int | None = None
    cospar_id: str | None = None
    name: str
    object_type: str
    launch_date: date | None = None
    decay_date: date | None = None
    launch_site: str | None = None
    country_code: str | None = None
    operator: str | None = None
    owner: str | None = None
    mass_kg: float | None = None
    cross_section_m2: float | None = None
    orbit_class: str | None = None
    status: str = "UNKNOWN"
    purpose: str | None = None
    metadata_: dict | None = None


class SpaceObjectCreate(SpaceObjectBase):
    pass


class SpaceObjectUpdate(BaseModel):
    norad_id: int | None = None
    cospar_id: str | None = None
    name: str | None = None
    object_type: str | None = None
    launch_date: date | None = None
    decay_date: date | None = None
    launch_site: str | None = None
    country_code: str | None = None
    operator: str | None = None
    owner: str | None = None
    mass_kg: float | None = None
    cross_section_m2: float | None = None
    orbit_class: str | None = None
    status: str | None = None
    purpose: str | None = None
    metadata_: dict | None = None


class SpaceObjectRead(SpaceObjectBase):
    model_config = ConfigDict(from_attributes=True)

    object_id: int
    created_at: datetime
    updated_at: datetime


class SpaceObjectList(BaseModel):
    total: int
    items: list[SpaceObjectRead]

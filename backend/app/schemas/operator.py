"""Pydantic schemas for Operator CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OperatorBase(BaseModel):
    name: str
    short_name: str | None = None
    country_code: str | None = None
    operator_type: str | None = None
    website: str | None = None
    founded_year: int | None = None
    headquarters: str | None = None

class OperatorCreate(OperatorBase):
    pass


class OperatorUpdate(BaseModel):
    name: str | None = None
    short_name: str | None = None
    country_code: str | None = None
    operator_type: str | None = None
    website: str | None = None
    founded_year: int | None = None
    headquarters: str | None = None


class OperatorRead(OperatorBase):
    model_config = ConfigDict(from_attributes=True)
    operator_id: int
    created_at: datetime
    updated_at: datetime

class OperatorList(BaseModel):
    total: int
    items: list[OperatorRead]

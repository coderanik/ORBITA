"""Pydantic schemas for DebrisClassification CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DebrisClassificationBase(BaseModel):
    object_id: int
    predicted_type: str
    confidence: float | None = None
    model_version: str | None = None
    features_used: dict | None = None

class DebrisClassificationCreate(DebrisClassificationBase):
    pass

class DebrisClassificationUpdate(BaseModel):
    true_label: str | None = None
    is_verified: bool | None = None

class DebrisClassificationRead(DebrisClassificationBase):
    model_config = ConfigDict(from_attributes=True)
    classification_id: int
    classified_at: datetime
    true_label: str | None = None
    is_verified: bool
    created_at: datetime

class DebrisClassificationList(BaseModel):
    total: int
    items: list[DebrisClassificationRead]

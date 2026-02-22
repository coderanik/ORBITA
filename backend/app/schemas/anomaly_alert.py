"""Pydantic schemas for AnomalyAlert CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AnomalyAlertBase(BaseModel):
    object_id: int
    subsystem: str
    anomaly_type: str
    severity: str = "WARNING"
    anomaly_score: float | None = None
    threshold_used: float | None = None
    model_version: str | None = None
    description: str | None = None
    window_start: datetime | None = None
    window_end: datetime | None = None

class AnomalyAlertCreate(AnomalyAlertBase): pass

class AnomalyAlertUpdate(BaseModel):
    severity: str | None = None
    is_acknowledged: bool | None = None
    acknowledged_by: str | None = None
    resolution_notes: str | None = None

class AnomalyAlertRead(AnomalyAlertBase):
    model_config = ConfigDict(from_attributes=True)
    alert_id: int
    is_acknowledged: bool
    acknowledged_by: str | None = None
    resolution_notes: str | None = None
    detected_at: datetime
    created_at: datetime

class AnomalyAlertList(BaseModel):
    total: int
    items: list[AnomalyAlertRead]

"""Pydantic schemas for CongestionReport CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CongestionReportBase(BaseModel):
    altitude_min_km: float
    altitude_max_km: float
    inclination_min_deg: float | None = None
    inclination_max_deg: float | None = None
    object_count: int
    density_objects_per_km3: float | None = None
    risk_score: float | None = None
    trend: str = "STABLE"
    cluster_count: int | None = None
    model_version: str | None = None

class CongestionReportCreate(CongestionReportBase): pass

class CongestionReportRead(CongestionReportBase):
    model_config = ConfigDict(from_attributes=True)
    report_id: int
    analysis_time: datetime
    created_at: datetime

class CongestionReportList(BaseModel):
    total: int
    items: list[CongestionReportRead]

"""Pydantic schemas for SatelliteTelemetry."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TelemetryBase(BaseModel):
    object_id: int
    ts: datetime
    subsystem: str
    parameter_name: str
    value: float | None = None
    unit: str | None = None
    quality: str = "NOMINAL"
    raw_data: dict | None = None


class TelemetryCreate(TelemetryBase):
    pass


class TelemetryBatchCreate(BaseModel):
    """Ingest multiple telemetry points at once."""
    items: list[TelemetryCreate]


class TelemetryRead(TelemetryBase):
    model_config = ConfigDict(from_attributes=True)

    telemetry_id: int

"""Pydantic schemas for TrackingObservation CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TrackingObservationBase(BaseModel):
    object_id: int
    station_id: int
    observation_time: datetime
    observation_type: str | None = None
    azimuth_deg: float | None = None
    elevation_deg: float | None = None
    range_km: float | None = None
    range_rate_km_s: float | None = None
    signal_to_noise: float | None = None
    right_ascension_deg: float | None = None
    declination_deg: float | None = None
    visual_magnitude: float | None = None
    quality_flag: str = "GOOD"

class TrackingObservationCreate(TrackingObservationBase): pass

class TrackingObservationRead(TrackingObservationBase):
    model_config = ConfigDict(from_attributes=True)
    observation_id: int
    created_at: datetime

class TrackingObservationList(BaseModel):
    total: int
    items: list[TrackingObservationRead]

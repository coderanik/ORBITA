"""Pydantic schemas for ConjunctionEvent."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ConjunctionBase(BaseModel):
    primary_object_id: int
    secondary_object_id: int
    time_of_closest_approach: datetime
    miss_distance_km: float | None = None
    miss_distance_radial_km: float | None = None
    miss_distance_in_track_km: float | None = None
    miss_distance_cross_track_km: float | None = None
    collision_probability: float | None = None
    relative_velocity_km_s: float | None = None
    combined_hard_body_radius_m: float | None = None
    risk_level: str = "LOW"
    status: str = "PENDING"
    recommended_action: str | None = None


class ConjunctionCreate(ConjunctionBase):
    pass


class ConjunctionUpdate(BaseModel):
    miss_distance_km: float | None = None
    collision_probability: float | None = None
    risk_level: str | None = None
    status: str | None = None
    recommended_action: str | None = None


class ConjunctionRead(ConjunctionBase):
    model_config = ConfigDict(from_attributes=True)

    conjunction_id: int
    created_at: datetime
    updated_at: datetime


class ConjunctionAlert(BaseModel):
    """Lightweight alert representation for dashboards."""
    conjunction_id: int
    primary_name: str
    secondary_name: str
    time_of_closest_approach: datetime
    miss_distance_km: float | None
    collision_probability: float | None
    risk_level: str
    status: str

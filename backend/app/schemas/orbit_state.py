"""Pydantic schemas for OrbitState."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OrbitStateBase(BaseModel):
    object_id: int
    epoch: datetime
    position_x_km: float | None = None
    position_y_km: float | None = None
    position_z_km: float | None = None
    velocity_x_km_s: float | None = None
    velocity_y_km_s: float | None = None
    velocity_z_km_s: float | None = None
    reference_frame: str = "TEME"
    semimajor_axis_km: float | None = None
    eccentricity: float | None = None
    inclination_deg: float | None = None
    raan_deg: float | None = None
    arg_perigee_deg: float | None = None
    true_anomaly_deg: float | None = None
    mean_anomaly_deg: float | None = None
    mean_motion_rev_day: float | None = None
    period_minutes: float | None = None
    tle_line1: str | None = None
    tle_line2: str | None = None
    covariance_matrix: dict | None = None
    source: str = "TLE"


class OrbitStateCreate(OrbitStateBase):
    pass


class OrbitStateRead(OrbitStateBase):
    model_config = ConfigDict(from_attributes=True)

    state_id: int
    apoapsis_km: float | None = None
    periapsis_km: float | None = None
    created_at: datetime

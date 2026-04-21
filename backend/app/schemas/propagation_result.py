"""Pydantic schemas for PropagationResult CRUD."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PropagationResultBase(BaseModel):
    object_id: int
    source_epoch: datetime
    target_epoch: datetime
    method: str = "SGP4"
    position_x_km: float | None = None
    position_y_km: float | None = None
    position_z_km: float | None = None
    velocity_x_km_s: float | None = None
    velocity_y_km_s: float | None = None
    velocity_z_km_s: float | None = None
    covariance_matrix: dict | None = None
    drag_coefficient: float | None = None
    solar_radiation_pressure: float | None = None

class PropagationResultCreate(PropagationResultBase):
    pass

class PropagationResultRead(PropagationResultBase):
    model_config = ConfigDict(from_attributes=True)
    propagation_id: int
    created_at: datetime

class PropagationResultList(BaseModel):
    total: int
    items: list[PropagationResultRead]

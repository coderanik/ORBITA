from pydantic import BaseModel, Field
from datetime import datetime

class ForceModelConfig(BaseModel):
    j2: bool = True
    drag: bool = False
    mass_kg: float = 100.0
    area_m2: float = 1.0
    cd: float = 2.2

class HiFiPropagateRequest(BaseModel):
    r_km: list[float] = Field(..., min_length=3, max_length=3)
    v_km_s: list[float] = Field(..., min_length=3, max_length=3)
    t0: datetime
    t1: datetime
    force_model: ForceModelConfig = ForceModelConfig()
    method: str = "DOP853"
    max_step_s: float = 60.0

class HiFiPropagateResponse(BaseModel):
    r_km: list[float]
    v_km_s: list[float]
    epoch: datetime
    
class CollisionScreenRequest(BaseModel):
    threshold_km: float = 5.0

class ProbabilityRequest(BaseModel):
    target_r: list[float]
    target_v: list[float]
    target_cov: list[list[float]] # 6x6
    target_hbr: float
    chaser_r: list[float]
    chaser_v: list[float]
    chaser_cov: list[list[float]]
    chaser_hbr: float

class CAMRequest(BaseModel):
    target_state: list[float] # 6,
    chaser_state_tca: list[float] # 6,
    t0: datetime
    tca: datetime
    target_miss_km: float = 10.0
    force_model: ForceModelConfig = ForceModelConfig()

class ObservationItem(BaseModel):
    time: datetime
    range_km: float
    az_rad: float
    el_rad: float

class OrbitDeterminationRequest(BaseModel):
    observations: list[ObservationItem]
    station_pos_itrs: list[float]
    initial_guess_state: list[float] # 6,
    force_model: ForceModelConfig = ForceModelConfig()

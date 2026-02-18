"""Pydantic schemas for SpaceWeather."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SpaceWeatherBase(BaseModel):
    ts: datetime
    solar_flux_f10_7: float | None = None
    kp_index: float | None = None
    ap_index: int | None = None
    dst_index: int | None = None
    bz_gsm_nt: float | None = None
    proton_density_cm3: float | None = None
    solar_wind_speed_km_s: float | None = None
    proton_flux: float | None = None
    electron_flux: float | None = None
    geomagnetic_storm_level: str | None = None
    solar_flare_class: str | None = None
    data_source: str | None = None
    is_forecast: bool = False


class SpaceWeatherCreate(SpaceWeatherBase):
    pass


class SpaceWeatherRead(SpaceWeatherBase):
    model_config = ConfigDict(from_attributes=True)

    weather_id: int
    created_at: datetime

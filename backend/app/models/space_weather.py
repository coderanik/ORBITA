"""SQLAlchemy model for analytics.space_weather."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, Integer, Boolean
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class SpaceWeather(Base):
    __tablename__ = "space_weather"
    __table_args__ = {"schema": "analytics"}

    weather_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    solar_flux_f10_7: Mapped[float | None] = mapped_column(Float)
    kp_index: Mapped[float | None] = mapped_column(Float)
    ap_index: Mapped[int | None] = mapped_column(Integer)
    dst_index: Mapped[int | None] = mapped_column(Integer)
    bz_gsm_nt: Mapped[float | None] = mapped_column(Float)
    proton_density_cm3: Mapped[float | None] = mapped_column(Float)
    solar_wind_speed_km_s: Mapped[float | None] = mapped_column(Float)
    proton_flux: Mapped[float | None] = mapped_column(Float)
    electron_flux: Mapped[float | None] = mapped_column(Float)
    geomagnetic_storm_level: Mapped[str | None] = mapped_column(String(10))
    solar_flare_class: Mapped[str | None] = mapped_column(String(10))
    data_source: Mapped[str | None] = mapped_column(String(60))
    is_forecast: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

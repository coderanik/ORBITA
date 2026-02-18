"""SQLAlchemy model for tracking.ground_station."""

from datetime import datetime
from sqlalchemy import Integer, BigInteger, String, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class GroundStation(Base):
    __tablename__ = "ground_station"
    __table_args__ = {"schema": "tracking"}

    station_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # location stored as PostGIS geometry; we handle it via raw SQL / GeoAlchemy2
    country_code: Mapped[str | None] = mapped_column(String(3))
    operator_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("catalog.operator.operator_id"))
    operator: Mapped[str | None] = mapped_column(String(200))
    station_type: Mapped[str | None] = mapped_column(String(50))
    frequency_bands: Mapped[list | None] = mapped_column(JSONB, default=[])
    antenna_diameter_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    min_elevation_deg: Mapped[float | None] = mapped_column(Numeric(5, 2), default=5.0)
    capabilities: Mapped[dict | None] = mapped_column(JSONB, default={})
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    operator_ref = relationship("Operator", back_populates="ground_stations")
    observations = relationship("TrackingObservation", back_populates="ground_station", lazy="noload")

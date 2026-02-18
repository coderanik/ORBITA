"""SQLAlchemy model for tracking.tracking_observation."""

from datetime import datetime
from sqlalchemy import BigInteger, Integer, String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class TrackingObservation(Base):
    __tablename__ = "tracking_observation"
    __table_args__ = {"schema": "tracking"}

    observation_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id", ondelete="CASCADE"), nullable=False)
    station_id: Mapped[int] = mapped_column(Integer, ForeignKey("tracking.ground_station.station_id"), nullable=False)
    observation_time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    observation_type: Mapped[str | None] = mapped_column(String(30))
    azimuth_deg: Mapped[float | None] = mapped_column(Float)
    elevation_deg: Mapped[float | None] = mapped_column(Float)
    range_km: Mapped[float | None] = mapped_column(Float)
    range_rate_km_s: Mapped[float | None] = mapped_column(Float)
    signal_to_noise: Mapped[float | None] = mapped_column(Float)
    right_ascension_deg: Mapped[float | None] = mapped_column(Float)
    declination_deg: Mapped[float | None] = mapped_column(Float)
    visual_magnitude: Mapped[float | None] = mapped_column(Float)
    quality_flag: Mapped[str] = mapped_column(String(20), default="GOOD")
    raw_data: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    space_object = relationship("SpaceObject", back_populates="observations")
    ground_station = relationship("GroundStation", back_populates="observations")

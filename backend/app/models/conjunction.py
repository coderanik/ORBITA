"""SQLAlchemy model for analytics.conjunction_event."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ConjunctionEvent(Base):
    __tablename__ = "conjunction_event"
    __table_args__ = {"schema": "analytics"}

    conjunction_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    primary_object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False)
    secondary_object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False)
    time_of_closest_approach: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    miss_distance_km: Mapped[float | None] = mapped_column(Float)
    miss_distance_radial_km: Mapped[float | None] = mapped_column(Float)
    miss_distance_in_track_km: Mapped[float | None] = mapped_column(Float)
    miss_distance_cross_track_km: Mapped[float | None] = mapped_column(Float)
    collision_probability: Mapped[float | None] = mapped_column(Float)
    relative_velocity_km_s: Mapped[float | None] = mapped_column(Float)
    combined_hard_body_radius_m: Mapped[float | None] = mapped_column(Float)
    covariance_primary: Mapped[dict | None] = mapped_column(JSONB)
    covariance_secondary: Mapped[dict | None] = mapped_column(JSONB)
    cdm_id: Mapped[str | None] = mapped_column(String(100))
    cdm_data: Mapped[dict | None] = mapped_column(JSONB)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW")
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    recommended_action: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    # Relationships
    primary_object = relationship("SpaceObject", foreign_keys=[primary_object_id])
    secondary_object = relationship("SpaceObject", foreign_keys=[secondary_object_id])

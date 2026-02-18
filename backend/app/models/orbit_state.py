"""SQLAlchemy model for tracking.orbit_state."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class OrbitState(Base):
    __tablename__ = "orbit_state"
    __table_args__ = {"schema": "tracking"}

    state_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id", ondelete="CASCADE"), nullable=False)
    epoch: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)

    # Cartesian state
    position_x_km: Mapped[float | None] = mapped_column(Float)
    position_y_km: Mapped[float | None] = mapped_column(Float)
    position_z_km: Mapped[float | None] = mapped_column(Float)
    velocity_x_km_s: Mapped[float | None] = mapped_column(Float)
    velocity_y_km_s: Mapped[float | None] = mapped_column(Float)
    velocity_z_km_s: Mapped[float | None] = mapped_column(Float)
    reference_frame: Mapped[str] = mapped_column(String(10), default="TEME")

    # Keplerian elements
    semimajor_axis_km: Mapped[float | None] = mapped_column(Float)
    eccentricity: Mapped[float | None] = mapped_column(Float)
    inclination_deg: Mapped[float | None] = mapped_column(Float)
    raan_deg: Mapped[float | None] = mapped_column(Float)
    arg_perigee_deg: Mapped[float | None] = mapped_column(Float)
    true_anomaly_deg: Mapped[float | None] = mapped_column(Float)
    mean_anomaly_deg: Mapped[float | None] = mapped_column(Float)
    mean_motion_rev_day: Mapped[float | None] = mapped_column(Float)
    period_minutes: Mapped[float | None] = mapped_column(Float)

    # Altitude helpers
    apoapsis_km: Mapped[float | None] = mapped_column(Float)
    periapsis_km: Mapped[float | None] = mapped_column(Float)

    # TLE source
    tle_line1: Mapped[str | None] = mapped_column(Text)
    tle_line2: Mapped[str | None] = mapped_column(Text)

    # Uncertainty
    covariance_matrix: Mapped[dict | None] = mapped_column(JSONB)

    source: Mapped[str] = mapped_column(String(30), default="TLE")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    # Relationships
    space_object = relationship("SpaceObject", back_populates="orbit_states")

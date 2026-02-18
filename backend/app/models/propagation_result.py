"""SQLAlchemy model for tracking.propagation_result."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class PropagationResult(Base):
    __tablename__ = "propagation_result"
    __table_args__ = {"schema": "tracking"}

    propagation_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id", ondelete="CASCADE"), nullable=False)
    source_epoch: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    target_epoch: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    method: Mapped[str] = mapped_column(String(30), default="SGP4")
    position_x_km: Mapped[float | None] = mapped_column(Float)
    position_y_km: Mapped[float | None] = mapped_column(Float)
    position_z_km: Mapped[float | None] = mapped_column(Float)
    velocity_x_km_s: Mapped[float | None] = mapped_column(Float)
    velocity_y_km_s: Mapped[float | None] = mapped_column(Float)
    velocity_z_km_s: Mapped[float | None] = mapped_column(Float)
    # position_geom handled by trigger
    covariance_matrix: Mapped[dict | None] = mapped_column(JSONB)
    drag_coefficient: Mapped[float | None] = mapped_column(Float)
    solar_radiation_pressure: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    space_object = relationship("SpaceObject", back_populates="propagations")

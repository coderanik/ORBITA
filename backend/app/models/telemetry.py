"""SQLAlchemy model for telemetry.satellite_telemetry."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SatelliteTelemetry(Base):
    __tablename__ = "satellite_telemetry"
    __table_args__ = {"schema": "telemetry"}

    telemetry_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id", ondelete="CASCADE"), nullable=False)
    ts: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    subsystem: Mapped[str] = mapped_column(String(50), nullable=False)
    parameter_name: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(30))
    quality: Mapped[str] = mapped_column(String(20), default="NOMINAL")
    raw_data: Mapped[dict | None] = mapped_column(JSONB)

    # Relationships
    space_object = relationship("SpaceObject", back_populates="telemetry")

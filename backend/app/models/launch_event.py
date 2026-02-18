"""SQLAlchemy model for catalog.launch_event."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class LaunchEvent(Base):
    __tablename__ = "launch_event"
    __table_args__ = {"schema": "catalog"}

    launch_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    launch_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    vehicle_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("catalog.launch_vehicle.vehicle_id"))
    operator_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("catalog.operator.operator_id"))
    launch_site: Mapped[str | None] = mapped_column(String(200))
    outcome: Mapped[str] = mapped_column(String(30), default="SUCCESS")
    orbit_target: Mapped[str | None] = mapped_column(String(50))
    payload_count: Mapped[int | None] = mapped_column(Integer)
    flight_number: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    vehicle = relationship("LaunchVehicle", back_populates="launch_events")
    operator_ref = relationship("Operator", back_populates="launch_events")
    space_objects = relationship("SpaceObject", back_populates="launch_event", lazy="noload")

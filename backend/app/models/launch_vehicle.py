"""SQLAlchemy model for catalog.launch_vehicle."""

from datetime import date, datetime
from sqlalchemy import BigInteger, String, Integer, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class LaunchVehicle(Base):
    __tablename__ = "launch_vehicle"
    __table_args__ = {"schema": "catalog"}

    vehicle_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    family: Mapped[str | None] = mapped_column(String(100))
    variant: Mapped[str | None] = mapped_column(String(100))
    operator_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("catalog.operator.operator_id"))
    country_code: Mapped[str | None] = mapped_column(String(3))
    num_stages: Mapped[int | None] = mapped_column(Integer)
    payload_leo_kg: Mapped[float | None] = mapped_column(Numeric(10, 2))
    payload_gto_kg: Mapped[float | None] = mapped_column(Numeric(10, 2))
    height_m: Mapped[float | None] = mapped_column(Numeric(8, 2))
    diameter_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    liftoff_mass_kg: Mapped[float | None] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    maiden_flight: Mapped[date | None] = mapped_column(Date)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    operator_ref = relationship("Operator", back_populates="launch_vehicles")
    launch_events = relationship("LaunchEvent", back_populates="vehicle", lazy="noload")

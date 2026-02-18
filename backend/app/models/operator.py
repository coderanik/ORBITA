"""SQLAlchemy model for catalog.operator."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Integer
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Operator(Base):
    __tablename__ = "operator"
    __table_args__ = {"schema": "catalog"}

    operator_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50))
    country_code: Mapped[str | None] = mapped_column(String(3))
    operator_type: Mapped[str | None] = mapped_column(String(50))
    website: Mapped[str | None] = mapped_column(String(300))
    founded_year: Mapped[int | None] = mapped_column(Integer)
    headquarters: Mapped[str | None] = mapped_column(String(200))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    space_objects = relationship("SpaceObject", back_populates="operator_ref", lazy="noload")
    missions = relationship("Mission", back_populates="operator_ref", lazy="noload")
    launch_vehicles = relationship("LaunchVehicle", back_populates="operator_ref", lazy="noload")
    launch_events = relationship("LaunchEvent", back_populates="operator_ref", lazy="noload")
    ground_stations = relationship("GroundStation", back_populates="operator_ref", lazy="noload")

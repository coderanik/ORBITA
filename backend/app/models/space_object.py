"""SQLAlchemy model for catalog.space_object."""

from datetime import date, datetime
from sqlalchemy import (
    BigInteger, String, Date, Numeric, Text, CheckConstraint, Index, ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SpaceObject(Base):
    __tablename__ = "space_object"
    __table_args__ = (
        CheckConstraint(
            "object_type IN ('SATELLITE','DEBRIS','ROCKET_BODY','UNKNOWN')",
            name="ck_so_object_type",
        ),
        CheckConstraint(
            "status IN ('ACTIVE','INACTIVE','DECAYED','FUTURE','UNKNOWN')",
            name="ck_so_status",
        ),
        {"schema": "catalog"},
    )

    object_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    norad_id: Mapped[int | None] = mapped_column(unique=True)
    cospar_id: Mapped[str | None] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    object_type: Mapped[str] = mapped_column(String(50), nullable=False)
    operator_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("catalog.operator.operator_id"))
    launch_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("catalog.launch_event.launch_id"))
    launch_date: Mapped[date | None] = mapped_column(Date)
    decay_date: Mapped[date | None] = mapped_column(Date)
    launch_site: Mapped[str | None] = mapped_column(String(150))
    country_code: Mapped[str | None] = mapped_column(String(3))
    operator: Mapped[str | None] = mapped_column(String(200))
    owner: Mapped[str | None] = mapped_column(String(200))
    mass_kg: Mapped[float | None] = mapped_column(Numeric(12, 2))
    cross_section_m2: Mapped[float | None] = mapped_column(Numeric(10, 4))
    orbit_class: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(50), default="UNKNOWN")
    purpose: Mapped[str | None] = mapped_column(String(200))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    # Relationships
    operator_ref = relationship("Operator", back_populates="space_objects")
    launch_event = relationship("LaunchEvent", back_populates="space_objects")
    orbit_states = relationship("OrbitState", back_populates="space_object", lazy="noload")
    telemetry = relationship("SatelliteTelemetry", back_populates="space_object", lazy="noload")
    observations = relationship("TrackingObservation", back_populates="space_object", lazy="noload")
    propagations = relationship("PropagationResult", back_populates="space_object", lazy="noload")
    breakup_events = relationship("BreakupEvent", back_populates="parent_object", lazy="noload")
    reentry_events = relationship("ReentryEvent", back_populates="space_object", lazy="noload")
    anomaly_alerts = relationship("AnomalyAlert", back_populates="space_object", lazy="noload")
    classifications = relationship("DebrisClassification", back_populates="space_object", lazy="noload")

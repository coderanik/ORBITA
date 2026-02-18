"""SQLAlchemy model for analytics.reentry_event."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ReentryEvent(Base):
    __tablename__ = "reentry_event"
    __table_args__ = {"schema": "analytics"}

    reentry_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False)
    predicted_time: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    actual_time: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    predicted_lat: Mapped[float | None] = mapped_column(Float)
    predicted_lon: Mapped[float | None] = mapped_column(Float)
    actual_lat: Mapped[float | None] = mapped_column(Float)
    actual_lon: Mapped[float | None] = mapped_column(Float)
    is_controlled: Mapped[bool] = mapped_column(Boolean, default=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW")
    surviving_mass_kg: Mapped[float | None] = mapped_column(Float)
    casualty_area_m2: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="PREDICTED")
    source: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    space_object = relationship("SpaceObject", back_populates="reentry_events")

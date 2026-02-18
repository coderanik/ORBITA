"""SQLAlchemy model for analytics.breakup_event."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Integer, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class BreakupEvent(Base):
    __tablename__ = "breakup_event"
    __table_args__ = {"schema": "analytics"}

    breakup_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    parent_object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False)
    event_time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    altitude_km: Mapped[float | None] = mapped_column(Float)
    fragment_count: Mapped[int | None] = mapped_column(Integer)
    debris_cloud_desc: Mapped[str | None] = mapped_column(Text)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    parent_object = relationship("SpaceObject", back_populates="breakup_events")

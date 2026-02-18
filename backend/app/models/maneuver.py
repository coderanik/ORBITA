"""SQLAlchemy model for analytics.maneuver_log."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ManeuverLog(Base):
    __tablename__ = "maneuver_log"
    __table_args__ = {"schema": "analytics"}

    maneuver_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False)
    conjunction_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("analytics.conjunction_event.conjunction_id"))
    planned_time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    executed_time: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    delta_v_m_s: Mapped[float | None] = mapped_column(Float)
    direction: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(30), default="PLANNED")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    space_object = relationship("SpaceObject")
    conjunction = relationship("ConjunctionEvent")

"""SQLAlchemy model for ml.anomaly_alert."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AnomalyAlert(Base):
    __tablename__ = "anomaly_alert"
    __table_args__ = {"schema": "ml"}

    alert_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False)
    detected_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    subsystem: Mapped[str] = mapped_column(String(50), nullable=False)
    anomaly_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="WARNING")
    anomaly_score: Mapped[float | None] = mapped_column(Float)
    threshold_used: Mapped[float | None] = mapped_column(Float)
    model_version: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    window_start: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    window_end: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by: Mapped[str | None] = mapped_column(String(100))
    resolution_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    space_object = relationship("SpaceObject", back_populates="anomaly_alerts")

"""SQLAlchemy model for analytics.mission_report_log."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class MissionReportLog(Base):
    __tablename__ = "mission_report_log"
    __table_args__ = {"schema": "analytics"}

    report_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False, index=True)
    generated_by_user_id: Mapped[int | None] = mapped_column(BigInteger)
    report_type: Mapped[str] = mapped_column(String(30), default="MISSION_CDM")
    file_name: Mapped[str] = mapped_column(String(255))
    file_size_bytes: Mapped[int | None] = mapped_column(Integer)
    alert_count: Mapped[int] = mapped_column(Integer, default=0)
    conjunction_count: Mapped[int] = mapped_column(Integer, default=0)
    details: Mapped[dict | None] = mapped_column(JSONB)
    generated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

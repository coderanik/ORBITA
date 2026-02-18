"""SQLAlchemy model for ml.congestion_report."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Integer, Float
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class CongestionReport(Base):
    __tablename__ = "congestion_report"
    __table_args__ = {"schema": "ml"}

    report_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    analysis_time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    altitude_min_km: Mapped[float] = mapped_column(Float, nullable=False)
    altitude_max_km: Mapped[float] = mapped_column(Float, nullable=False)
    inclination_min_deg: Mapped[float | None] = mapped_column(Float)
    inclination_max_deg: Mapped[float | None] = mapped_column(Float)
    object_count: Mapped[int] = mapped_column(Integer, nullable=False)
    density_objects_per_km3: Mapped[float | None] = mapped_column(Float)
    risk_score: Mapped[float | None] = mapped_column(Float)
    trend: Mapped[str] = mapped_column(String(20), default="STABLE")
    cluster_count: Mapped[int | None] = mapped_column(Integer)
    model_version: Mapped[str | None] = mapped_column(String(50))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

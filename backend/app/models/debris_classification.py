"""SQLAlchemy model for ml.debris_classification."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DebrisClassification(Base):
    __tablename__ = "debris_classification"
    __table_args__ = {"schema": "ml"}

    classification_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id"), nullable=False)
    predicted_type: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    model_version: Mapped[str | None] = mapped_column(String(50))
    features_used: Mapped[dict | None] = mapped_column(JSONB)
    classified_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    true_label: Mapped[str | None] = mapped_column(String(50))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    space_object = relationship("SpaceObject", back_populates="classifications")

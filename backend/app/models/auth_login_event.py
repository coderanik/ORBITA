"""SQLAlchemy model for auth.login_events."""

from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuthLoginEvent(Base):
    __tablename__ = "login_events"
    __table_args__ = {"schema": "auth"}

    login_event_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("auth.users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    logged_in_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()", index=True)
    timezone_name: Mapped[str | None] = mapped_column(String(100))
    timezone_offset_minutes: Mapped[int | None] = mapped_column()
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    details: Mapped[dict | None] = mapped_column(JSONB)

    user = relationship("AuthUser", lazy="joined")

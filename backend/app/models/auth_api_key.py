"""SQLAlchemy model for auth.api_keys."""

from datetime import datetime
from sqlalchemy import BigInteger, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuthApiKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = {"schema": "auth"}

    api_key_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("auth.users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    key_name: Mapped[str] = mapped_column(String(120), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    scopes: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    last_used_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    user = relationship("AuthUser", back_populates="api_keys")

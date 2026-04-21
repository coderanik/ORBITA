"""SQLAlchemy models for catalog.mission and catalog.mission_object."""

from datetime import date, datetime
from sqlalchemy import BigInteger, String, Date, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Mission(Base):
    __tablename__ = "mission"
    __table_args__ = {"schema": "catalog"}

    mission_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    operator_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("catalog.operator.operator_id"))
    operator: Mapped[str | None] = mapped_column(String(200))
    launch_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="PLANNED")
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    operator_ref = relationship("Operator", back_populates="missions")
    objects = relationship("MissionObject", back_populates="mission", lazy="selectin")


class MissionObject(Base):
    __tablename__ = "mission_object"
    __table_args__ = {"schema": "catalog"}

    mission_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.mission.mission_id", ondelete="CASCADE"), primary_key=True)
    object_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("catalog.space_object.object_id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(50), default="PRIMARY")

    mission = relationship("Mission", back_populates="objects")
    space_object = relationship("SpaceObject")

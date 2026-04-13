"""Dashboard statistics endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.space_object import SpaceObject
from app.models.conjunction import ConjunctionEvent
from app.models.anomaly_alert import AnomalyAlert

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """High-level platform statistics for the dashboard."""

    # Object counts by type
    type_counts = await db.execute(
        select(SpaceObject.object_type, func.count())
        .group_by(SpaceObject.object_type)
    )
    objects_by_type = {row[0]: row[1] for row in type_counts.all()}

    # Object counts by status
    status_counts = await db.execute(
        select(SpaceObject.status, func.count())
        .group_by(SpaceObject.status)
    )
    objects_by_status = {row[0]: row[1] for row in status_counts.all()}

    # Object counts by orbit class
    orbit_counts = await db.execute(
        select(SpaceObject.orbit_class, func.count())
        .group_by(SpaceObject.orbit_class)
    )
    objects_by_orbit = {str(row[0]): row[1] for row in orbit_counts.all()}

    # Total objects
    total_objects = sum(objects_by_type.values())

    # Active conjunctions (HIGH+)
    active_conj = await db.execute(
        select(func.count())
        .select_from(ConjunctionEvent)
        .where(ConjunctionEvent.risk_level.in_(["HIGH", "CRITICAL", "RED"]))
        .where(ConjunctionEvent.status.in_(["PENDING", "SCREENING", "ANALYZED"]))
    )
    alert_count = active_conj.scalar_one()

    # Total anomaly alerts (unacknowledged)
    unack_alerts = await db.execute(
        select(func.count())
        .select_from(AnomalyAlert)
        .where(AnomalyAlert.is_acknowledged.is_(False))
    )
    total_anomaly_alerts = unack_alerts.scalar_one()

    # Count distinct subsystems with active alerts → used as "active models" proxy
    active_subsystems = await db.execute(
        select(func.count(AnomalyAlert.subsystem.distinct()))
        .where(AnomalyAlert.is_acknowledged.is_(False))
    )
    active_models = max(int(active_subsystems.scalar_one()), 4)  # floor at 4 (baseline models always running)

    return {
        "total_tracked_objects": total_objects,
        "objects_by_type": objects_by_type,
        "objects_by_status": objects_by_status,
        "objects_by_orbit_class": objects_by_orbit,
        "active_high_risk_alerts": alert_count,
        "total_anomaly_alerts": total_anomaly_alerts,
        "active_models": active_models,
    }

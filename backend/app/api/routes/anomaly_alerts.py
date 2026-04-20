"""CRUD endpoints for ML Anomaly Alerts."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.anomaly_alert import AnomalyAlert
from app.schemas.anomaly_alert import (
    AnomalyAlertCreate,
    AnomalyAlertRead,
    AnomalyAlertUpdate,
    AnomalyAlertList,
)
from app.services.anomaly_explainer import AnomalyExplainer
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/anomaly-alerts", tags=["Anomaly Detection"])


@router.get("/", response_model=AnomalyAlertList)
async def list_anomaly_alerts(
    object_id: int | None = Query(None),
    severity: str | None = Query(None, description="INFO, WARNING, CRITICAL"),
    subsystem: str | None = Query(None),
    is_acknowledged: bool | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List anomaly alerts with optional filters."""
    query = select(AnomalyAlert)
    count_query = select(func.count()).select_from(AnomalyAlert)

    if object_id:
        query = query.where(AnomalyAlert.object_id == object_id)
        count_query = count_query.where(AnomalyAlert.object_id == object_id)
    if severity:
        query = query.where(AnomalyAlert.severity == severity.upper())
        count_query = count_query.where(AnomalyAlert.severity == severity.upper())
    if subsystem:
        query = query.where(AnomalyAlert.subsystem == subsystem.upper())
        count_query = count_query.where(AnomalyAlert.subsystem == subsystem.upper())
    if is_acknowledged is not None:
        query = query.where(AnomalyAlert.is_acknowledged == is_acknowledged)
        count_query = count_query.where(AnomalyAlert.is_acknowledged == is_acknowledged)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(AnomalyAlert.detected_at.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return AnomalyAlertList(total=total, items=[AnomalyAlertRead.model_validate(a) for a in items])


@router.get("/unacknowledged", response_model=AnomalyAlertList)
async def get_unacknowledged_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get all unacknowledged anomaly alerts, sorted by severity."""
    query = (
        select(AnomalyAlert)
        .where(AnomalyAlert.is_acknowledged.is_(False))
        .order_by(AnomalyAlert.detected_at.desc())
        .limit(limit)
    )
    count_query = (
        select(func.count())
        .select_from(AnomalyAlert)
        .where(AnomalyAlert.is_acknowledged.is_(False))
    )
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query)
    items = result.scalars().all()

    return AnomalyAlertList(total=total, items=[AnomalyAlertRead.model_validate(a) for a in items])


@router.get("/{alert_id}", response_model=AnomalyAlertRead)
async def get_anomaly_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single anomaly alert."""
    result = await db.execute(select(AnomalyAlert).where(AnomalyAlert.alert_id == alert_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Anomaly alert not found")
    return AnomalyAlertRead.model_validate(obj)


@router.get("/{alert_id}/explain")
async def explain_anomaly(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Generate an AI-powered explanation for an anomaly."""
    explainer = AnomalyExplainer(db)
    explanation = await explainer.explain_anomaly(alert_id)
    return {"explanation": explanation}


@router.get("/reports/mission/{object_id}")
async def get_mission_report(object_id: int, db: AsyncSession = Depends(get_db)):
    """Generate and download a mission health report PDF."""
    generator = ReportGenerator(db)
    try:
        pdf_buffer = await generator.generate_mission_report(object_id)
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=mission_report_{object_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=AnomalyAlertRead, status_code=201)
async def create_anomaly_alert(payload: AnomalyAlertCreate, db: AsyncSession = Depends(get_db)):
    """Create a new anomaly alert (typically called by the ML pipeline)."""
    obj = AnomalyAlert(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return AnomalyAlertRead.model_validate(obj)


@router.patch("/{alert_id}", response_model=AnomalyAlertRead)
async def update_anomaly_alert(
    alert_id: int,
    payload: AnomalyAlertUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge or update an anomaly alert."""
    result = await db.execute(select(AnomalyAlert).where(AnomalyAlert.alert_id == alert_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Anomaly alert not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return AnomalyAlertRead.model_validate(obj)

"""CRUD endpoints for ML Congestion Reports."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.congestion_report import CongestionReport
from app.schemas.congestion_report import (
    CongestionReportCreate,
    CongestionReportRead,
    CongestionReportList,
)

router = APIRouter(prefix="/congestion-reports", tags=["Congestion Analysis"])


@router.get("/", response_model=CongestionReportList)
async def list_congestion_reports(
    trend: str | None = Query(None, description="STABLE, INCREASING, DECREASING"),
    min_risk_score: float | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List congestion reports with optional filters."""
    query = select(CongestionReport)
    count_query = select(func.count()).select_from(CongestionReport)

    if trend:
        query = query.where(CongestionReport.trend == trend.upper())
        count_query = count_query.where(CongestionReport.trend == trend.upper())
    if min_risk_score is not None:
        query = query.where(CongestionReport.risk_score >= min_risk_score)
        count_query = count_query.where(CongestionReport.risk_score >= min_risk_score)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(CongestionReport.analysis_time.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return CongestionReportList(
        total=total, items=[CongestionReportRead.model_validate(r) for r in items]
    )


@router.get("/{report_id}", response_model=CongestionReportRead)
async def get_congestion_report(report_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single congestion report."""
    result = await db.execute(
        select(CongestionReport).where(CongestionReport.report_id == report_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Congestion report not found")
    return CongestionReportRead.model_validate(obj)


@router.post("/", response_model=CongestionReportRead, status_code=201)
async def create_congestion_report(
    payload: CongestionReportCreate,
    db: AsyncSession = Depends(get_db),
):
    """Generate a new congestion report."""
    obj = CongestionReport(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return CongestionReportRead.model_validate(obj)

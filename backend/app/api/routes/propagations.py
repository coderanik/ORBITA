"""CRUD endpoints for Propagation Results."""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.propagation_result import PropagationResult
from app.schemas.propagation_result import PropagationResultCreate, PropagationResultRead

router = APIRouter(prefix="/propagations", tags=["Propagation Results"])


@router.get("/{object_id}", response_model=list[PropagationResultRead])
async def get_propagation_results(
    object_id: int,
    method: str | None = Query(None, description="SGP4, NUMERICAL, etc."),
    from_epoch: datetime | None = Query(None),
    to_epoch: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    """Get propagation results for a space object."""
    query = select(PropagationResult).where(PropagationResult.object_id == object_id)

    if method:
        query = query.where(PropagationResult.method == method.upper())
    if from_epoch:
        query = query.where(PropagationResult.target_epoch >= from_epoch)
    if to_epoch:
        query = query.where(PropagationResult.target_epoch <= to_epoch)

    query = query.order_by(PropagationResult.target_epoch.desc()).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    return [PropagationResultRead.model_validate(p) for p in items]


@router.post("/", response_model=PropagationResultRead, status_code=201)
async def create_propagation_result(
    payload: PropagationResultCreate,
    db: AsyncSession = Depends(get_db),
):
    """Store a propagation result."""
    obj = PropagationResult(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return PropagationResultRead.model_validate(obj)


@router.post("/batch", status_code=201)
async def create_propagation_batch(
    payloads: list[PropagationResultCreate],
    db: AsyncSession = Depends(get_db),
):
    """Batch-insert propagation results (e.g., from orbit prediction runs)."""
    records = [PropagationResult(**p.model_dump(exclude_unset=True)) for p in payloads]
    db.add_all(records)
    await db.flush()
    return {"ingested": len(records)}

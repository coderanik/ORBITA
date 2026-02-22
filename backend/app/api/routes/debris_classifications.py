"""CRUD endpoints for ML Debris Classifications."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.debris_classification import DebrisClassification
from app.schemas.debris_classification import (
    DebrisClassificationCreate,
    DebrisClassificationRead,
    DebrisClassificationUpdate,
    DebrisClassificationList,
)

router = APIRouter(prefix="/debris-classifications", tags=["Debris Classification"])


@router.get("/", response_model=DebrisClassificationList)
async def list_classifications(
    object_id: int | None = Query(None),
    predicted_type: str | None = Query(None),
    is_verified: bool | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List debris classifications with optional filters."""
    query = select(DebrisClassification)
    count_query = select(func.count()).select_from(DebrisClassification)

    if object_id:
        query = query.where(DebrisClassification.object_id == object_id)
        count_query = count_query.where(DebrisClassification.object_id == object_id)
    if predicted_type:
        query = query.where(DebrisClassification.predicted_type == predicted_type.upper())
        count_query = count_query.where(DebrisClassification.predicted_type == predicted_type.upper())
    if is_verified is not None:
        query = query.where(DebrisClassification.is_verified == is_verified)
        count_query = count_query.where(DebrisClassification.is_verified == is_verified)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(DebrisClassification.classified_at.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()

    return DebrisClassificationList(
        total=total, items=[DebrisClassificationRead.model_validate(c) for c in items]
    )


@router.get("/{classification_id}", response_model=DebrisClassificationRead)
async def get_classification(classification_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single debris classification."""
    result = await db.execute(
        select(DebrisClassification).where(
            DebrisClassification.classification_id == classification_id
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Classification not found")
    return DebrisClassificationRead.model_validate(obj)


@router.post("/", response_model=DebrisClassificationRead, status_code=201)
async def create_classification(
    payload: DebrisClassificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new debris classification (called by ML pipeline)."""
    obj = DebrisClassification(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return DebrisClassificationRead.model_validate(obj)


@router.patch("/{classification_id}", response_model=DebrisClassificationRead)
async def update_classification(
    classification_id: int,
    payload: DebrisClassificationUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Verify or correct a debris classification."""
    result = await db.execute(
        select(DebrisClassification).where(
            DebrisClassification.classification_id == classification_id
        )
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Classification not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return DebrisClassificationRead.model_validate(obj)

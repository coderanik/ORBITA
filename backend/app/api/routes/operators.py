"""CRUD endpoints for Operators (space agencies, companies)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.operator import Operator
from app.schemas.operator import OperatorCreate, OperatorRead, OperatorList, OperatorUpdate

router = APIRouter(prefix="/operators", tags=["Operators"])


@router.get("/", response_model=OperatorList)
async def list_operators(
    country_code: str | None = Query(None),
    operator_type: str | None = Query(None),
    search: str | None = Query(None, description="Search by name"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List operators with optional filters."""
    query = select(Operator)
    count_query = select(func.count()).select_from(Operator)

    if country_code:
        query = query.where(Operator.country_code == country_code.upper())
        count_query = count_query.where(Operator.country_code == country_code.upper())
    if operator_type:
        query = query.where(Operator.operator_type == operator_type.upper())
        count_query = count_query.where(Operator.operator_type == operator_type.upper())
    if search:
        query = query.where(Operator.name.ilike(f"%{search}%"))
        count_query = count_query.where(Operator.name.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(Operator.name).offset(offset).limit(limit))
    items = result.scalars().all()

    return OperatorList(total=total, items=[OperatorRead.model_validate(o) for o in items])


@router.get("/{operator_id}", response_model=OperatorRead)
async def get_operator(operator_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single operator by ID."""
    result = await db.execute(select(Operator).where(Operator.operator_id == operator_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Operator not found")
    return OperatorRead.model_validate(obj)


@router.post("/", response_model=OperatorRead, status_code=201)
async def create_operator(payload: OperatorCreate, db: AsyncSession = Depends(get_db)):
    """Register a new operator."""
    obj = Operator(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return OperatorRead.model_validate(obj)


@router.patch("/{operator_id}", response_model=OperatorRead)
async def update_operator(
    operator_id: int,
    payload: OperatorUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing operator."""
    result = await db.execute(select(Operator).where(Operator.operator_id == operator_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Operator not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return OperatorRead.model_validate(obj)


@router.delete("/{operator_id}", status_code=204)
async def delete_operator(operator_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an operator record."""
    result = await db.execute(select(Operator).where(Operator.operator_id == operator_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Operator not found")
    await db.delete(obj)

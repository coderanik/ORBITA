"""CRUD endpoints for Operators (space agencies, companies)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.scoping import enforce_org_scope
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
    current_user: dict = Depends(get_current_user),
):
    """List operators with optional filters."""
    query = enforce_org_scope(select(Operator), Operator, current_user)
    count_query = enforce_org_scope(select(func.count()).select_from(Operator), Operator, current_user)

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
async def get_operator(
    operator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single operator by ID."""
    query = enforce_org_scope(select(Operator), Operator, current_user).where(Operator.operator_id == operator_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Operator not found")
    return OperatorRead.model_validate(obj)


@router.post("/", response_model=OperatorRead, status_code=201)
async def create_operator(
    payload: OperatorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Register a new operator."""
    obj = Operator(
        **payload.model_dump(exclude_unset=True),
        org_id=current_user.get("org_id"),
        created_by=current_user.get("user_id"),
        updated_by=current_user.get("user_id"),
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return OperatorRead.model_validate(obj)


@router.patch("/{operator_id}", response_model=OperatorRead)
async def update_operator(
    operator_id: int,
    payload: OperatorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update an existing operator."""
    query = enforce_org_scope(select(Operator), Operator, current_user).where(Operator.operator_id == operator_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Operator not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_by = current_user.get("user_id")

    await db.flush()
    await db.refresh(obj)
    return OperatorRead.model_validate(obj)


@router.delete("/{operator_id}", status_code=204)
async def delete_operator(
    operator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete an operator record."""
    query = enforce_org_scope(select(Operator), Operator, current_user).where(Operator.operator_id == operator_id)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Operator not found")
    obj.is_deleted = True
    obj.deleted_at = func.now()
    obj.updated_by = current_user.get("user_id")

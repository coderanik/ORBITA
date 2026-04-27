from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import SQLAlchemyError
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.jwt_handler import create_access_token
from app.auth.security import get_password_hash, hash_api_key, verify_password
from app.core.database import get_db
from app.models.auth_api_key import AuthApiKey
from app.models.auth_membership import AuthMembership
from app.models.auth_organization import AuthOrganization
from app.models.auth_user import AuthUser
from app.models.auth_login_event import AuthLoginEvent
from app.schemas.auth_admin import (
    ApiKeyCreate,
    ApiKeyIssueResponse,
    ApiKeyRead,
    AuthUserCreate,
    AuthUserList,
    AuthUserRead,
    AuthUserUpdate,
    OrganizationCreate,
    OrganizationRead,
)

router = APIRouter(prefix="/auth", tags=["Auth"])
ALLOWED_ROLES = {"viewer", "operator", "admin", "superadmin"}


class Token(BaseModel):
    access_token: str
    token_type: str


class User(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: str | None = None
    role: str
    org_id: int | None = None


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in {"admin", "superadmin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    login_value = form_data.username.strip().lower()
    result = await db.execute(
        select(AuthUser).where(
            (AuthUser.username == login_value) | (AuthUser.email == login_value)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=24 * 60)
    access_token = create_access_token(
        data={
            "sub": str(user.user_id),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "org_id": user.org_id,
        },
        expires_delta=access_token_expires,
    )

    timezone_name = request.headers.get("X-Client-Timezone")
    timezone_offset_raw = request.headers.get("X-Client-TZ-Offset-Minutes")
    try:
        timezone_offset_minutes = int(timezone_offset_raw) if timezone_offset_raw is not None else None
    except ValueError:
        timezone_offset_minutes = None

    client_host = request.client.host if request.client else None
    event = AuthLoginEvent(
        user_id=user.user_id,
        timezone_name=timezone_name,
        timezone_offset_minutes=timezone_offset_minutes,
        ip_address=client_host,
        user_agent=request.headers.get("User-Agent"),
        details={"auth_method": "password"},
    )
    try:
        db.add(event)
        await db.flush()
    except SQLAlchemyError as exc:
        # Do not block authentication if the login-audit table is unavailable
        # (e.g., migration not applied yet in the running environment).
        await db.rollback()
        print(f"[Auth] login event capture skipped: {exc}")

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def read_users_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AuthUser).where(AuthUser.user_id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        org_id=user.org_id,
    )


@router.get("/users", response_model=AuthUserList)
async def list_users(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count()).select_from(AuthUser))).scalar_one()
    result = await db.execute(select(AuthUser).order_by(AuthUser.user_id).offset(offset).limit(limit))
    return AuthUserList(total=total, items=[AuthUserRead.model_validate(item) for item in result.scalars().all()])


@router.post("/users", response_model=AuthUserRead, status_code=201)
async def create_user(
    payload: AuthUserCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    requested_role = payload.role.lower()
    if requested_role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    actor_role = current_user.get("role")
    if actor_role == "admin" and requested_role not in {"viewer", "operator"}:
        raise HTTPException(status_code=403, detail="Admins can only create viewer/operator users")
    if actor_role == "superadmin" and requested_role not in {"viewer", "operator", "admin"}:
        raise HTTPException(status_code=403, detail="Superadmin can create admin/operator/viewer users only")

    existing = await db.execute(
        select(AuthUser).where(
            (AuthUser.username == payload.username.lower()) | (AuthUser.email == payload.email.lower())
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User with username/email already exists")

    user = AuthUser(
        username=payload.username.lower(),
        email=payload.email.lower(),
        full_name=payload.full_name,
        role=requested_role,
        org_id=payload.org_id,
        password_hash=get_password_hash(payload.password),
        is_active=True,
    )
    db.add(user)
    await db.flush()
    if payload.org_id is not None:
        db.add(AuthMembership(user_id=user.user_id, org_id=payload.org_id, role=payload.role))
    await db.refresh(user)
    return AuthUserRead.model_validate(user)


@router.patch("/users/{user_id}", response_model=AuthUserRead)
async def update_user(
    user_id: int,
    payload: AuthUserUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AuthUser).where(AuthUser.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "role" in update_data and update_data["role"] is not None:
        requested_role = str(update_data["role"]).lower()
        if requested_role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role")
        actor_role = current_user.get("role")
        if actor_role == "admin" and requested_role not in {"viewer", "operator"}:
            raise HTTPException(status_code=403, detail="Admins can only assign viewer/operator roles")
        if actor_role == "superadmin" and requested_role not in {"viewer", "operator", "admin"}:
            raise HTTPException(status_code=403, detail="Superadmin can assign admin/operator/viewer roles only")
        update_data["role"] = requested_role

    if "email" in update_data and update_data["email"]:
        update_data["email"] = update_data["email"].lower()
    if "password" in update_data and update_data["password"]:
        user.password_hash = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_at = datetime.now(timezone.utc)

    if payload.org_id is not None:
        membership = (
            await db.execute(
                select(AuthMembership).where(
                    AuthMembership.user_id == user.user_id, AuthMembership.org_id == payload.org_id
                )
            )
        ).scalar_one_or_none()
        if membership:
            membership.role = payload.role or membership.role
        else:
            db.add(
                AuthMembership(
                    user_id=user.user_id,
                    org_id=payload.org_id,
                    role=payload.role or user.role,
                )
            )

    await db.flush()
    await db.refresh(user)
    return AuthUserRead.model_validate(user)


@router.post("/users/{user_id}/api-keys", response_model=ApiKeyIssueResponse, status_code=201)
async def create_api_key(
    user_id: int,
    payload: ApiKeyCreate,
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(AuthUser).where(AuthUser.user_id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    raw_key = f"orb_{secrets.token_urlsafe(32)}"
    key = AuthApiKey(
        user_id=user_id,
        key_name=payload.key_name,
        key_hash=hash_api_key(raw_key),
        scopes={scope: True for scope in payload.scopes},
        is_active=True,
    )
    db.add(key)
    await db.flush()
    await db.refresh(key)
    return ApiKeyIssueResponse(api_key=raw_key, key_info=ApiKeyRead.model_validate(key))


@router.get("/users/{user_id}/api-keys", response_model=list[ApiKeyRead])
async def list_api_keys(
    user_id: int,
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuthApiKey).where(AuthApiKey.user_id == user_id).order_by(AuthApiKey.api_key_id.desc())
    )
    return [ApiKeyRead.model_validate(item) for item in result.scalars().all()]


@router.delete("/api-keys/{api_key_id}", status_code=204)
async def revoke_api_key(
    api_key_id: int,
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AuthApiKey).where(AuthApiKey.api_key_id == api_key_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    key.last_used_at = datetime.now(timezone.utc)
    await db.flush()


@router.get("/organizations", response_model=list[OrganizationRead])
async def list_organizations(
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AuthOrganization).order_by(AuthOrganization.org_id))
    return [OrganizationRead.model_validate(item) for item in result.scalars().all()]


@router.post("/organizations", response_model=OrganizationRead, status_code=201)
async def create_organization(
    payload: OrganizationCreate,
    _: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(select(AuthOrganization).where(AuthOrganization.slug == payload.slug))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Organization slug already exists")
    org = AuthOrganization(name=payload.name, slug=payload.slug)
    db.add(org)
    await db.flush()
    await db.refresh(org)
    return OrganizationRead.model_validate(org)

"""
FastAPI dependencies for extracting the current user from JWT or API key.
"""

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import verify_password
from app.core.database import get_db
from app.models.auth_api_key import AuthApiKey
from app.models.auth_user import AuthUser
from .jwt_handler import verify_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Extracts the current user from either a JWT Bearer token or an X-API-Key header.
    Returns a dict with user_id, email, role, org_id.
    """
    # 1. Try JWT Bearer token
    if credentials:
        payload = verify_token(credentials.credentials)
        if payload:
            user_id = payload.get("sub")
            if user_id is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
            user_result = await db.execute(select(AuthUser).where(AuthUser.user_id == int(user_id)))
            user = user_result.scalar_one_or_none()
            if not user or not user.is_active:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
            return {
                "user_id": user.user_id,
                "email": user.email,
                "role": user.role,
                "org_id": user.org_id,
            }

    # 2. Try API Key
    if x_api_key:
        result = await db.execute(
            select(AuthApiKey, AuthUser)
            .join(AuthUser, AuthApiKey.user_id == AuthUser.user_id)
            .where(AuthApiKey.is_active.is_(True))
            .where(AuthUser.is_active.is_(True))
        )
        rows = result.all()
        for api_key, user in rows:
            if verify_password(x_api_key, api_key.key_hash):
                return {
                    "user_id": user.user_id,
                    "email": user.email,
                    "role": user.role,
                    "org_id": user.org_id,
                    "api_key_id": api_key.api_key_id,
                }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Provide a Bearer token or X-API-Key.",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> dict | None:
    """Returns current user if authenticated, None otherwise."""
    if not credentials:
        return None
    payload = verify_token(credentials.credentials)
    if payload:
        user_id = payload.get("sub")
        if user_id is None:
            return None
        result = await db.execute(select(AuthUser).where(AuthUser.user_id == int(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            return None
        return {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
            "org_id": user.org_id,
        }
    return None

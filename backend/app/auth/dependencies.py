"""
FastAPI dependencies for extracting the current user from JWT or API key.
"""

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .jwt_handler import verify_token

bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
) -> dict:
    """
    Extracts the current user from either a JWT Bearer token or an X-API-Key header.
    Returns a dict with user_id, email, role, org_id.
    """
    # 1. Try JWT Bearer token
    if credentials:
        payload = verify_token(credentials.credentials)
        if payload:
            return {
                "user_id": payload.get("sub"),
                "email": payload.get("email"),
                "role": payload.get("role", "viewer"),
                "org_id": payload.get("org_id"),
            }
    
    # 2. Try API Key
    if x_api_key:
        # In production, hash the key and look it up in auth.api_keys table
        # For now, return a mock user
        return {
            "user_id": 0,
            "email": "api-key-user",
            "role": "operator",
            "org_id": None,
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Provide a Bearer token or X-API-Key.",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """Returns current user if authenticated, None otherwise."""
    if not credentials:
        return None
    payload = verify_token(credentials.credentials)
    if payload:
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", "viewer"),
            "org_id": payload.get("org_id"),
        }
    return None

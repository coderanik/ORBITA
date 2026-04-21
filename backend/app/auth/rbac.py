"""
Role-Based Access Control (RBAC) middleware and helpers.
"""

from enum import Enum
from fastapi import HTTPException, status

class Role(str, Enum):
    VIEWER = "viewer"
    OPERATOR = "operator"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

# Permission hierarchy: superadmin > admin > operator > viewer
ROLE_HIERARCHY = {
    Role.VIEWER: 0,
    Role.OPERATOR: 1,
    Role.ADMIN: 2,
    Role.SUPERADMIN: 3,
}

def has_permission(user_role: str, required_role: str) -> bool:
    """Check if user_role meets or exceeds the required_role level."""
    user_level = ROLE_HIERARCHY.get(Role(user_role), -1)
    required_level = ROLE_HIERARCHY.get(Role(required_role), 99)
    return user_level >= required_level

def require_role(required_role: str):
    """
    FastAPI dependency factory that enforces a minimum role.
    Usage: Depends(require_role("operator"))
    """
    def checker(current_user: dict):
        if not has_permission(current_user.get("role", "viewer"), required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {required_role}"
            )
        return current_user
    return checker

# Scope-based permissions for API keys
SCOPES = {
    "read:catalog": "Read space object catalog",
    "write:catalog": "Create/update space objects",
    "read:telemetry": "Read telemetry data",
    "write:telemetry": "Ingest telemetry data",
    "read:conjunctions": "Read conjunction events",
    "write:conjunctions": "Create conjunction events",
    "read:benchmark": "Read ATSAD benchmark data",
    "write:benchmark": "Submit benchmark results",
    "admin:users": "Manage users and organizations",
}

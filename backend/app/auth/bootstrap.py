"""Bootstrap helpers for initializing auth data."""

from sqlalchemy import select

from app.models.auth_user import AuthUser
from app.auth.security import get_password_hash


async def ensure_default_admin(session) -> None:
    """Create a default admin if auth.users has no admin accounts."""
    existing_admin = await session.execute(
        select(AuthUser).where(AuthUser.role.in_(["admin", "superadmin"]))
    )
    if existing_admin.scalar_one_or_none():
        return

    default_admin = AuthUser(
        username="admin",
        email="admin@orbita.dev",
        full_name="ORBITA Administrator",
        role="admin",
        org_id=1,
        password_hash=get_password_hash("password123"),
        is_active=True,
    )
    session.add(default_admin)
    await session.commit()

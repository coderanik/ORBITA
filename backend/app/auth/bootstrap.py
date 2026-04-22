"""Bootstrap helpers for initializing auth data."""

from sqlalchemy import select

from app.models.auth_membership import AuthMembership
from app.models.auth_organization import AuthOrganization
from app.models.auth_user import AuthUser
from app.auth.security import get_password_hash


async def ensure_default_admin(session) -> None:
    """Create a default admin if auth.users has no admin accounts."""
    org = (
        await session.execute(select(AuthOrganization).where(AuthOrganization.slug == "default-org"))
    ).scalar_one_or_none()
    if not org:
        org = AuthOrganization(name="Default Organization", slug="default-org")
        session.add(org)
        await session.flush()

    existing_admin = await session.execute(
        select(AuthUser).where(AuthUser.role.in_(["admin", "superadmin"]))
    )
    admin_user = existing_admin.scalar_one_or_none()
    if admin_user:
        if admin_user.org_id is None:
            admin_user.org_id = org.org_id
        existing_membership = (
            await session.execute(
                select(AuthMembership).where(
                    AuthMembership.user_id == admin_user.user_id,
                    AuthMembership.org_id == admin_user.org_id,
                )
            )
        ).scalar_one_or_none()
        if not existing_membership:
            session.add(AuthMembership(user_id=admin_user.user_id, org_id=admin_user.org_id, role=admin_user.role))
        await session.commit()
        return

    default_admin = AuthUser(
        username="admin",
        email="admin@orbita.dev",
        full_name="ORBITA Administrator",
        role="admin",
        org_id=org.org_id,
        password_hash=get_password_hash("password123"),
        is_active=True,
    )
    session.add(default_admin)
    await session.flush()
    session.add(AuthMembership(user_id=default_admin.user_id, org_id=org.org_id, role="admin"))
    await session.commit()

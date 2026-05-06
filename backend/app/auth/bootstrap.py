"""Bootstrap helpers for initializing auth data."""

from sqlalchemy import select

from app.models.auth_membership import AuthMembership
from app.models.auth_organization import AuthOrganization
from app.models.auth_user import AuthUser
from app.auth.security import get_password_hash


async def ensure_default_admin(session) -> None:
    """Create default users for all roles if they don't exist."""
    org = (
        await session.execute(select(AuthOrganization).where(AuthOrganization.slug == "default-org"))
    ).scalar_one_or_none()
    if not org:
        org = AuthOrganization(name="Default Organization", slug="default-org")
        session.add(org)
        await session.flush()

    default_users = [
        {"username": "superadmin", "email": "superadmin@orbita.dev", "full_name": "ORBITA Superadmin", "role": "superadmin"},
        {"username": "admin", "email": "admin@orbita.dev", "full_name": "ORBITA Administrator", "role": "admin"},
        {"username": "operator", "email": "operator@orbita.dev", "full_name": "ORBITA Operator", "role": "operator"},
        {"username": "viewer", "email": "viewer@orbita.dev", "full_name": "ORBITA Viewer", "role": "viewer"},
    ]

    password_hash = get_password_hash("password123")

    for user_data in default_users:
        existing = await session.execute(
            select(AuthUser).where(AuthUser.username == user_data["username"])
        )
        user = existing.scalar_one_or_none()

        if not user:
            user = AuthUser(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                org_id=org.org_id,
                password_hash=password_hash,
                is_active=True,
            )
            session.add(user)
            await session.flush()

        # Ensure organization assignment is set on the user
        if user.org_id is None:
            user.org_id = org.org_id

        # Ensure membership is created in the join table
        existing_membership = (
            await session.execute(
                select(AuthMembership).where(
                    AuthMembership.user_id == user.user_id,
                    AuthMembership.org_id == org.org_id,
                )
            )
        ).scalar_one_or_none()

        if not existing_membership:
            session.add(AuthMembership(user_id=user.user_id, org_id=org.org_id, role=user.role))

    await session.commit()

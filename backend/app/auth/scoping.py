"""Tenant scoping helpers for organization-aware CRUD operations."""

from sqlalchemy import Select


def enforce_org_scope(query: Select, model, current_user: dict, allow_global_admin: bool = True) -> Select:
    """Apply org + soft-delete constraints unless user is superadmin/admin without org."""
    role = current_user.get("role")
    org_id = current_user.get("org_id")

    if allow_global_admin and role in {"admin", "superadmin"} and org_id is None:
        if hasattr(model, "is_deleted"):
            query = query.where(model.is_deleted.is_(False))
        return query

    if org_id is not None and hasattr(model, "org_id"):
        query = query.where(model.org_id == org_id)

    if hasattr(model, "is_deleted"):
        query = query.where(model.is_deleted.is_(False))

    return query

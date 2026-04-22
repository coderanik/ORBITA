"""System operations status endpoints for superadmin observability."""

from __future__ import annotations

import asyncio
import hashlib
import os
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.models.auth_login_event import AuthLoginEvent
from app.models.auth_user import AuthUser
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/system-ops", tags=["System Operations"])
SENSITIVE_SALT = os.getenv("SENSITIVE_SALT", "orbita-superadmin-mask")


def _mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[:2] + "*" * (len(local) - 2)
    return f"{masked_local}@{domain}"


def _fingerprint(value: str | None) -> str | None:
    if not value:
        return None
    digest = hashlib.sha256(f"{SENSITIVE_SALT}:{value}".encode("utf-8")).hexdigest()
    return digest[:12]


async def _celery_worker_status() -> dict:
    def _inspect() -> dict:
        inspector = celery_app.control.inspect(timeout=1.0)
        ping = inspector.ping() or {}
        return {"online_workers": sorted(list(ping.keys())), "worker_count": len(ping)}

    try:
        data = await asyncio.to_thread(_inspect)
        return {"ok": True, **data}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "online_workers": [], "worker_count": 0}


async def _redis_status() -> dict:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    client = redis.from_url(redis_url, decode_responses=True)
    try:
        pong = await client.ping()
        info = await client.info(section="memory")
        db_size = await client.dbsize()
        return {
            "ok": bool(pong),
            "db_size": int(db_size),
            "used_memory_human": info.get("used_memory_human"),
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "db_size": None, "used_memory_human": None}
    finally:
        await client.aclose()


async def _rabbitmq_status() -> dict:
    broker_url = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
    parsed = urlparse(broker_url)
    host = parsed.hostname or "localhost"
    mgmt_url = f"http://{host}:15672/api/queues"
    username = parsed.username or "guest"
    password = parsed.password or "guest"
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(mgmt_url, auth=(username, password))
            if res.status_code != 200:
                return {
                    "ok": False,
                    "error": f"HTTP {res.status_code}",
                    "queue_count": 0,
                    "messages_ready_total": None,
                    "messages_unacked_total": None,
                }
            queues = res.json()
            return {
                "ok": True,
                "queue_count": len(queues),
                "messages_ready_total": int(sum(q.get("messages_ready", 0) for q in queues)),
                "messages_unacked_total": int(sum(q.get("messages_unacknowledged", 0) for q in queues)),
            }
    except Exception as exc:
        return {
            "ok": False,
            "error": str(exc),
            "queue_count": 0,
            "messages_ready_total": None,
            "messages_unacked_total": None,
        }


@router.get("/status")
async def get_system_ops_status():
    """Aggregate API, Celery, Redis, and RabbitMQ health for the superadmin UI."""
    celery, redis_status, rabbitmq = await asyncio.gather(
        _celery_worker_status(),
        _redis_status(),
        _rabbitmq_status(),
    )
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "api": {"ok": True},
        "celery": celery,
        "redis": redis_status,
        "rabbitmq": rabbitmq,
    }


@router.get("/users-activity")
async def get_users_activity(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List users and their latest login activity with timezone metadata."""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin role required")

    latest_login_subq = (
        select(
            AuthLoginEvent.user_id,
            func.max(AuthLoginEvent.logged_in_at).label("latest_logged_in_at"),
        )
        .group_by(AuthLoginEvent.user_id)
        .subquery()
    )

    rows = (
        await db.execute(
            select(
                AuthUser.user_id,
                AuthUser.username,
                AuthUser.email,
                AuthUser.role,
                AuthUser.is_active,
                latest_login_subq.c.latest_logged_in_at,
                AuthLoginEvent.timezone_name,
                AuthLoginEvent.timezone_offset_minutes,
                AuthLoginEvent.ip_address,
            )
            .outerjoin(latest_login_subq, latest_login_subq.c.user_id == AuthUser.user_id)
            .outerjoin(
                AuthLoginEvent,
                (AuthLoginEvent.user_id == AuthUser.user_id)
                & (AuthLoginEvent.logged_in_at == latest_login_subq.c.latest_logged_in_at),
            )
            .order_by(AuthUser.user_id.asc())
            .limit(limit)
        )
    ).all()

    return {
        "total": len(rows),
        "items": [
            {
                "user_id": int(row.user_id),
                "username": row.username,
                "email_masked": _mask_email(row.email),
                "role": row.role,
                "is_active": bool(row.is_active),
                "latest_logged_in_at": row.latest_logged_in_at.isoformat() if row.latest_logged_in_at else None,
                "timezone_name": row.timezone_name,
                "timezone_offset_minutes": row.timezone_offset_minutes,
                "ip_fingerprint": _fingerprint(row.ip_address),
            }
            for row in rows
        ],
    }

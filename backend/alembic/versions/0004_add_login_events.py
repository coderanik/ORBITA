"""add auth login events

Revision ID: 0004_add_login_events
Revises: 0003_org_scoping_audit_and_seeds
Create Date: 2026-04-22 23:59:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0004_add_login_events"
down_revision: Union[str, None] = "0003_org_scoping_audit_and_seeds"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auth.login_events (
            login_event_id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES auth.users(user_id) ON DELETE CASCADE,
            logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            timezone_name VARCHAR(100),
            timezone_offset_minutes INTEGER,
            ip_address VARCHAR(64),
            user_agent VARCHAR(512),
            details JSONB
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_auth_login_events_user_id ON auth.login_events(user_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_auth_login_events_logged_in_at ON auth.login_events(logged_in_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS auth.login_events;")

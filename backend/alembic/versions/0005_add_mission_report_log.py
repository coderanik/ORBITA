"""add mission report log

Revision ID: 0005_add_mission_report_log
Revises: 0004_add_login_events
Create Date: 2026-04-25 03:02:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0005_add_mission_report_log"
down_revision: Union[str, None] = "0004_add_login_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS analytics.mission_report_log (
            report_id BIGSERIAL PRIMARY KEY,
            object_id BIGINT NOT NULL REFERENCES catalog.space_object(object_id),
            generated_by_user_id BIGINT,
            report_type VARCHAR(30) NOT NULL DEFAULT 'MISSION_CDM',
            file_name VARCHAR(255) NOT NULL,
            file_size_bytes INTEGER,
            alert_count INTEGER NOT NULL DEFAULT 0,
            conjunction_count INTEGER NOT NULL DEFAULT 0,
            details JSONB,
            generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_analytics_mission_report_log_object_id ON analytics.mission_report_log(object_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_analytics_mission_report_log_generated_at ON analytics.mission_report_log(generated_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS analytics.mission_report_log;")

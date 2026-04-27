"""add missing operator_id columns for mission and ground station

Revision ID: 0006_add_operator_cols
Revises: 0005_add_mission_report_log
Create Date: 2026-04-26 03:05:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0006_add_operator_cols"
down_revision: Union[str, None] = "0005_add_mission_report_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE catalog.mission
        ADD COLUMN IF NOT EXISTS operator_id BIGINT REFERENCES catalog.operator(operator_id);
        """
    )
    op.execute(
        """
        ALTER TABLE tracking.ground_station
        ADD COLUMN IF NOT EXISTS operator_id BIGINT REFERENCES catalog.operator(operator_id);
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_mi_operator ON catalog.mission (operator_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_gs_operator ON tracking.ground_station (operator_id);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_gs_operator;")
    op.execute("DROP INDEX IF EXISTS idx_mi_operator;")
    op.execute("ALTER TABLE tracking.ground_station DROP COLUMN IF EXISTS operator_id;")
    op.execute("ALTER TABLE catalog.mission DROP COLUMN IF EXISTS operator_id;")

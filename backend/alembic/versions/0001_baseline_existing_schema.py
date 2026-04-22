"""baseline existing schema

Revision ID: 0001_baseline_existing_schema
Revises: 
Create Date: 2026-04-22 20:10:00.000000
"""

from typing import Sequence, Union


revision: str = "0001_baseline_existing_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline for pre-existing schema managed by db-sql scripts.
    pass


def downgrade() -> None:
    pass

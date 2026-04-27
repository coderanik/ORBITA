"""create auth users and api keys tables

Revision ID: 0002_create_auth_tables
Revises: 0001_baseline_existing_schema
Create Date: 2026-04-22 20:18:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0002_create_auth_tables"
down_revision: Union[str, None] = "0001_baseline_existing_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS auth;")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auth.users (
            user_id BIGSERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(32) NOT NULL DEFAULT 'viewer',
            org_id BIGINT,
            password_hash VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_users_username ON auth.users(username);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_users_email ON auth.users(email);")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auth.api_keys (
            api_key_id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES auth.users(user_id) ON DELETE CASCADE,
            key_name VARCHAR(120) NOT NULL,
            key_hash VARCHAR(255) UNIQUE NOT NULL,
            scopes JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_used_at TIMESTAMPTZ
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_api_keys_user_id ON auth.api_keys(user_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS auth.api_keys;")
    op.execute("DROP TABLE IF EXISTS auth.users;")

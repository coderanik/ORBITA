"""add org scoping, audit fields, and seed data

Revision ID: 0003_org_scoping_audit_and_seeds
Revises: 0002_create_auth_tables
Create Date: 2026-04-22 21:05:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0003_org_scoping_audit_and_seeds"
down_revision: Union[str, None] = "0002_create_auth_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auth.organizations (
            org_id BIGSERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL UNIQUE,
            slug VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_organizations_slug ON auth.organizations(slug);")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auth.org_membership (
            membership_id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES auth.users(user_id) ON DELETE CASCADE,
            org_id BIGINT NOT NULL REFERENCES auth.organizations(org_id) ON DELETE CASCADE,
            role VARCHAR(32) NOT NULL DEFAULT 'viewer',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_org_membership_user_id ON auth.org_membership(user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_org_membership_org_id ON auth.org_membership(org_id);")

    tracked_tables = [
        "catalog.space_object",
        "catalog.operator",
        "catalog.mission",
        "tracking.ground_station",
        "catalog.launch_vehicle",
        "analytics.conjunction_event",
        "ml.benchmark_dataset",
        "ml.benchmark_model",
        "ml.benchmark_run",
    ]
    for table_name in tracked_tables:
        op.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS org_id BIGINT;")
        op.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS created_by BIGINT;")
        op.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS updated_by BIGINT;")
        op.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;")
        op.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;")

    op.execute(
        """
        INSERT INTO auth.organizations (name, slug)
        VALUES ('Default Organization', 'default-org')
        ON CONFLICT (slug) DO NOTHING;
        """
    )
    op.execute(
        """
        UPDATE auth.users
        SET org_id = (
            SELECT org_id FROM auth.organizations WHERE slug = 'default-org' LIMIT 1
        )
        WHERE org_id IS NULL;
        """
    )
    op.execute(
        """
        INSERT INTO auth.org_membership (user_id, org_id, role)
        SELECT u.user_id, u.org_id, u.role
        FROM auth.users u
        WHERE u.org_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM auth.org_membership m
            WHERE m.user_id = u.user_id AND m.org_id = u.org_id
          );
        """
    )

    op.execute(
        """
        INSERT INTO catalog.operator (name, short_name, country_code, operator_type, created_at, updated_at, org_id)
        SELECT 'Default Space Agency', 'DSA', 'USA', 'GOVERNMENT', now(), now(), o.org_id
        FROM auth.organizations o
        WHERE o.slug = 'default-org'
          AND NOT EXISTS (
            SELECT 1 FROM catalog.operator WHERE short_name = 'DSA'
          );
        """
    )
    op.execute(
        """
        INSERT INTO ml.benchmark_dataset (name, description, task_type, domain, num_channels, source, created_at, org_id)
        SELECT
            'ATSAD Starter Dataset',
            'Seed dataset for local development and admin UI validation',
            'MULTIVARIATE',
            'SPACECRAFT',
            12,
            'seed',
            now(),
            o.org_id
        FROM auth.organizations o
        WHERE o.slug = 'default-org'
          AND NOT EXISTS (
            SELECT 1 FROM ml.benchmark_dataset WHERE name = 'ATSAD Starter Dataset'
          );
        """
    )
    op.execute(
        """
        INSERT INTO ml.benchmark_model (
            name, model_type, architecture, version, description, context_strategy, is_baseline, created_at, updated_at, org_id
        )
        SELECT
            'ATSAD Baseline LSTM',
            'DEEP_LEARNING',
            'LSTM-AE',
            '1.0.0',
            'Seed baseline model registration',
            'ZERO_SHOT',
            TRUE,
            now(),
            now(),
            o.org_id
        FROM auth.organizations o
        WHERE o.slug = 'default-org'
          AND NOT EXISTS (
            SELECT 1 FROM ml.benchmark_model WHERE name = 'ATSAD Baseline LSTM'
          );
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM ml.benchmark_model WHERE name = 'ATSAD Baseline LSTM';")
    op.execute("DELETE FROM ml.benchmark_dataset WHERE name = 'ATSAD Starter Dataset';")
    op.execute("DELETE FROM catalog.operator WHERE short_name = 'DSA';")
    op.execute("DROP TABLE IF EXISTS auth.org_membership;")
    op.execute("DROP TABLE IF EXISTS auth.organizations;")

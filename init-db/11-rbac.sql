-- Phase 6: Multi-Tenant RBAC

-- Organizations
CREATE TABLE IF NOT EXISTS auth.organizations (
    org_id    SERIAL PRIMARY KEY,
    name      TEXT UNIQUE NOT NULL,
    tier      TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users with org membership and roles
CREATE TABLE IF NOT EXISTS auth.users (
    user_id   SERIAL PRIMARY KEY,
    email     TEXT UNIQUE NOT NULL,
    pw_hash   TEXT NOT NULL,
    org_id    INT REFERENCES auth.organizations(org_id),
    role      TEXT NOT NULL CHECK (role IN ('viewer', 'operator', 'admin', 'superadmin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys for machine clients
CREATE TABLE IF NOT EXISTS auth.api_keys (
    key_id    SERIAL PRIMARY KEY,
    user_id   INT REFERENCES auth.users(user_id) ON DELETE CASCADE,
    key_hash  TEXT NOT NULL,
    label     TEXT DEFAULT 'default',
    scope     TEXT[] DEFAULT '{}',
    expires   TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON auth.api_keys(user_id);
CREATE INDEX idx_users_org ON auth.users(org_id);

-- Add org_id column to space_objects for row-level isolation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'catalog' AND table_name = 'space_objects' AND column_name = 'org_id'
    ) THEN
        ALTER TABLE catalog.space_objects ADD COLUMN org_id INT REFERENCES auth.organizations(org_id);
    END IF;
END $$;

-- Row-Level Security policy
ALTER TABLE catalog.space_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON catalog.space_objects
    USING (
        org_id IS NULL  -- Public objects visible to all
        OR org_id = current_setting('app.current_org_id', true)::INT
    );

-- Seed a default org
INSERT INTO auth.organizations (name, tier) VALUES ('ORBITA Default', 'enterprise')
ON CONFLICT (name) DO NOTHING;

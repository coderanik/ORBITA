-- ============================================================
-- 07 - Permissions
-- ============================================================

-- Grant full access to admin
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA catalog   TO orbita_admin;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA tracking  TO orbita_admin;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA telemetry TO orbita_admin;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA analytics TO orbita_admin;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA ml        TO orbita_admin;
GRANT USAGE, SELECT  ON ALL SEQUENCES IN SCHEMA catalog   TO orbita_admin;
GRANT USAGE, SELECT  ON ALL SEQUENCES IN SCHEMA tracking  TO orbita_admin;
GRANT USAGE, SELECT  ON ALL SEQUENCES IN SCHEMA telemetry TO orbita_admin;
GRANT USAGE, SELECT  ON ALL SEQUENCES IN SCHEMA analytics TO orbita_admin;
GRANT USAGE, SELECT  ON ALL SEQUENCES IN SCHEMA ml        TO orbita_admin;

-- Read-only role for application services
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'orbita_reader') THEN
        CREATE ROLE orbita_reader WITH LOGIN PASSWORD 'reader_2026';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE orbita_registry TO orbita_reader;
GRANT USAGE ON SCHEMA catalog, tracking, telemetry, analytics, ml TO orbita_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA catalog   TO orbita_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA tracking  TO orbita_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA telemetry TO orbita_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO orbita_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA ml        TO orbita_reader;

-- Future tables auto-grant
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog   GRANT SELECT ON TABLES TO orbita_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA tracking  GRANT SELECT ON TABLES TO orbita_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA telemetry GRANT SELECT ON TABLES TO orbita_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO orbita_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA ml        GRANT SELECT ON TABLES TO orbita_reader;

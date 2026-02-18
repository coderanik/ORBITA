-- ============================================================
-- ORBITA: Orbital Registry for Big Data, Intelligence,
--         and Traffic Analysis
-- ============================================================
-- 01 - Enable PostgreSQL Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy text search

-- TimescaleDB is optional (may not be installed on all platforms)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
    RAISE NOTICE 'TimescaleDB extension loaded successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB not available - using standard PostgreSQL tables';
END;
$$;

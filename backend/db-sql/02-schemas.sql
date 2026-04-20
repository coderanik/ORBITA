-- ============================================================
-- 02 - Create Schemas
-- ============================================================

CREATE SCHEMA IF NOT EXISTS catalog;    -- space object master data, operators, launches
CREATE SCHEMA IF NOT EXISTS tracking;   -- orbit states, ground stations, observations
CREATE SCHEMA IF NOT EXISTS telemetry;  -- time-series satellite health data
CREATE SCHEMA IF NOT EXISTS analytics;  -- conjunction events, space weather, risk
CREATE SCHEMA IF NOT EXISTS ml;         -- machine learning predictions & alerts

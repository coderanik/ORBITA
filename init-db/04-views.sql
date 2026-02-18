-- ============================================================
-- 04 - Views
-- ============================================================

SET search_path TO catalog, tracking, telemetry, analytics, public;

-- ── Active satellites with their most recent orbit state ─────
CREATE OR REPLACE VIEW catalog.v_active_satellites AS
SELECT
    so.object_id,
    so.norad_id,
    so.cospar_id,
    so.name,
    so.operator,
    so.orbit_class,
    so.mass_kg,
    os.epoch            AS last_orbit_epoch,
    os.semimajor_axis_km,
    os.eccentricity,
    os.inclination_deg,
    os.periapsis_km,
    os.apoapsis_km,
    os.period_minutes,
    os.position_x_km,
    os.position_y_km,
    os.position_z_km,
    os.source           AS orbit_source
FROM catalog.space_object so
JOIN LATERAL (
    SELECT *
    FROM tracking.orbit_state
    WHERE object_id = so.object_id
    ORDER BY epoch DESC
    LIMIT 1
) os ON TRUE
WHERE so.object_type = 'SATELLITE'
  AND so.status = 'ACTIVE';

-- ── Upcoming conjunction alerts (next 7 days, HIGH+) ────────
CREATE OR REPLACE VIEW analytics.v_upcoming_alerts AS
SELECT
    ce.conjunction_id,
    ce.time_of_closest_approach,
    ce.miss_distance_km,
    ce.collision_probability,
    ce.risk_level,
    ce.status,
    ce.recommended_action,
    p.norad_id      AS primary_norad,
    p.name          AS primary_name,
    p.object_type   AS primary_type,
    s.norad_id      AS secondary_norad,
    s.name          AS secondary_name,
    s.object_type   AS secondary_type,
    ce.time_of_closest_approach - NOW() AS time_to_tca
FROM analytics.conjunction_event ce
JOIN catalog.space_object p ON ce.primary_object_id   = p.object_id
JOIN catalog.space_object s ON ce.secondary_object_id = s.object_id
WHERE ce.time_of_closest_approach > NOW()
  AND ce.time_of_closest_approach < NOW() + INTERVAL '7 days'
  AND ce.risk_level IN ('HIGH','CRITICAL','RED')
ORDER BY ce.collision_probability DESC;

-- ── Space object population summary ─────────────────────────
CREATE OR REPLACE VIEW catalog.v_population_summary AS
SELECT
    object_type,
    orbit_class,
    status,
    COUNT(*)            AS object_count,
    AVG(mass_kg)        AS avg_mass_kg,
    MIN(launch_date)    AS earliest_launch,
    MAX(launch_date)    AS latest_launch
FROM catalog.space_object
GROUP BY object_type, orbit_class, status
ORDER BY object_count DESC;

-- ── Latest telemetry per satellite per subsystem ────────────
CREATE OR REPLACE VIEW telemetry.v_latest_telemetry AS
SELECT DISTINCT ON (t.object_id, t.subsystem, t.parameter_name)
    t.object_id,
    so.name         AS object_name,
    t.subsystem,
    t.parameter_name,
    t.value,
    t.unit,
    t.quality,
    t.ts
FROM telemetry.satellite_telemetry t
JOIN catalog.space_object so ON t.object_id = so.object_id
ORDER BY t.object_id, t.subsystem, t.parameter_name, t.ts DESC;

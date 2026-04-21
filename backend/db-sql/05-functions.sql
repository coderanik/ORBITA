-- ============================================================
-- 05 - Functions & Triggers
-- ============================================================

SET search_path TO catalog, tracking, telemetry, analytics, ml, public;

-- ── Auto-update updated_at on row change ────────────────────
CREATE OR REPLACE FUNCTION catalog.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_space_object_updated
    BEFORE UPDATE ON catalog.space_object
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

CREATE TRIGGER trg_mission_updated
    BEFORE UPDATE ON catalog.mission
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

CREATE TRIGGER trg_operator_updated
    BEFORE UPDATE ON catalog.operator
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

CREATE TRIGGER trg_conjunction_updated
    BEFORE UPDATE ON analytics.conjunction_event
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

CREATE TRIGGER trg_reentry_updated
    BEFORE UPDATE ON analytics.reentry_event
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

-- ── Auto-populate PostGIS geometry from Cartesian coords ────
CREATE OR REPLACE FUNCTION tracking.fn_set_position_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.position_x_km IS NOT NULL
       AND NEW.position_y_km IS NOT NULL
       AND NEW.position_z_km IS NOT NULL THEN
        NEW.position_geom = ST_SetSRID(
            ST_MakePoint(
                NEW.position_x_km * 1000,
                NEW.position_y_km * 1000,
                NEW.position_z_km * 1000
            ),
            4978
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orbit_state_geom
    BEFORE INSERT OR UPDATE ON tracking.orbit_state
    FOR EACH ROW EXECUTE FUNCTION tracking.fn_set_position_geom();

CREATE TRIGGER trg_propagation_geom
    BEFORE INSERT OR UPDATE ON tracking.propagation_result
    FOR EACH ROW EXECUTE FUNCTION tracking.fn_set_position_geom();

-- ── Compute periapsis / apoapsis from SMA + eccentricity ────
CREATE OR REPLACE FUNCTION tracking.fn_compute_apsides()
RETURNS TRIGGER AS $$
DECLARE
    earth_radius_km CONSTANT DOUBLE PRECISION := 6378.137;
BEGIN
    IF NEW.semimajor_axis_km IS NOT NULL AND NEW.eccentricity IS NOT NULL THEN
        NEW.periapsis_km = NEW.semimajor_axis_km * (1 - NEW.eccentricity) - earth_radius_km;
        NEW.apoapsis_km  = NEW.semimajor_axis_km * (1 + NEW.eccentricity) - earth_radius_km;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orbit_state_apsides
    BEFORE INSERT OR UPDATE ON tracking.orbit_state
    FOR EACH ROW EXECUTE FUNCTION tracking.fn_compute_apsides();

-- ── Find objects within a spherical volume at a given time ───
CREATE OR REPLACE FUNCTION tracking.fn_objects_in_sphere(
    center_x_km     DOUBLE PRECISION,
    center_y_km     DOUBLE PRECISION,
    center_z_km     DOUBLE PRECISION,
    radius_km       DOUBLE PRECISION,
    time_from       TIMESTAMPTZ,
    time_to         TIMESTAMPTZ
)
RETURNS TABLE (
    object_id       BIGINT,
    object_name     VARCHAR,
    object_type     VARCHAR,
    distance_km     DOUBLE PRECISION,
    at_epoch        TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        so.object_id,
        so.name,
        so.object_type,
        ST_3DDistance(
            os.position_geom,
            ST_SetSRID(ST_MakePoint(center_x_km*1000, center_y_km*1000, center_z_km*1000), 4978)
        ) / 1000.0  AS distance_km,
        os.epoch
    FROM tracking.orbit_state os
    JOIN catalog.space_object so ON os.object_id = so.object_id
    WHERE os.epoch BETWEEN time_from AND time_to
      AND ST_3DDWithin(
          os.position_geom,
          ST_SetSRID(ST_MakePoint(center_x_km*1000, center_y_km*1000, center_z_km*1000), 4978),
          radius_km * 1000
      )
    ORDER BY distance_km;
END;
$$;

-- ── Get full orbit history for an object ────────────────────
CREATE OR REPLACE FUNCTION tracking.fn_orbit_history(
    p_object_id     BIGINT,
    p_from          TIMESTAMPTZ DEFAULT '-infinity',
    p_to            TIMESTAMPTZ DEFAULT 'infinity',
    p_limit         INTEGER     DEFAULT 1000
)
RETURNS SETOF tracking.orbit_state
LANGUAGE sql STABLE AS $$
    SELECT *
    FROM tracking.orbit_state
    WHERE object_id = p_object_id
      AND epoch BETWEEN p_from AND p_to
    ORDER BY epoch DESC
    LIMIT p_limit;
$$;

-- ── Classify conjunction risk level from probability ────────
CREATE OR REPLACE FUNCTION analytics.fn_classify_risk(
    probability DOUBLE PRECISION
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    RETURN CASE
        WHEN probability >= 1e-2  THEN 'RED'
        WHEN probability >= 1e-3  THEN 'CRITICAL'
        WHEN probability >= 1e-4  THEN 'HIGH'
        WHEN probability >= 1e-5  THEN 'MEDIUM'
        ELSE 'LOW'
    END;
END;
$$;

-- ── Auto-classify anomaly severity from score ───────────────
CREATE OR REPLACE FUNCTION ml.fn_classify_anomaly_severity(
    score DOUBLE PRECISION,
    threshold DOUBLE PRECISION
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    RETURN CASE
        WHEN score >= threshold * 3.0 THEN 'CRITICAL'
        WHEN score >= threshold * 1.5 THEN 'WARNING'
        ELSE 'INFO'
    END;
END;
$$;

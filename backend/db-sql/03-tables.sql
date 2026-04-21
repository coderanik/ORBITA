-- ============================================================
-- 03 - Core Tables  (19 entities across 5 schemas)
-- ============================================================

SET search_path TO catalog, tracking, telemetry, analytics, ml, public;

-- ════════════════════════════════════════════════════════════
-- CATALOG schema
-- ════════════════════════════════════════════════════════════

-- 1. Operator: organizations that build / operate space assets
CREATE TABLE catalog.operator (
    operator_id     BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    short_name      VARCHAR(50),
    country_code    CHAR(3),
    operator_type   VARCHAR(50)
        CHECK (operator_type IN ('GOVERNMENT','COMMERCIAL','ACADEMIC','MILITARY','INTERGOVERNMENTAL','OTHER')),
    website         VARCHAR(300),
    founded_year    INTEGER,
    headquarters    VARCHAR(200),
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_op_name    ON catalog.operator (name);
CREATE INDEX idx_op_country ON catalog.operator (country_code);
CREATE INDEX idx_op_type    ON catalog.operator (operator_type);

-- 2. LaunchVehicle: rocket families and variants
CREATE TABLE catalog.launch_vehicle (
    vehicle_id      BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    family          VARCHAR(100),
    variant         VARCHAR(100),
    operator_id     BIGINT          REFERENCES catalog.operator(operator_id),
    country_code    CHAR(3),
    num_stages      INTEGER,
    payload_leo_kg  NUMERIC(10,2),
    payload_gto_kg  NUMERIC(10,2),
    height_m        NUMERIC(8,2),
    diameter_m      NUMERIC(6,2),
    liftoff_mass_kg NUMERIC(12,2),
    status          VARCHAR(30)     DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','RETIRED','DEVELOPMENT','TESTING')),
    maiden_flight   DATE,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_lv_name     ON catalog.launch_vehicle (name);
CREATE INDEX idx_lv_family   ON catalog.launch_vehicle (family);
CREATE INDEX idx_lv_operator ON catalog.launch_vehicle (operator_id);

-- 3. LaunchEvent: individual launch occurrences
CREATE TABLE catalog.launch_event (
    launch_id       BIGSERIAL       PRIMARY KEY,
    launch_date     TIMESTAMPTZ     NOT NULL,
    vehicle_id      BIGINT          REFERENCES catalog.launch_vehicle(vehicle_id),
    operator_id     BIGINT          REFERENCES catalog.operator(operator_id),
    launch_site     VARCHAR(200),
    outcome         VARCHAR(30)     DEFAULT 'SUCCESS'
        CHECK (outcome IN ('SUCCESS','FAILURE','PARTIAL_FAILURE','IN_FLIGHT','SCHEDULED')),
    orbit_target    VARCHAR(50),
    payload_count   INTEGER,
    flight_number   VARCHAR(50),
    notes           TEXT,
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_le_date     ON catalog.launch_event (launch_date DESC);
CREATE INDEX idx_le_vehicle  ON catalog.launch_event (vehicle_id);
CREATE INDEX idx_le_operator ON catalog.launch_event (operator_id);
CREATE INDEX idx_le_outcome  ON catalog.launch_event (outcome);

-- 4. SpaceObject: superclass for satellites, debris, rocket bodies
CREATE TABLE catalog.space_object (
    object_id       BIGSERIAL       PRIMARY KEY,
    norad_id        INTEGER         UNIQUE,
    cospar_id       VARCHAR(20)     UNIQUE,
    name            VARCHAR(200)    NOT NULL,
    object_type     VARCHAR(50)     NOT NULL
        CHECK (object_type IN ('SATELLITE','DEBRIS','ROCKET_BODY','UNKNOWN')),
    operator_id     BIGINT          REFERENCES catalog.operator(operator_id),
    launch_id       BIGINT          REFERENCES catalog.launch_event(launch_id),
    launch_date     DATE,
    decay_date      DATE,
    launch_site     VARCHAR(150),
    country_code    CHAR(3),
    operator        VARCHAR(200),
    owner           VARCHAR(200),
    mass_kg         NUMERIC(12,2),
    cross_section_m2 NUMERIC(10,4),
    orbit_class     VARCHAR(50)
        CHECK (orbit_class IN ('LEO','MEO','GEO','HEO','SSO','MOLNIYA','OTHER',NULL)),
    status          VARCHAR(50)     DEFAULT 'UNKNOWN'
        CHECK (status IN ('ACTIVE','INACTIVE','DECAYED','FUTURE','UNKNOWN')),
    purpose         VARCHAR(200),
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_so_norad       ON catalog.space_object (norad_id);
CREATE INDEX idx_so_type        ON catalog.space_object (object_type);
CREATE INDEX idx_so_status      ON catalog.space_object (status);
CREATE INDEX idx_so_orbit_class ON catalog.space_object (orbit_class);
CREATE INDEX idx_so_country     ON catalog.space_object (country_code);
CREATE INDEX idx_so_name_trgm   ON catalog.space_object USING gin (name gin_trgm_ops);
CREATE INDEX idx_so_metadata    ON catalog.space_object USING gin (metadata);
CREATE INDEX idx_so_operator    ON catalog.space_object (operator_id);
CREATE INDEX idx_so_launch      ON catalog.space_object (launch_id);

-- 5. Mission
CREATE TABLE catalog.mission (
    mission_id      BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    description     TEXT,
    operator_id     BIGINT          REFERENCES catalog.operator(operator_id),
    operator        VARCHAR(200),
    launch_date     DATE,
    end_date        DATE,
    status          VARCHAR(50)     DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','FAILED')),
    metadata        JSONB           DEFAULT '{}',
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_mi_operator ON catalog.mission (operator_id);

-- 6. MissionObject: associative entity (many-to-many)
CREATE TABLE catalog.mission_object (
    mission_id  BIGINT  NOT NULL REFERENCES catalog.mission(mission_id) ON DELETE CASCADE,
    object_id   BIGINT  NOT NULL REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    role        VARCHAR(50)  DEFAULT 'PRIMARY',
    PRIMARY KEY (mission_id, object_id)
);

-- ════════════════════════════════════════════════════════════
-- TRACKING schema
-- ════════════════════════════════════════════════════════════

-- 7. GroundStation
CREATE TABLE tracking.ground_station (
    station_id          SERIAL          PRIMARY KEY,
    name                VARCHAR(200)    NOT NULL,
    location            GEOMETRY(PointZ, 4326) NOT NULL,
    country_code        CHAR(3),
    operator_id         BIGINT          REFERENCES catalog.operator(operator_id),
    operator            VARCHAR(200),
    station_type        VARCHAR(50)
        CHECK (station_type IN ('RADAR','OPTICAL','LASER','COMMS','MULTI',NULL)),
    frequency_bands     JSONB           DEFAULT '[]',
    antenna_diameter_m  NUMERIC(6,2),
    min_elevation_deg   NUMERIC(5,2)    DEFAULT 5.0,
    capabilities        JSONB           DEFAULT '{}',
    is_active           BOOLEAN         DEFAULT TRUE,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_gs_location ON tracking.ground_station USING gist (location);
CREATE INDEX idx_gs_operator ON tracking.ground_station (operator_id);

-- 8. OrbitState: core tracking table
CREATE TABLE tracking.orbit_state (
    state_id                BIGSERIAL,
    object_id               BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    epoch                   TIMESTAMPTZ     NOT NULL,
    position_x_km           DOUBLE PRECISION,
    position_y_km           DOUBLE PRECISION,
    position_z_km           DOUBLE PRECISION,
    velocity_x_km_s         DOUBLE PRECISION,
    velocity_y_km_s         DOUBLE PRECISION,
    velocity_z_km_s         DOUBLE PRECISION,
    reference_frame         VARCHAR(10)     DEFAULT 'TEME'
        CHECK (reference_frame IN ('TEME','J2000','ECEF','ITRF')),
    position_geom           GEOMETRY(PointZ, 4978),
    semimajor_axis_km       DOUBLE PRECISION,
    eccentricity            DOUBLE PRECISION,
    inclination_deg         DOUBLE PRECISION,
    raan_deg                DOUBLE PRECISION,
    arg_perigee_deg         DOUBLE PRECISION,
    true_anomaly_deg        DOUBLE PRECISION,
    mean_anomaly_deg        DOUBLE PRECISION,
    mean_motion_rev_day     DOUBLE PRECISION,
    period_minutes          DOUBLE PRECISION,
    apoapsis_km             DOUBLE PRECISION,
    periapsis_km            DOUBLE PRECISION,
    tle_line1               TEXT,
    tle_line2               TEXT,
    covariance_matrix       JSONB,
    source                  VARCHAR(30)     DEFAULT 'TLE'
        CHECK (source IN ('TLE','RADAR','OPTICAL','GPS','PROPAGATED','MANEUVER')),
    created_at              TIMESTAMPTZ     DEFAULT NOW(),
    PRIMARY KEY (state_id, epoch)
);

DO $$ BEGIN
    PERFORM create_hypertable('tracking.orbit_state', 'epoch',
        chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB not available, orbit_state remains a regular table';
END; $$;

CREATE INDEX idx_os_object_epoch   ON tracking.orbit_state (object_id, epoch DESC);
CREATE INDEX idx_os_position_geom  ON tracking.orbit_state USING gist (position_geom);
CREATE INDEX idx_os_source         ON tracking.orbit_state (source);

-- 9. TrackingObservation: raw sensor data from ground stations
CREATE TABLE tracking.tracking_observation (
    observation_id      BIGSERIAL       PRIMARY KEY,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    station_id          INTEGER         NOT NULL
        REFERENCES tracking.ground_station(station_id),
    observation_time    TIMESTAMPTZ     NOT NULL,
    observation_type    VARCHAR(30)
        CHECK (observation_type IN ('RADAR','OPTICAL','LASER_RANGING','RF','PASSIVE_RF')),
    azimuth_deg         DOUBLE PRECISION,
    elevation_deg       DOUBLE PRECISION,
    range_km            DOUBLE PRECISION,
    range_rate_km_s     DOUBLE PRECISION,
    signal_to_noise     DOUBLE PRECISION,
    right_ascension_deg DOUBLE PRECISION,
    declination_deg     DOUBLE PRECISION,
    visual_magnitude    DOUBLE PRECISION,
    quality_flag        VARCHAR(20)     DEFAULT 'GOOD'
        CHECK (quality_flag IN ('GOOD','DEGRADED','POOR','INVALID')),
    raw_data            JSONB,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_to_object  ON tracking.tracking_observation (object_id, observation_time DESC);
CREATE INDEX idx_to_station ON tracking.tracking_observation (station_id, observation_time DESC);
CREATE INDEX idx_to_type    ON tracking.tracking_observation (observation_type);

-- 10. PropagationResult: predicted future orbital states
CREATE TABLE tracking.propagation_result (
    propagation_id      BIGSERIAL       PRIMARY KEY,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    source_epoch        TIMESTAMPTZ     NOT NULL,
    target_epoch        TIMESTAMPTZ     NOT NULL,
    method              VARCHAR(30)     DEFAULT 'SGP4'
        CHECK (method IN ('SGP4','SGP4_XP','NUMERICAL','ANALYTICAL','COWELL')),
    position_x_km       DOUBLE PRECISION,
    position_y_km       DOUBLE PRECISION,
    position_z_km       DOUBLE PRECISION,
    velocity_x_km_s     DOUBLE PRECISION,
    velocity_y_km_s     DOUBLE PRECISION,
    velocity_z_km_s     DOUBLE PRECISION,
    position_geom       GEOMETRY(PointZ, 4978),
    covariance_matrix   JSONB,
    drag_coefficient    DOUBLE PRECISION,
    solar_radiation_pressure DOUBLE PRECISION,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_pr_object ON tracking.propagation_result (object_id, target_epoch DESC);
CREATE INDEX idx_pr_target ON tracking.propagation_result (target_epoch);
CREATE INDEX idx_pr_geom   ON tracking.propagation_result USING gist (position_geom);

-- ════════════════════════════════════════════════════════════
-- TELEMETRY schema
-- ════════════════════════════════════════════════════════════

-- 11. SatelliteTelemetry
CREATE TABLE telemetry.satellite_telemetry (
    telemetry_id        BIGSERIAL,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    ts                  TIMESTAMPTZ     NOT NULL,
    subsystem           VARCHAR(50)     NOT NULL
        CHECK (subsystem IN (
            'EPS','ADCS','COMMS','THERMAL','PROPULSION','PAYLOAD','OBC','OTHER'
        )),
    parameter_name      VARCHAR(120)    NOT NULL,
    value               DOUBLE PRECISION,
    unit                VARCHAR(30),
    quality             VARCHAR(20)     DEFAULT 'NOMINAL'
        CHECK (quality IN ('NOMINAL','WARNING','CRITICAL','STALE','UNKNOWN')),
    raw_data            JSONB,
    PRIMARY KEY (telemetry_id, ts)
);

DO $$ BEGIN
    PERFORM create_hypertable('telemetry.satellite_telemetry', 'ts',
        chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB not available, satellite_telemetry remains a regular table';
END; $$;

CREATE INDEX idx_telem_object_ts     ON telemetry.satellite_telemetry (object_id, ts DESC);
CREATE INDEX idx_telem_subsystem     ON telemetry.satellite_telemetry (subsystem);
CREATE INDEX idx_telem_parameter     ON telemetry.satellite_telemetry (parameter_name);
CREATE INDEX idx_telem_quality       ON telemetry.satellite_telemetry (quality);

-- ════════════════════════════════════════════════════════════
-- ANALYTICS schema
-- ════════════════════════════════════════════════════════════

-- 12. ConjunctionEvent
CREATE TABLE analytics.conjunction_event (
    conjunction_id              BIGSERIAL       PRIMARY KEY,
    primary_object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    secondary_object_id         BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    time_of_closest_approach    TIMESTAMPTZ     NOT NULL,
    miss_distance_km            DOUBLE PRECISION,
    miss_distance_radial_km     DOUBLE PRECISION,
    miss_distance_in_track_km   DOUBLE PRECISION,
    miss_distance_cross_track_km DOUBLE PRECISION,
    collision_probability       DOUBLE PRECISION,
    relative_velocity_km_s      DOUBLE PRECISION,
    combined_hard_body_radius_m DOUBLE PRECISION,
    covariance_primary          JSONB,
    covariance_secondary        JSONB,
    cdm_id                      VARCHAR(100),
    cdm_data                    JSONB,
    risk_level                  VARCHAR(20)     DEFAULT 'LOW'
        CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL','RED')),
    status                      VARCHAR(30)     DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','SCREENING','ANALYZED','MITIGATED','EXPIRED','FALSE_ALARM')),
    recommended_action          TEXT,
    created_at                  TIMESTAMPTZ     DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_ce_tca          ON analytics.conjunction_event (time_of_closest_approach);
CREATE INDEX idx_ce_risk         ON analytics.conjunction_event (risk_level);
CREATE INDEX idx_ce_probability  ON analytics.conjunction_event (collision_probability DESC);
CREATE INDEX idx_ce_objects      ON analytics.conjunction_event (primary_object_id, secondary_object_id);
CREATE INDEX idx_ce_status       ON analytics.conjunction_event (status);

-- 13. SpaceWeather
CREATE TABLE analytics.space_weather (
    weather_id              BIGSERIAL,
    ts                      TIMESTAMPTZ     NOT NULL,
    solar_flux_f10_7        DOUBLE PRECISION,
    kp_index                DOUBLE PRECISION,
    ap_index                INTEGER,
    dst_index               INTEGER,
    bz_gsm_nt               DOUBLE PRECISION,
    proton_density_cm3      DOUBLE PRECISION,
    solar_wind_speed_km_s   DOUBLE PRECISION,
    proton_flux             DOUBLE PRECISION,
    electron_flux           DOUBLE PRECISION,
    geomagnetic_storm_level VARCHAR(10),
    solar_flare_class       VARCHAR(10),
    data_source             VARCHAR(60),
    is_forecast             BOOLEAN         DEFAULT FALSE,
    created_at              TIMESTAMPTZ     DEFAULT NOW(),
    PRIMARY KEY (weather_id, ts)
);

DO $$ BEGIN
    PERFORM create_hypertable('analytics.space_weather', 'ts',
        chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB not available, space_weather remains a regular table';
END; $$;

CREATE INDEX idx_sw_ts ON analytics.space_weather (ts DESC);

-- 14. ManeuverLog
CREATE TABLE analytics.maneuver_log (
    maneuver_id     BIGSERIAL       PRIMARY KEY,
    object_id       BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    conjunction_id  BIGINT          REFERENCES analytics.conjunction_event(conjunction_id),
    planned_time    TIMESTAMPTZ     NOT NULL,
    executed_time   TIMESTAMPTZ,
    delta_v_m_s     DOUBLE PRECISION,
    direction       JSONB,
    status          VARCHAR(30)     DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED','APPROVED','EXECUTING','COMPLETED','CANCELLED','FAILED')),
    notes           TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_ml_object   ON analytics.maneuver_log (object_id);
CREATE INDEX idx_ml_time     ON analytics.maneuver_log (planned_time);

-- 15. BreakupEvent: on-orbit fragmentation events
CREATE TABLE analytics.breakup_event (
    breakup_id          BIGSERIAL       PRIMARY KEY,
    parent_object_id    BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    event_time          TIMESTAMPTZ     NOT NULL,
    event_type          VARCHAR(30)     NOT NULL
        CHECK (event_type IN ('COLLISION','EXPLOSION','DELIBERATE','ANOMALOUS','UNKNOWN')),
    altitude_km         DOUBLE PRECISION,
    fragment_count      INTEGER,
    debris_cloud_desc   TEXT,
    is_confirmed        BOOLEAN         DEFAULT FALSE,
    source              VARCHAR(100),
    notes               TEXT,
    metadata            JSONB           DEFAULT '{}',
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_be_parent ON analytics.breakup_event (parent_object_id);
CREATE INDEX idx_be_time   ON analytics.breakup_event (event_time DESC);
CREATE INDEX idx_be_type   ON analytics.breakup_event (event_type);

-- 16. ReentryEvent: atmospheric reentry predictions and records
CREATE TABLE analytics.reentry_event (
    reentry_id          BIGSERIAL       PRIMARY KEY,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    predicted_time      TIMESTAMPTZ,
    actual_time         TIMESTAMPTZ,
    predicted_lat       DOUBLE PRECISION,
    predicted_lon       DOUBLE PRECISION,
    actual_lat          DOUBLE PRECISION,
    actual_lon          DOUBLE PRECISION,
    is_controlled       BOOLEAN         DEFAULT FALSE,
    risk_level          VARCHAR(20)     DEFAULT 'LOW'
        CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    surviving_mass_kg   DOUBLE PRECISION,
    casualty_area_m2    DOUBLE PRECISION,
    status              VARCHAR(30)     DEFAULT 'PREDICTED'
        CHECK (status IN ('PREDICTED','IMMINENT','CONFIRMED','FALSE_ALARM')),
    source              VARCHAR(100),
    notes               TEXT,
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_re_object ON analytics.reentry_event (object_id);
CREATE INDEX idx_re_time   ON analytics.reentry_event (predicted_time DESC);
CREATE INDEX idx_re_status ON analytics.reentry_event (status);

-- ════════════════════════════════════════════════════════════
-- ML schema  (machine-learning predictions & alerts)
-- ════════════════════════════════════════════════════════════

-- 17. AnomalyAlert: LSTM autoencoder anomaly detections
CREATE TABLE ml.anomaly_alert (
    alert_id            BIGSERIAL       PRIMARY KEY,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    detected_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    subsystem           VARCHAR(50)     NOT NULL
        CHECK (subsystem IN ('EPS','ADCS','COMMS','THERMAL','PROPULSION','PAYLOAD','OBC','OTHER')),
    anomaly_type        VARCHAR(50)     NOT NULL
        CHECK (anomaly_type IN (
            'TELEMETRY_DEVIATION','ORBIT_DEVIATION','SIGNAL_LOSS',
            'ATTITUDE_ERROR','POWER_DROP','THERMAL_EXCURSION','OTHER'
        )),
    severity            VARCHAR(20)     DEFAULT 'WARNING'
        CHECK (severity IN ('INFO','WARNING','CRITICAL')),
    anomaly_score       DOUBLE PRECISION,
    threshold_used      DOUBLE PRECISION,
    model_version       VARCHAR(50),
    description         TEXT,
    window_start        TIMESTAMPTZ,
    window_end          TIMESTAMPTZ,
    is_acknowledged     BOOLEAN         DEFAULT FALSE,
    acknowledged_by     VARCHAR(100),
    resolution_notes    TEXT,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_aa_object    ON ml.anomaly_alert (object_id);
CREATE INDEX idx_aa_time      ON ml.anomaly_alert (detected_at DESC);
CREATE INDEX idx_aa_severity  ON ml.anomaly_alert (severity);
CREATE INDEX idx_aa_subsystem ON ml.anomaly_alert (subsystem);
CREATE INDEX idx_aa_type      ON ml.anomaly_alert (anomaly_type);

-- 18. DebrisClassification: ML object type predictions
CREATE TABLE ml.debris_classification (
    classification_id   BIGSERIAL       PRIMARY KEY,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    predicted_type      VARCHAR(50)     NOT NULL
        CHECK (predicted_type IN ('SATELLITE','DEBRIS','ROCKET_BODY','UNKNOWN')),
    confidence          DOUBLE PRECISION,
    model_version       VARCHAR(50),
    features_used       JSONB,
    classified_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    true_label          VARCHAR(50),
    is_verified         BOOLEAN         DEFAULT FALSE,
    created_at          TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_dc_object     ON ml.debris_classification (object_id);
CREATE INDEX idx_dc_type       ON ml.debris_classification (predicted_type);
CREATE INDEX idx_dc_time       ON ml.debris_classification (classified_at DESC);
CREATE INDEX idx_dc_confidence ON ml.debris_classification (confidence DESC);

-- 19. CongestionReport: orbital traffic density analysis
CREATE TABLE ml.congestion_report (
    report_id               BIGSERIAL       PRIMARY KEY,
    analysis_time           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    altitude_min_km         DOUBLE PRECISION NOT NULL,
    altitude_max_km         DOUBLE PRECISION NOT NULL,
    inclination_min_deg     DOUBLE PRECISION,
    inclination_max_deg     DOUBLE PRECISION,
    object_count            INTEGER         NOT NULL,
    density_objects_per_km3 DOUBLE PRECISION,
    risk_score              DOUBLE PRECISION,
    trend                   VARCHAR(20)     DEFAULT 'STABLE'
        CHECK (trend IN ('INCREASING','STABLE','DECREASING')),
    cluster_count           INTEGER,
    model_version           VARCHAR(50),
    metadata                JSONB           DEFAULT '{}',
    created_at              TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_cr_time ON ml.congestion_report (analysis_time DESC);
CREATE INDEX idx_cr_alt  ON ml.congestion_report (altitude_min_km, altitude_max_km);
CREATE INDEX idx_cr_risk ON ml.congestion_report (risk_score DESC);

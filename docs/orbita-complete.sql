
-- ============================================================
-- ORBITA: Orbital Registry for Big Data, Intelligence,
--         and Traffic Analysis

-- ************************************************************
-- PART 1: DDL COMMANDS (Data Definition Language)
-- ************************************************************

CREATE DATABASE orbita_registry;

-- ────────────────────────────────────────────────────────────
-- 1.2 Extensions
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ────────────────────────────────────────────────────────────
-- 1.3 Schema Creation
-- ────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS catalog;     -- space object master data
CREATE SCHEMA IF NOT EXISTS tracking;    -- orbit states, ground stations
CREATE SCHEMA IF NOT EXISTS telemetry;   -- satellite health time-series
CREATE SCHEMA IF NOT EXISTS analytics;   -- conjunction events, space weather, maneuvers


-- ────────────────────────────────────────────────────────────
-- 1.4 Table Creation
-- ────────────────────────────────────────────────────────────

-- TABLE 1: SpaceObject — central entity
CREATE TABLE catalog.space_object (
    object_id        BIGSERIAL       PRIMARY KEY,
    norad_id         INTEGER         UNIQUE,
    cospar_id        VARCHAR(20)     UNIQUE,
    name             VARCHAR(200)    NOT NULL,
    object_type      VARCHAR(50)     NOT NULL
        CHECK (object_type IN ('SATELLITE','DEBRIS','ROCKET_BODY','UNKNOWN')),
    launch_date      DATE,
    decay_date       DATE,
    launch_site      VARCHAR(150),
    country_code     CHAR(3),
    operator         VARCHAR(200),
    owner            VARCHAR(200),
    mass_kg          NUMERIC(12,2),
    cross_section_m2 NUMERIC(10,4),
    orbit_class      VARCHAR(50)
        CHECK (orbit_class IN ('LEO','MEO','GEO','HEO','SSO','MOLNIYA','OTHER',NULL)),
    status           VARCHAR(50)     DEFAULT 'UNKNOWN'
        CHECK (status IN ('ACTIVE','INACTIVE','DECAYED','FUTURE','UNKNOWN')),
    purpose          VARCHAR(200),
    metadata         JSONB           DEFAULT '{}',
    created_at       TIMESTAMPTZ     DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_so_norad       ON catalog.space_object (norad_id);
CREATE INDEX idx_so_type        ON catalog.space_object (object_type);
CREATE INDEX idx_so_status      ON catalog.space_object (status);
CREATE INDEX idx_so_orbit_class ON catalog.space_object (orbit_class);
CREATE INDEX idx_so_country     ON catalog.space_object (country_code);
CREATE INDEX idx_so_name_trgm   ON catalog.space_object USING gin (name gin_trgm_ops);
CREATE INDEX idx_so_metadata    ON catalog.space_object USING gin (metadata);


-- TABLE 2: Mission
CREATE TABLE catalog.mission (
    mission_id       BIGSERIAL       PRIMARY KEY,
    name             VARCHAR(200)    NOT NULL,
    description      TEXT,
    operator         VARCHAR(200),
    launch_date      DATE,
    end_date         DATE,
    status           VARCHAR(50)     DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','FAILED')),
    metadata         JSONB           DEFAULT '{}',
    created_at       TIMESTAMPTZ     DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     DEFAULT NOW()
);


-- TABLE 3: MissionObject — associative entity (M:N bridge)
CREATE TABLE catalog.mission_object (
    mission_id  BIGINT  NOT NULL
        REFERENCES catalog.mission(mission_id) ON DELETE CASCADE,
    object_id   BIGINT  NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    role        VARCHAR(50)  DEFAULT 'PRIMARY',
    PRIMARY KEY (mission_id, object_id)
);


-- TABLE 4: OrbitState — temporal orbit tracking
CREATE TABLE tracking.orbit_state (
    state_id            BIGSERIAL,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    epoch               TIMESTAMPTZ     NOT NULL,
    position_x_km       DOUBLE PRECISION,
    position_y_km       DOUBLE PRECISION,
    position_z_km       DOUBLE PRECISION,
    velocity_x_km_s     DOUBLE PRECISION,
    velocity_y_km_s     DOUBLE PRECISION,
    velocity_z_km_s     DOUBLE PRECISION,
    reference_frame     VARCHAR(10)     DEFAULT 'TEME'
        CHECK (reference_frame IN ('TEME','J2000','ECEF','ITRF')),
    position_geom       GEOMETRY(PointZ, 4978),
    semimajor_axis_km   DOUBLE PRECISION,
    eccentricity        DOUBLE PRECISION,
    inclination_deg     DOUBLE PRECISION,
    raan_deg            DOUBLE PRECISION,
    arg_perigee_deg     DOUBLE PRECISION,
    true_anomaly_deg    DOUBLE PRECISION,
    mean_anomaly_deg    DOUBLE PRECISION,
    mean_motion_rev_day DOUBLE PRECISION,
    period_minutes      DOUBLE PRECISION,
    apoapsis_km         DOUBLE PRECISION,
    periapsis_km        DOUBLE PRECISION,
    tle_line1           TEXT,
    tle_line2           TEXT,
    covariance_matrix   JSONB,
    source              VARCHAR(30)     DEFAULT 'TLE'
        CHECK (source IN ('TLE','RADAR','OPTICAL','GPS','PROPAGATED','MANEUVER')),
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    PRIMARY KEY (state_id, epoch)
);

CREATE INDEX idx_os_object_epoch  ON tracking.orbit_state (object_id, epoch DESC);
CREATE INDEX idx_os_position_geom ON tracking.orbit_state USING gist (position_geom);
CREATE INDEX idx_os_source        ON tracking.orbit_state (source);


-- TABLE 5: GroundStation
CREATE TABLE tracking.ground_station (
    station_id          SERIAL          PRIMARY KEY,
    name                VARCHAR(200)    NOT NULL,
    location            GEOMETRY(PointZ, 4326) NOT NULL,
    country_code        CHAR(3),
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


-- TABLE 6: SatelliteTelemetry — time-series health data
CREATE TABLE telemetry.satellite_telemetry (
    telemetry_id        BIGSERIAL,
    object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    ts                  TIMESTAMPTZ     NOT NULL,
    subsystem           VARCHAR(50)     NOT NULL
        CHECK (subsystem IN ('EPS','ADCS','COMMS','THERMAL','PROPULSION','PAYLOAD','OBC','OTHER')),
    parameter_name      VARCHAR(120)    NOT NULL,
    value               DOUBLE PRECISION,
    unit                VARCHAR(30),
    quality             VARCHAR(20)     DEFAULT 'NOMINAL'
        CHECK (quality IN ('NOMINAL','WARNING','CRITICAL','STALE','UNKNOWN')),
    raw_data            JSONB,
    PRIMARY KEY (telemetry_id, ts)
);

CREATE INDEX idx_telem_object_ts ON telemetry.satellite_telemetry (object_id, ts DESC);
CREATE INDEX idx_telem_subsystem ON telemetry.satellite_telemetry (subsystem);
CREATE INDEX idx_telem_quality   ON telemetry.satellite_telemetry (quality);


-- TABLE 7: ConjunctionEvent — collision risk assessment
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

CREATE INDEX idx_ce_tca         ON analytics.conjunction_event (time_of_closest_approach);
CREATE INDEX idx_ce_risk        ON analytics.conjunction_event (risk_level);
CREATE INDEX idx_ce_probability ON analytics.conjunction_event (collision_probability DESC);
CREATE INDEX idx_ce_status      ON analytics.conjunction_event (status);


-- TABLE 8: SpaceWeather — solar and geomagnetic conditions
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

CREATE INDEX idx_sw_ts ON analytics.space_weather (ts DESC);


-- TABLE 9: ManeuverLog — orbital maneuver records
CREATE TABLE analytics.maneuver_log (
    maneuver_id     BIGSERIAL       PRIMARY KEY,
    object_id       BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    conjunction_id  BIGINT
        REFERENCES analytics.conjunction_event(conjunction_id),
    planned_time    TIMESTAMPTZ     NOT NULL,
    executed_time   TIMESTAMPTZ,
    delta_v_m_s     DOUBLE PRECISION,
    direction       JSONB,
    status          VARCHAR(30)     DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED','APPROVED','EXECUTING','COMPLETED','CANCELLED','FAILED')),
    notes           TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_ml_object ON analytics.maneuver_log (object_id);
CREATE INDEX idx_ml_time   ON analytics.maneuver_log (planned_time);


-- ────────────────────────────────────────────────────────────
-- 1.5 Trigger Functions
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION catalog.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_space_object_updated
    BEFORE UPDATE ON catalog.space_object
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

CREATE TRIGGER trg_mission_updated
    BEFORE UPDATE ON catalog.mission
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

CREATE TRIGGER trg_conjunction_updated
    BEFORE UPDATE ON analytics.conjunction_event
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

-- Auto-compute PostGIS geometry from Cartesian coordinates
CREATE OR REPLACE FUNCTION tracking.fn_set_position_geom()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.position_x_km IS NOT NULL
       AND NEW.position_y_km IS NOT NULL
       AND NEW.position_z_km IS NOT NULL THEN
        NEW.position_geom := ST_SetSRID(
            ST_MakePoint(NEW.position_x_km, NEW.position_y_km, NEW.position_z_km),
            4978
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orbit_state_geom
    BEFORE INSERT OR UPDATE ON tracking.orbit_state
    FOR EACH ROW EXECUTE FUNCTION tracking.fn_set_position_geom();

-- Auto-compute apoapsis and periapsis from orbital elements
CREATE OR REPLACE FUNCTION tracking.fn_compute_apsides()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    earth_radius CONSTANT DOUBLE PRECISION := 6371.0;
BEGIN
    IF NEW.semimajor_axis_km IS NOT NULL AND NEW.eccentricity IS NOT NULL THEN
        NEW.apoapsis_km  := NEW.semimajor_axis_km * (1 + NEW.eccentricity) - earth_radius;
        NEW.periapsis_km := NEW.semimajor_axis_km * (1 - NEW.eccentricity) - earth_radius;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orbit_state_apsides
    BEFORE INSERT OR UPDATE ON tracking.orbit_state
    FOR EACH ROW EXECUTE FUNCTION tracking.fn_compute_apsides();


-- ************************************************************
-- PART 2: DML COMMANDS (Data Manipulation Language)
-- ************************************************************


-- ────────────────────────────────────────────────────────────
-- 2.1 INSERT — Space Objects (15 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO catalog.space_object
    (norad_id, cospar_id, name, object_type, launch_date, country_code,
     operator, owner, mass_kg, cross_section_m2, orbit_class, status, purpose)
VALUES
    (25544, '1998-067A', 'ISS (ZARYA)',               'SATELLITE',   '1998-11-20', 'ISS',
     'NASA/Roscosmos/ESA/JAXA/CSA', 'Multi-National', 420000.00, 2500.0000, 'LEO', 'ACTIVE', 'Space Station'),
    (20580, '1990-037B', 'HST (HUBBLE)',              'SATELLITE',   '1990-04-24', 'USA',
     'NASA/ESA', 'NASA', 11110.00, 60.0000, 'LEO', 'ACTIVE', 'Astronomy'),
    (48274, '2021-036V', 'STARLINK-2636',             'SATELLITE',   '2021-04-29', 'USA',
     'SpaceX', 'SpaceX', 260.00, 22.5000, 'LEO', 'ACTIVE', 'Communications'),
    (48275, '2021-036W', 'STARLINK-2637',             'SATELLITE',   '2021-04-29', 'USA',
     'SpaceX', 'SpaceX', 260.00, 22.5000, 'LEO', 'ACTIVE', 'Communications'),
    (43226, '2018-029A', 'SENTINEL-3B',               'SATELLITE',   '2018-04-25', 'EUR',
     'ESA/EUMETSAT', 'ESA', 1250.00, 12.0000, 'SSO', 'ACTIVE', 'Earth Observation'),
    (49260, '2021-088A', 'JAMES WEBB SPACE TELESCOPE','SATELLITE',   '2021-12-25', 'USA',
     'NASA/ESA/CSA', 'NASA', 6161.40, 85.0000, 'HEO', 'ACTIVE', 'Astronomy'),
    (55909, '2023-028A', 'CHANDRAYAAN-3 MODULE',      'SATELLITE',   '2023-07-14', 'IND',
     'ISRO', 'ISRO', 3900.00, 15.0000, 'HEO', 'ACTIVE', 'Lunar Exploration'),
    (27424, '2002-022A', 'AQUA',                      'SATELLITE',   '2002-05-04', 'USA',
     'NASA', 'NASA', 2934.00, 30.0000, 'SSO', 'ACTIVE', 'Earth Science'),
    (37348, '2011-002A', 'ELEKTRO-L 1',               'SATELLITE',   '2011-01-20', 'RUS',
     'Roscosmos', 'Roscosmos', 1620.00, 18.0000, 'GEO', 'ACTIVE', 'Meteorology'),
    (25994, '1999-025A', 'TERRA',                     'SATELLITE',   '1999-12-18', 'USA',
     'NASA', 'NASA', 5190.00, 35.0000, 'SSO', 'ACTIVE', 'Earth Science'),
    (13552, '1982-092C', 'COSMOS 1408 DEB',           'DEBRIS',      NULL,          'RUS',
     NULL, NULL, NULL, 0.1000, 'LEO', 'INACTIVE', NULL),
    (48078, '2021-016B', 'CZ-5B R/B',                 'ROCKET_BODY', '2021-04-29', 'CHN',
     'CASC', 'CASC', 21000.00, 15.0000, 'LEO', 'INACTIVE', NULL),
    (40258, '2014-055B', 'BREEZE-M DEB',              'DEBRIS',      NULL,          'RUS',
     NULL, NULL, NULL, 0.3000, 'HEO', 'INACTIVE', NULL),
    (26405, '2000-045B', 'TITAN 4B R/B',              'ROCKET_BODY', '2000-08-17', 'USA',
     'Lockheed Martin', 'USAF', 3500.00, 12.0000, 'GEO', 'INACTIVE', NULL),
    (43772, '2018-092B', 'FENGYUN 1C DEB',            'DEBRIS',      NULL,          'CHN',
     NULL, NULL, NULL, 0.0500, 'LEO', 'INACTIVE', NULL);


-- ────────────────────────────────────────────────────────────
-- 2.2 INSERT — Missions (3 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO catalog.mission
    (name, description, operator, launch_date, status)
VALUES
    ('ISS Operations',   'International Space Station continuous crewed operations',
     'NASA/Roscosmos/ESA/JAXA/CSA', '1998-11-20', 'ACTIVE'),
    ('Hubble Servicing', 'Hubble Space Telescope observation mission',
     'NASA/ESA', '1990-04-24', 'ACTIVE'),
    ('Starlink Gen2',    'SpaceX broadband constellation deployment — phase 2',
     'SpaceX', '2019-05-24', 'ACTIVE');


-- ────────────────────────────────────────────────────────────
-- 2.3 INSERT — MissionObject (4 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO catalog.mission_object (mission_id, object_id, role)
VALUES
    (1, 1, 'PRIMARY'),      -- ISS → ISS Operations
    (2, 2, 'PRIMARY'),      -- Hubble → Hubble Servicing
    (3, 3, 'PRIMARY'),      -- Starlink-2636 → Starlink Gen2
    (3, 4, 'SECONDARY');    -- Starlink-2637 → Starlink Gen2


-- ────────────────────────────────────────────────────────────
-- 2.4 INSERT — OrbitState (4 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO tracking.orbit_state
    (object_id, epoch, position_x_km, position_y_km, position_z_km,
     velocity_x_km_s, velocity_y_km_s, velocity_z_km_s,
     reference_frame, semimajor_axis_km, eccentricity, inclination_deg,
     raan_deg, arg_perigee_deg, mean_anomaly_deg, mean_motion_rev_day,
     period_minutes, source)
VALUES
    (1, '2026-02-09 00:00:00+00', -2497.638, 4801.225, 3757.948,
     -5.547, -3.874, 3.186, 'TEME', 6793.5, 0.0003456, 51.6420,
     127.5432, 45.2310, 315.4200, 15.49, 92.95, 'TLE'),

    (1, '2026-02-08 12:00:00+00', 4122.890, -2801.445, 4201.670,
     3.221, 5.887, -2.945, 'TEME', 6793.3, 0.0003410, 51.6418,
     127.3200, 44.9800, 180.1200, 15.49, 92.95, 'TLE'),

    (2, '2026-02-09 00:00:00+00', -5924.312, 1543.881, 2987.410,
     -2.134, -6.421, 3.112, 'TEME', 6917.2, 0.0002810, 28.4712,
     215.8900, 67.3400, 292.7800, 14.88, 96.73, 'TLE'),

    (3, '2026-02-09 00:00:00+00', 3200.112, -4100.881, 4320.550,
     5.102, 2.340, -4.870, 'TEME', 6921.0, 0.0001200, 53.0540,
     180.2300, 90.1200, 45.6700, 15.06, 95.59, 'TLE');


-- ────────────────────────────────────────────────────────────
-- 2.5 INSERT — GroundStation (8 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO tracking.ground_station
    (name, location, country_code, operator, station_type,
     antenna_diameter_m, min_elevation_deg)
VALUES
    ('Goldstone DSN',     ST_SetSRID(ST_MakePoint(-116.8895, 35.4257, 900), 4326),
     'USA', 'NASA/JPL',     'MULTI',   70.0, 6.0),
    ('Canberra DSN',      ST_SetSRID(ST_MakePoint(148.9819, -35.4014, 680), 4326),
     'AUS', 'CSIRO/NASA',   'MULTI',   70.0, 6.0),
    ('Madrid DSN',        ST_SetSRID(ST_MakePoint(-4.2488, 40.4314, 830), 4326),
     'ESP', 'INTA/NASA',    'MULTI',   70.0, 6.0),
    ('Cebreros ESA',      ST_SetSRID(ST_MakePoint(-4.3688, 40.4525, 794), 4326),
     'ESP', 'ESA',          'COMMS',   35.0, 5.0),
    ('Malargue ESA',      ST_SetSRID(ST_MakePoint(-69.3422, -35.7760, 1550), 4326),
     'ARG', 'ESA',          'COMMS',   35.0, 5.0),
    ('ISTRAC Bangalore',  ST_SetSRID(ST_MakePoint(77.5707, 13.0334, 920), 4326),
     'IND', 'ISRO',         'MULTI',   32.0, 5.0),
    ('Svalbard SvalSat',  ST_SetSRID(ST_MakePoint(15.4075, 78.2306, 500), 4326),
     'NOR', 'KSAT',         'MULTI',   13.0, 3.0),
    ('Poker Flat Alaska', ST_SetSRID(ST_MakePoint(-147.4300, 65.1200, 500), 4326),
     'USA', 'UAF/NASA',     'RADAR',   26.0, 5.0);


-- ────────────────────────────────────────────────────────────
-- 2.6 INSERT — SatelliteTelemetry (13 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO telemetry.satellite_telemetry
    (object_id, ts, subsystem, parameter_name, value, unit, quality)
VALUES
    (1, '2026-02-09 00:00:00+00', 'EPS',     'solar_array_voltage',   160.2,   'V',      'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'EPS',     'battery_charge',        92.4,    '%',      'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'THERMAL', 'cabin_temperature',     22.1,    'C',      'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'ADCS',    'attitude_roll',         0.0012,  'deg',    'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'ADCS',    'attitude_pitch',        -0.0034, 'deg',    'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'COMMS',   'downlink_signal_str',   -68.3,   'dBm',    'NOMINAL'),
    (1, '2026-02-09 00:05:00+00', 'EPS',     'solar_array_voltage',   159.8,   'V',      'NOMINAL'),
    (1, '2026-02-09 00:05:00+00', 'EPS',     'battery_charge',        91.9,    '%',      'NOMINAL'),
    (1, '2026-02-09 00:05:00+00', 'THERMAL', 'cabin_temperature',     22.3,    'C',      'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'EPS',     'solar_array_current',   24.5,    'A',      'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'THERMAL', 'instrument_bay_temp',   20.3,    'C',      'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'PAYLOAD', 'wfc3_status',           1.0,     'bool',   'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'ADCS',    'pointing_error_arcsec', 0.007,   'arcsec', 'NOMINAL');


-- ────────────────────────────────────────────────────────────
-- 2.7 INSERT — ConjunctionEvent (3 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO analytics.conjunction_event
    (primary_object_id, secondary_object_id, time_of_closest_approach,
     miss_distance_km, collision_probability, relative_velocity_km_s,
     risk_level, status)
VALUES
    (1, 11, '2026-02-11 14:23:00+00', 0.85,  2.3e-4, 14.2,
     'HIGH',   'SCREENING'),
    (3, 12, '2026-02-13 08:15:00+00', 3.20,  5.1e-6, 10.8,
     'MEDIUM', 'PENDING'),
    (2, 15, '2026-02-15 22:00:00+00', 12.50, 1.2e-7, 7.5,
     'LOW',    'PENDING');


-- ────────────────────────────────────────────────────────────
-- 2.8 INSERT — SpaceWeather (3 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO analytics.space_weather
    (ts, solar_flux_f10_7, kp_index, ap_index, dst_index,
     solar_wind_speed_km_s, geomagnetic_storm_level, data_source, is_forecast)
VALUES
    ('2026-02-09 00:00:00+00', 148.2, 3.0, 15, -12,
     420.0, 'G0', 'NOAA_SWPC', FALSE),
    ('2026-02-08 21:00:00+00', 147.8, 2.7, 12, -8,
     405.0, 'G0', 'NOAA_SWPC', FALSE),
    ('2026-02-08 18:00:00+00', 150.1, 4.0, 22, -25,
     510.0, 'G1', 'NOAA_SWPC', FALSE);


-- ────────────────────────────────────────────────────────────
-- 2.9 INSERT — ManeuverLog (2 records)
-- ────────────────────────────────────────────────────────────

INSERT INTO analytics.maneuver_log
    (object_id, conjunction_id, planned_time, executed_time,
     delta_v_m_s, direction, status, notes)
VALUES
    (1, 1, '2026-02-11 10:00:00+00', NULL, 0.5,
     '{"radial": 0.0, "in_track": 0.5, "cross_track": 0.0}',
     'PLANNED',
     'Pre-emptive avoidance maneuver for ISS vs Cosmos 1408 debris conjunction'),
    (3, 2, '2026-02-13 04:00:00+00', NULL, 0.3,
     '{"radial": 0.0, "in_track": 0.3, "cross_track": 0.0}',
     'PLANNED',
     'Starlink-2636 altitude raise to avoid CZ-5B rocket body');


-- ************************************************************
-- PART 3: SUMMARY STATISTICS AFTER INSERTION
-- ************************************************************


-- ────────────────────────────────────────────────────────────
-- 3.1 Record Count Per Table
-- ────────────────────────────────────────────────────────────

SELECT 'catalog.space_object'        AS table_name, COUNT(*) AS record_count FROM catalog.space_object
UNION ALL
SELECT 'catalog.mission',                            COUNT(*) FROM catalog.mission
UNION ALL
SELECT 'catalog.mission_object',                     COUNT(*) FROM catalog.mission_object
UNION ALL
SELECT 'tracking.orbit_state',                       COUNT(*) FROM tracking.orbit_state
UNION ALL
SELECT 'tracking.ground_station',                    COUNT(*) FROM tracking.ground_station
UNION ALL
SELECT 'telemetry.satellite_telemetry',              COUNT(*) FROM telemetry.satellite_telemetry
UNION ALL
SELECT 'analytics.conjunction_event',                COUNT(*) FROM analytics.conjunction_event
UNION ALL
SELECT 'analytics.space_weather',                    COUNT(*) FROM analytics.space_weather
UNION ALL
SELECT 'analytics.maneuver_log',                     COUNT(*) FROM analytics.maneuver_log
ORDER BY table_name;

-- Expected output:
-- table_name                      | record_count
-- --------------------------------|-------------
-- analytics.conjunction_event     | 3
-- analytics.maneuver_log          | 2
-- analytics.space_weather         | 3
-- catalog.mission                 | 3
-- catalog.mission_object          | 4
-- catalog.space_object            | 15
-- telemetry.satellite_telemetry   | 13
-- tracking.ground_station         | 8
-- tracking.orbit_state            | 4


-- ────────────────────────────────────────────────────────────
-- 3.2 Space Objects by Type
-- ────────────────────────────────────────────────────────────

SELECT object_type, COUNT(*) AS count
FROM catalog.space_object
GROUP BY object_type
ORDER BY count DESC;

-- Expected output:
-- object_type  | count
-- -------------|------
-- SATELLITE    | 10
-- DEBRIS       | 3
-- ROCKET_BODY  | 2


-- ────────────────────────────────────────────────────────────
-- 3.3 Space Objects by Orbit Class
-- ────────────────────────────────────────────────────────────

SELECT orbit_class, COUNT(*) AS count
FROM catalog.space_object
GROUP BY orbit_class
ORDER BY count DESC;

-- Expected output:
-- orbit_class | count
-- ------------|------
-- LEO         | 7
-- HEO         | 3
-- SSO         | 3
-- GEO         | 2


-- ────────────────────────────────────────────────────────────
-- 3.4 Space Objects by Status
-- ────────────────────────────────────────────────────────────

SELECT status, COUNT(*) AS count
FROM catalog.space_object
GROUP BY status
ORDER BY count DESC;

-- Expected output:
-- status   | count
-- ---------|------
-- ACTIVE   | 10
-- INACTIVE | 5


-- ────────────────────────────────────────────────────────────
-- 3.5 Telemetry Distribution by Subsystem
-- ────────────────────────────────────────────────────────────

SELECT subsystem, COUNT(*) AS readings
FROM telemetry.satellite_telemetry
GROUP BY subsystem
ORDER BY readings DESC;

-- Expected output:
-- subsystem | readings
-- ----------|---------
-- EPS       | 5
-- THERMAL   | 3
-- ADCS      | 3
-- COMMS     | 1
-- PAYLOAD   | 1


-- ────────────────────────────────────────────────────────────
-- 3.6 Conjunction Events by Risk Level
-- ────────────────────────────────────────────────────────────

SELECT risk_level, COUNT(*) AS events
FROM analytics.conjunction_event
GROUP BY risk_level
ORDER BY
    CASE risk_level
        WHEN 'RED' THEN 1 WHEN 'CRITICAL' THEN 2 WHEN 'HIGH' THEN 3
        WHEN 'MEDIUM' THEN 4 WHEN 'LOW' THEN 5
    END;

-- Expected output:
-- risk_level | events
-- -----------|-------
-- HIGH       | 1
-- MEDIUM     | 1
-- LOW        | 1


-- ────────────────────────────────────────────────────────────
-- 3.7 Ground Stations by Type
-- ────────────────────────────────────────────────────────────

SELECT station_type, COUNT(*) AS stations
FROM tracking.ground_station
GROUP BY station_type
ORDER BY stations DESC;

-- Expected output:
-- station_type | stations
-- -------------|--------
-- MULTI        | 5
-- COMMS        | 2
-- RADAR        | 1


-- ────────────────────────────────────────────────────────────
-- 3.8 Orbit States per Object (Top 5)
-- ────────────────────────────────────────────────────────────

SELECT so.name, COUNT(os.*) AS orbit_states
FROM catalog.space_object so
LEFT JOIN tracking.orbit_state os ON so.object_id = os.object_id
GROUP BY so.name
HAVING COUNT(os.*) > 0
ORDER BY orbit_states DESC
LIMIT 5;

-- Expected output:
-- name            | orbit_states
-- ----------------|-------------
-- ISS (ZARYA)     | 2
-- HST (HUBBLE)    | 1
-- STARLINK-2636   | 1


-- ────────────────────────────────────────────────────────────
-- 3.9 Overall Database Summary
-- ────────────────────────────────────────────────────────────

SELECT
    (SELECT COUNT(*) FROM catalog.space_object)           AS total_objects,
    (SELECT COUNT(*) FROM catalog.space_object
     WHERE status = 'ACTIVE')                             AS active_objects,
    (SELECT COUNT(*) FROM catalog.mission)                AS total_missions,
    (SELECT COUNT(*) FROM tracking.orbit_state)           AS total_orbit_states,
    (SELECT COUNT(*) FROM tracking.ground_station)        AS total_stations,
    (SELECT COUNT(*) FROM telemetry.satellite_telemetry)  AS total_telemetry,
    (SELECT COUNT(*) FROM analytics.conjunction_event)    AS total_conjunctions,
    (SELECT COUNT(*) FROM analytics.conjunction_event
     WHERE risk_level IN ('HIGH','CRITICAL','RED'))       AS high_risk_conjunctions,
    (SELECT COUNT(*) FROM analytics.space_weather)        AS total_weather,
    (SELECT COUNT(*) FROM analytics.maneuver_log)         AS total_maneuvers;

-- Expected output:
-- total_objects | active_objects | total_missions | total_orbit_states | total_stations | total_telemetry | total_conjunctions | high_risk_conjunctions | total_weather | total_maneuvers
-- --------------|----------------|----------------|--------------------|--------------  |-----------------|--------------------|-----------------------|---------------|----------------
-- 15            | 10             | 3              | 4                  | 8              | 13              | 3                  | 1                     | 3             | 2


-- ============================================================
-- END OF FILE
-- ============================================================

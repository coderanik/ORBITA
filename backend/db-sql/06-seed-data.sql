-- ============================================================
-- 06 - Seed Data
-- ============================================================

SET search_path TO catalog, tracking, telemetry, analytics, ml, public;

-- ── Operators ──────────────────────────────────────────────
INSERT INTO catalog.operator
    (name, short_name, country_code, operator_type, website, founded_year, headquarters)
VALUES
    ('National Aeronautics and Space Administration', 'NASA',      'USA', 'GOVERNMENT',         'https://nasa.gov',         1958, 'Washington, D.C.'),
    ('SpaceX',                                        'SpaceX',    'USA', 'COMMERCIAL',          'https://spacex.com',       2002, 'Hawthorne, CA'),
    ('European Space Agency',                         'ESA',       'EUR', 'INTERGOVERNMENTAL',   'https://esa.int',          1975, 'Paris, France'),
    ('Indian Space Research Organisation',            'ISRO',      'IND', 'GOVERNMENT',          'https://isro.gov.in',      1969, 'Bangalore, India'),
    ('Roscosmos',                                     'Roscosmos', 'RUS', 'GOVERNMENT',          'https://roscosmos.ru',     1992, 'Moscow, Russia'),
    ('Japan Aerospace Exploration Agency',            'JAXA',      'JPN', 'GOVERNMENT',          'https://jaxa.jp',          2003, 'Tokyo, Japan'),
    ('China Aerospace Science and Technology Corp',   'CASC',      'CHN', 'GOVERNMENT',          NULL,                       1999, 'Beijing, China'),
    ('Kongsberg Satellite Services',                  'KSAT',      'NOR', 'COMMERCIAL',          'https://ksat.no',          2002, 'Tromsø, Norway'),
    ('Lockheed Martin',                               'LMT',       'USA', 'COMMERCIAL',          'https://lockheedmartin.com',1995,'Bethesda, MD'),
    ('Northrop Grumman',                              'NOC',       'USA', 'COMMERCIAL',          'https://northropgrumman.com',1994,'Falls Church, VA');

-- ── Launch Vehicles ────────────────────────────────────────
INSERT INTO catalog.launch_vehicle
    (name, family, variant, operator_id, country_code, num_stages, payload_leo_kg, payload_gto_kg, height_m, diameter_m, liftoff_mass_kg, status, maiden_flight)
VALUES
    ('Falcon 9 Block 5',  'Falcon',  'Block 5',  2, 'USA', 2, 22800, 8300,  70.00, 3.70, 549054, 'ACTIVE',  '2018-05-11'),
    ('Falcon Heavy',      'Falcon',  'Heavy',    2, 'USA', 3, 63800, 26700, 70.00, 3.70, 1420788,'ACTIVE',  '2018-02-06'),
    ('PSLV-XL',           'PSLV',    'XL',       4, 'IND', 4, 1750,  1425,  44.40, 2.80, 320000, 'ACTIVE',  '2008-04-28'),
    ('Proton-M',          'Proton',  'M/Briz-M', 5, 'RUS', 4, 23000, 6920,  58.20, 7.40, 705000, 'ACTIVE',  '2001-04-07'),
    ('Ariane 5 ECA',      'Ariane',  '5 ECA',    3, 'EUR', 2, 21000, 10500, 52.00, 5.40, 777000, 'RETIRED', '2002-12-11'),
    ('Soyuz-2.1b',        'Soyuz',   '2.1b',     5, 'RUS', 3, 8200,  3250,  46.30, 2.95, 312000, 'ACTIVE',  '2006-12-27'),
    ('Long March 5B',     'Long March','5B',      7, 'CHN', 2, 25000, NULL,  53.66, 5.00, 849000, 'ACTIVE',  '2020-05-05');

-- ── Launch Events ──────────────────────────────────────────
INSERT INTO catalog.launch_event
    (launch_date, vehicle_id, operator_id, launch_site, outcome, orbit_target, payload_count, flight_number)
VALUES
    ('1998-11-20 06:40:00+00', 4, 5, 'Baikonur Cosmodrome',        'SUCCESS', 'LEO', 1, 'Proton-K'),
    ('1990-04-24 12:33:51+00', NULL, 1, 'Kennedy Space Center LC-39B','SUCCESS','LEO', 1, 'STS-31'),
    ('2021-04-29 03:44:00+00', 1, 2, 'Kennedy Space Center LC-39A','SUCCESS', 'LEO', 60,'Falcon 9 B1060.7'),
    ('2021-12-25 12:20:00+00', 5, 3, 'Guiana Space Centre ELA-3',  'SUCCESS', 'HEO', 1, 'VA256'),
    ('2023-07-14 09:05:00+00', 3, 4, 'Satish Dhawan SDSC-SHAR',   'SUCCESS', 'HEO', 1, 'PSLV-C55'),
    ('2021-04-29 01:23:00+00', 7, 7, 'Wenchang LC-101',            'SUCCESS', 'LEO', 1, 'CZ-5B Y2');

-- ── Ground Stations ─────────────────────────────────────────
INSERT INTO tracking.ground_station
    (name, location, country_code, operator_id, operator, station_type, antenna_diameter_m, min_elevation_deg)
VALUES
    ('Goldstone DSN',       ST_SetSRID(ST_MakePoint(-116.8895, 35.4257, 900), 4326), 'USA', 1, 'NASA/JPL',     'MULTI',   70.0,  6.0),
    ('Canberra DSN',        ST_SetSRID(ST_MakePoint(148.9819, -35.4014, 680), 4326), 'AUS', 1, 'CSIRO/NASA',   'MULTI',   70.0,  6.0),
    ('Madrid DSN',          ST_SetSRID(ST_MakePoint(-4.2488, 40.4314, 830),   4326), 'ESP', 1, 'INTA/NASA',    'MULTI',   70.0,  6.0),
    ('Cebreros ESA',        ST_SetSRID(ST_MakePoint(-4.3688, 40.4525, 794),   4326), 'ESP', 3, 'ESA',          'COMMS',   35.0,  5.0),
    ('Malargue ESA',        ST_SetSRID(ST_MakePoint(-69.3422, -35.7760, 1550),4326), 'ARG', 3, 'ESA',          'COMMS',   35.0,  5.0),
    ('ISTRAC Bangalore',    ST_SetSRID(ST_MakePoint(77.5707, 13.0334, 920),   4326), 'IND', 4, 'ISRO',         'MULTI',   32.0,  5.0),
    ('Svalbard SvalSat',    ST_SetSRID(ST_MakePoint(15.4075, 78.2306, 500),   4326), 'NOR', 8, 'KSAT',         'MULTI',   13.0,  3.0),
    ('Poker Flat Alaska',   ST_SetSRID(ST_MakePoint(-147.4300, 65.1200, 500), 4326), 'USA', 1, 'UAF/NASA',     'RADAR',   26.0,  5.0);

-- ── Space Objects ───────────────────────────────────────────
INSERT INTO catalog.space_object
    (norad_id, cospar_id, name, object_type, operator_id, launch_id, launch_date, country_code, operator, orbit_class, status, mass_kg, purpose)
VALUES
    (25544, '1998-067A',  'ISS (ZARYA)',              'SATELLITE',   1, 1, '1998-11-20', 'ISS', 'NASA/Roscosmos/ESA/JAXA/CSA', 'LEO', 'ACTIVE', 420000,  'Space Station'),
    (20580, '1990-037B',  'HST (HUBBLE)',             'SATELLITE',   1, 2, '1990-04-24', 'USA', 'NASA/ESA',                     'LEO', 'ACTIVE', 11110,   'Astronomy'),
    (48274, '2021-036V',  'STARLINK-2636',            'SATELLITE',   2, 3, '2021-04-29', 'USA', 'SpaceX',                       'LEO', 'ACTIVE', 260,     'Communications'),
    (48275, '2021-036W',  'STARLINK-2637',            'SATELLITE',   2, 3, '2021-04-29', 'USA', 'SpaceX',                       'LEO', 'ACTIVE', 260,     'Communications'),
    (43226, '2018-029A',  'SENTINEL-3B',              'SATELLITE',   3, NULL,'2018-04-25','EUR', 'ESA/EUMETSAT',                 'SSO', 'ACTIVE', 1250,    'Earth Observation'),
    (49260, '2021-088A',  'JAMES WEBB SPACE TELESCOPE','SATELLITE',  1, 4, '2021-12-25', 'USA', 'NASA/ESA/CSA',                 'HEO', 'ACTIVE', 6161.4,  'Astronomy'),
    (55909, '2023-028A',  'CHANDRAYAAN-3 MODULE',     'SATELLITE',   4, 5, '2023-07-14', 'IND', 'ISRO',                         'HEO', 'ACTIVE', 3900,    'Lunar Exploration'),
    (27424, '2002-022A',  'AQUA',                     'SATELLITE',   1, NULL,'2002-05-04','USA', 'NASA',                         'SSO', 'ACTIVE', 2934,    'Earth Science'),
    (37348, '2011-002A',  'ELEKTRO-L 1',              'SATELLITE',   5, NULL,'2011-01-20','RUS', 'Roscosmos',                    'GEO', 'ACTIVE', 1620,    'Meteorology'),
    (25994, '1999-025A',  'TERRA',                    'SATELLITE',   1, NULL,'1999-12-18','USA', 'NASA',                         'SSO', 'ACTIVE', 5190,    'Earth Science'),
    (13552, '1982-092C',  'COSMOS 1408 DEB',          'DEBRIS',      NULL,NULL,NULL,      'RUS', NULL,                           'LEO', 'INACTIVE', NULL,   NULL),
    (48078, '2021-016B',  'CZ-5B R/B',                'ROCKET_BODY', 7, 6, '2021-04-29', 'CHN', 'CASC',                         'LEO', 'INACTIVE', 21000,  NULL),
    (40258, '2014-055B',  'BREEZE-M DEB',             'DEBRIS',      NULL,NULL,NULL,      'RUS', NULL,                           'HEO', 'INACTIVE', NULL,   NULL),
    (26405, '2000-045B',  'TITAN 4B R/B',             'ROCKET_BODY', 9, NULL,'2000-08-17','USA', 'Lockheed Martin',              'GEO', 'INACTIVE', 3500,   NULL),
    (43772, '2018-092B',  'FENGYUN 1C DEB',           'DEBRIS',      NULL,NULL,NULL,      'CHN', NULL,                           'LEO', 'INACTIVE', NULL,   NULL);

-- ── Sample Orbit States ─────────────────────────────────────
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

-- ── Tracking Observations ───────────────────────────────────
INSERT INTO tracking.tracking_observation
    (object_id, station_id, observation_time, observation_type,
     azimuth_deg, elevation_deg, range_km, range_rate_km_s, signal_to_noise, quality_flag)
VALUES
    (1, 1, '2026-02-09 00:05:00+00', 'RADAR',  245.3, 42.1, 980.4,  -2.3, 32.5, 'GOOD'),
    (1, 2, '2026-02-09 00:10:00+00', 'RADAR',  120.8, 55.7, 850.2,   1.1, 28.9, 'GOOD'),
    (2, 1, '2026-02-09 01:00:00+00', 'OPTICAL', 180.2, 67.4, 620.5, -0.5, 45.1, 'GOOD'),
    (3, 7, '2026-02-09 02:15:00+00', 'RF',      90.5,  30.2, 1200.8,  3.2, 18.4, 'DEGRADED'),
    (1, 6, '2026-02-09 03:00:00+00', 'RADAR',  310.1, 25.8, 1450.3, -4.1, 22.7, 'GOOD'),
    (11,8, '2026-02-09 04:30:00+00', 'RADAR',  200.6, 15.3, 2100.1,  0.8, 12.3, 'POOR');

-- ── Propagation Results ─────────────────────────────────────
INSERT INTO tracking.propagation_result
    (object_id, source_epoch, target_epoch, method,
     position_x_km, position_y_km, position_z_km,
     velocity_x_km_s, velocity_y_km_s, velocity_z_km_s, drag_coefficient)
VALUES
    (1, '2026-02-09 00:00:00+00', '2026-02-09 06:00:00+00', 'SGP4',
     4350.200, -1890.440, 4580.110, 2.890, 6.120, -3.010, 2.2),
    (1, '2026-02-09 00:00:00+00', '2026-02-09 12:00:00+00', 'SGP4',
     -3100.800, 4200.330, 3900.550, -5.110, -4.200, 2.980, 2.2),
    (3, '2026-02-09 00:00:00+00', '2026-02-09 06:00:00+00', 'SGP4',
     -4520.100, 2810.220, -3980.660, -3.450, -5.890, 2.110, 2.2);

-- ── Sample Telemetry ────────────────────────────────────────
INSERT INTO telemetry.satellite_telemetry
    (object_id, ts, subsystem, parameter_name, value, unit, quality)
VALUES
    (1, '2026-02-09 00:00:00+00', 'EPS',     'solar_array_voltage',   160.2,   'V',     'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'EPS',     'battery_charge',        92.4,    '%',     'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'THERMAL', 'cabin_temperature',     22.1,    'C',     'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'ADCS',    'attitude_roll',         0.0012,  'deg',   'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'ADCS',    'attitude_pitch',        -0.0034, 'deg',   'NOMINAL'),
    (1, '2026-02-09 00:00:00+00', 'COMMS',   'downlink_signal_str',   -68.3,   'dBm',   'NOMINAL'),
    (1, '2026-02-09 00:05:00+00', 'EPS',     'solar_array_voltage',   159.8,   'V',     'NOMINAL'),
    (1, '2026-02-09 00:05:00+00', 'EPS',     'battery_charge',        91.9,    '%',     'NOMINAL'),
    (1, '2026-02-09 00:05:00+00', 'THERMAL', 'cabin_temperature',     22.3,    'C',     'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'EPS',     'solar_array_current',   24.5,   'A',     'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'THERMAL', 'instrument_bay_temp',   20.3,   'C',     'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'PAYLOAD', 'wfc3_status',           1.0,    'bool',  'NOMINAL'),
    (2, '2026-02-09 00:00:00+00', 'ADCS',    'pointing_error_arcsec', 0.007,  'arcsec','NOMINAL');

-- ── Conjunction Events ──────────────────────────────────────
INSERT INTO analytics.conjunction_event
    (primary_object_id, secondary_object_id, time_of_closest_approach,
     miss_distance_km, collision_probability, relative_velocity_km_s,
     risk_level, status)
VALUES
    (1, 11, '2026-02-11 14:23:00+00', 0.85, 2.3e-4, 14.2, 'HIGH', 'SCREENING'),
    (3, 12, '2026-02-13 08:15:00+00', 3.20, 5.1e-6, 10.8, 'MEDIUM', 'PENDING'),
    (2, 15, '2026-02-15 22:00:00+00', 12.5, 1.2e-7, 7.5,  'LOW', 'PENDING');

-- ── Space Weather ───────────────────────────────────────────
INSERT INTO analytics.space_weather
    (ts, solar_flux_f10_7, kp_index, ap_index, dst_index,
     solar_wind_speed_km_s, geomagnetic_storm_level, data_source, is_forecast)
VALUES
    ('2026-02-09 00:00:00+00', 148.2, 3.0, 15, -12, 420.0, 'G0', 'NOAA_SWPC', FALSE),
    ('2026-02-08 21:00:00+00', 147.8, 2.7, 12, -8,  405.0, 'G0', 'NOAA_SWPC', FALSE),
    ('2026-02-08 18:00:00+00', 150.1, 4.0, 22, -25, 510.0, 'G1', 'NOAA_SWPC', FALSE);

-- ── Missions ────────────────────────────────────────────────
INSERT INTO catalog.mission (name, description, operator_id, operator, launch_date, status)
VALUES
    ('ISS Operations',    'International Space Station continuous crewed operations',  1, 'NASA/Roscosmos/ESA/JAXA/CSA', '1998-11-20', 'ACTIVE'),
    ('Hubble Servicing',  'Hubble Space Telescope observation mission',                1, 'NASA/ESA',                     '1990-04-24', 'ACTIVE'),
    ('Starlink Gen2',     'SpaceX broadband constellation deployment',                 2, 'SpaceX',                       '2019-05-24', 'ACTIVE');

INSERT INTO catalog.mission_object (mission_id, object_id, role) VALUES
    (1, 1, 'PRIMARY'), (2, 2, 'PRIMARY'), (3, 3, 'PRIMARY'), (3, 4, 'PRIMARY');

-- ── Maneuver Log ────────────────────────────────────────────
INSERT INTO analytics.maneuver_log
    (object_id, conjunction_id, planned_time, delta_v_m_s, direction, status, notes)
VALUES
    (1, 1, '2026-02-11 10:00:00+00', 0.5,
     '{"radial": 0.0, "in_track": 0.5, "cross_track": 0.0}',
     'PLANNED', 'Pre-emptive avoidance maneuver for ISS-Cosmos 1408 debris conjunction');

-- ── Breakup Events ──────────────────────────────────────────
INSERT INTO analytics.breakup_event
    (parent_object_id, event_time, event_type, altitude_km, fragment_count, is_confirmed, source, notes)
VALUES
    (11, '2021-11-15 02:00:00+00', 'DELIBERATE', 480, 1500, TRUE, 'US Space Command',
     'Russian ASAT test destroyed Cosmos 1408 satellite, generating 1500+ trackable debris pieces'),
    (15, '2007-01-11 00:00:00+00', 'DELIBERATE', 865, 3500, TRUE, 'US Space Command',
     'Chinese ASAT test destroyed Fengyun-1C weather satellite');

-- ── Reentry Events ──────────────────────────────────────────
INSERT INTO analytics.reentry_event
    (object_id, predicted_time, actual_time, predicted_lat, predicted_lon,
     actual_lat, actual_lon, is_controlled, risk_level, surviving_mass_kg, status, source)
VALUES
    (12, '2021-05-09 02:00:00+00', '2021-05-09 02:24:00+00',
     28.6, 72.5, 28.59, 72.47, FALSE, 'HIGH', 4000, 'CONFIRMED', 'US Space Command'),
    (14, '2026-06-15 00:00:00+00', NULL,
     NULL, NULL, NULL, NULL, FALSE, 'MEDIUM', 800, 'PREDICTED', 'ESA Space Debris Office');

-- ── ML: Anomaly Alerts ──────────────────────────────────────
INSERT INTO ml.anomaly_alert
    (object_id, detected_at, subsystem, anomaly_type, severity,
     anomaly_score, threshold_used, model_version, description, window_start, window_end)
VALUES
    (1, '2026-02-08 23:45:00+00', 'EPS', 'POWER_DROP', 'WARNING',
     0.87, 0.65, 'lstm-v1.2', 'Solar array voltage showing 3% deviation from predicted baseline',
     '2026-02-08 22:00:00+00', '2026-02-08 23:45:00+00'),
    (2, '2026-02-09 01:00:00+00', 'THERMAL', 'THERMAL_EXCURSION', 'INFO',
     0.45, 0.65, 'lstm-v1.2', 'Minor instrument bay temperature fluctuation during eclipse transition',
     '2026-02-09 00:30:00+00', '2026-02-09 01:00:00+00'),
    (3, '2026-02-08 18:00:00+00', 'ADCS', 'ATTITUDE_ERROR', 'CRITICAL',
     1.92, 0.65, 'lstm-v1.2', 'Starlink-2636 attitude control error exceeds 3-sigma threshold',
     '2026-02-08 17:00:00+00', '2026-02-08 18:00:00+00');

-- ── ML: Debris Classifications ──────────────────────────────
INSERT INTO ml.debris_classification
    (object_id, predicted_type, confidence, model_version, features_used, classified_at)
VALUES
    (11, 'DEBRIS',       0.94, 'rf-v2.1',
     '{"semi_major_axis_km":6858,"eccentricity":0.005,"inclination_deg":82.5,"bstar":0.00012,"rcs_m2":0.1}',
     '2026-02-09 00:00:00+00'),
    (13, 'DEBRIS',       0.88, 'rf-v2.1',
     '{"semi_major_axis_km":25000,"eccentricity":0.7,"inclination_deg":49.4,"bstar":0.00005,"rcs_m2":0.3}',
     '2026-02-09 00:00:00+00'),
    (12, 'ROCKET_BODY',  0.97, 'rf-v2.1',
     '{"semi_major_axis_km":6800,"eccentricity":0.001,"inclination_deg":41.5,"bstar":0.00002,"rcs_m2":15.0}',
     '2026-02-09 00:00:00+00'),
    (15, 'DEBRIS',       0.91, 'rf-v2.1',
     '{"semi_major_axis_km":7200,"eccentricity":0.003,"inclination_deg":99.0,"bstar":0.00018,"rcs_m2":0.05}',
     '2026-02-09 00:00:00+00');

-- ── ML: Congestion Reports ──────────────────────────────────
INSERT INTO ml.congestion_report
    (analysis_time, altitude_min_km, altitude_max_km, inclination_min_deg, inclination_max_deg,
     object_count, density_objects_per_km3, risk_score, trend, cluster_count, model_version)
VALUES
    ('2026-02-09 00:00:00+00', 500, 550, 50, 55,  1842, 2.8e-9, 0.78, 'INCREASING', 12, 'dbscan-v1.0'),
    ('2026-02-09 00:00:00+00', 750, 800, 95, 100, 923,  1.1e-9, 0.52, 'STABLE',     6,  'dbscan-v1.0'),
    ('2026-02-09 00:00:00+00', 350, 400, 40, 45,  245,  0.4e-9, 0.21, 'DECREASING', 2,  'dbscan-v1.0');

# ORBITA: An Orbital Registry for Big Data, Intelligence, and Traffic Analysis

## Project Review 1 - Database Design Document

---

## 1. ABSTRACT

The rapid proliferation of satellites, spent rocket stages, and orbital debris has created an increasingly congested and contested space environment. With over 30,000 tracked objects in Earth orbit and projected mega-constellations pushing that number beyond 100,000 in the coming decade, the need for an intelligent, centralized Space Domain Awareness (SDA) platform has become critical.

**ORBITA** (Orbital Registry for Big Data, Intelligence, and Traffic Analysis) is a scalable, intelligent Space Domain Awareness platform designed to integrate real-time and historical data streams for tracking, cataloging, and analyzing all objects in Earth orbit. The system combines a spatial database (PostgreSQL + PostGIS), a RESTful API layer (FastAPI), and machine learning capabilities to maintain a high-fidelity catalog of space objects including active satellites, orbital debris, and rocket bodies.

The platform captures multi-dimensional data: orbital mechanics parameters (Keplerian elements, Cartesian state vectors), satellite health telemetry, ground station infrastructure, conjunction (close approach) events, space weather conditions, and mission metadata. The schema design incorporates temporal tracking through timestamped records, spatial indexing for 3D position queries in Earth-Centered Earth-Fixed (ECEF) coordinates, automated computations via database triggers, and SGP4-based orbit propagation.

Beyond traditional database management, ORBITA integrates machine learning for three key intelligence functions: (1) **telemetry anomaly detection** using LSTM autoencoders to flag abnormal satellite behavior for predictive maintenance, (2) **debris characterization** using classification models to categorize unknown objects based on orbital characteristics, and (3) **orbital traffic pattern analysis** to identify congested regions and predict future congestion hotspots.

By combining structured data management with predictive analytics, ORBITA transforms raw tracking data into actionable intelligence -- shifting the paradigm from "What is the current state of space?" to "What will the future state be, what risks does it present, and what should we do about it?" The platform serves satellite operators, space agencies, and researchers in ensuring the safety and long-term sustainability of space operations.

---

## 2. PROBLEM UNDERSTANDING

### 2.1 Background

Space has transitioned from a domain occupied by a few hundred government satellites to one hosting tens of thousands of objects. The 2009 Iridium-Cosmos collision and the 2021 Russian ASAT test (which fragmented Cosmos 1408 into 1,500+ debris pieces) demonstrated the cascading risk known as **Kessler Syndrome** -- where collisions generate debris that causes further collisions, potentially rendering entire orbital regions unusable.

### 2.2 Core Problems

The following critical data management and intelligence challenges exist in modern space operations:

1. **Fragmented Data Sources**: Tracking data (TLEs from Space-Track.org), telemetry (from ground stations), space weather (from NOAA), and regulatory information exist in separate, disconnected systems. Operators must manually correlate data across sources.

2. **Lack of Unified Catalog**: There is no single, comprehensive database that links a space object's identity, its orbital trajectory history, real-time health telemetry, and collision risk profile in one queryable system.

3. **Collision Risk Assessment**: With thousands of close approaches occurring daily, manual analysis is impossible. The system must store predicted trajectories, compute miss distances, and calculate collision probabilities using uncertainty (covariance) data.

4. **Temporal Data Management**: Orbital states change continuously. The database must maintain the complete history of every object's position and velocity over time, enabling retrospective analysis ("Where was Satellite X at 14:23 UTC last Tuesday?").

5. **Spatial Query Requirements**: Operators need to answer spatial questions: "Which objects will pass within 50 km of the ISS in the next 6 hours?" or "List all debris in a specific orbital region." This requires 3D spatial indexing, not just flat relational queries.

6. **Anomaly Correlation**: When a satellite fails, investigators need to correlate the failure timestamp with telemetry trends, space weather events (solar storms), and nearby conjunction events. This requires joins across multiple entity types with temporal alignment.

7. **Reactive vs. Predictive Operations**: Current systems are largely reactive -- operators respond to events after they occur. There is a need for predictive intelligence: detecting telemetry anomalies before they become failures, classifying unknown debris objects automatically, and identifying orbital congestion trends before they become dangerous.

8. **Debris Identification Gap**: A significant portion of tracked objects are uncharacterized. Manual classification is slow and does not scale. Machine learning models trained on orbital characteristics (altitude, eccentricity, inclination, radar cross-section) can automate this classification.

9. **Orbital Congestion Blindness**: Operators lack tools to visualize and predict traffic density across orbital shells. Without congestion analysis, new satellite deployments risk exacerbating crowding in already-stressed regions (e.g., 500-600 km LEO shell).

### 2.3 Proposed Solution

ORBITA addresses these problems through a two-layer architecture: a **data management layer** (PostgreSQL + PostGIS) for structured storage and querying, and an **intelligence layer** (Python + ML) for predictive analytics.

**Data Management Layer:**
- A **unified space object catalog** (satellites, debris, rocket bodies) with standardized identifiers (NORAD ID, COSPAR ID)
- **Temporal orbit state tracking** with both Keplerian elements and Cartesian state vectors
- **Spatial indexing** using PostGIS GEOMETRY types for 3D proximity queries
- **Time-series telemetry storage** for satellite health monitoring
- **Conjunction event management** with collision probability and risk classification
- **Space weather data integration** for anomaly correlation
- **Ground station registry** with spatial locations for visibility analysis
- **Mission tracking** linking space objects to their operational missions
- **RESTful API** with 14 endpoints for programmatic access to all data

**Intelligence Layer (Machine Learning):**
- **Telemetry Anomaly Detection**: LSTM autoencoder models trained on historical telemetry to flag abnormal subsystem behavior (power drops, thermal excursions, attitude drift) before failures occur
- **Debris Characterization**: Classification models (Random Forest / Gradient Boosting) to categorize unknown tracked objects into types (intact satellite, fragmentation debris, rocket body, mission-related object) based on orbital parameters and radar cross-section
- **Orbital Traffic Pattern Analysis**: Density-based clustering and time-series forecasting to identify congested orbital regions, track congestion trends over time, and predict future hotspots

---

## 3. IDENTIFICATION OF ENTITIES AND RELATIONSHIPS

### 3.1 Entities

The system identifies **9 entities** organized across 4 database schemas:

| # | Entity | Schema | Description |
|---|--------|--------|-------------|
| 1 | **SpaceObject** | catalog | Master record for any tracked object in orbit (satellite, debris, rocket body) |
| 2 | **Mission** | catalog | A space mission that one or more objects belong to |
| 3 | **OrbitState** | tracking | A snapshot of an object's orbital parameters at a specific epoch (time) |
| 4 | **GroundStation** | tracking | A ground-based facility for tracking or communicating with space objects |
| 5 | **SatelliteTelemetry** | telemetry | A single telemetry measurement from a satellite subsystem at a point in time |
| 6 | **ConjunctionEvent** | analytics | A predicted close approach between two space objects |
| 7 | **SpaceWeather** | analytics | A snapshot of solar and geomagnetic conditions at a given time |
| 8 | **ManeuverLog** | analytics | A record of an orbital maneuver (planned or executed) |
| 9 | **MissionObject** | catalog | Associative entity linking Missions to SpaceObjects (many-to-many) |

### 3.2 Relationships

| # | Relationship | Type | Description |
|---|-------------|------|-------------|
| R1 | SpaceObject **has many** OrbitStates | 1:N | Each object accumulates orbit states over time; each state belongs to exactly one object |
| R2 | SpaceObject **has many** Telemetry readings | 1:N | Each satellite generates telemetry; each reading belongs to one object |
| R3 | SpaceObject **participates in many** ConjunctionEvents | M:N | A conjunction involves exactly two objects (primary and secondary); each object can appear in many conjunctions |
| R4 | SpaceObject **has many** ManeuverLogs | 1:N | An object may execute multiple maneuvers; each maneuver belongs to one object |
| R5 | Mission **contains many** SpaceObjects | M:N | A mission may involve multiple objects (e.g., a constellation); an object may belong to multiple missions. Resolved via MissionObject |
| R6 | ConjunctionEvent **triggers** ManeuverLog | 1:N | A high-risk conjunction may prompt one or more avoidance maneuvers |
| R7 | SpaceWeather **correlates with** Telemetry | Temporal | Space weather at time T may explain telemetry anomalies at time T (joined by timestamp, not FK) |

### 3.3 Entity Attributes

#### SpaceObject (catalog.space_object)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| object_id | BIGSERIAL | PK | Auto-generated unique identifier |
| norad_id | INTEGER | UNIQUE | NORAD catalog number (US Space Force assignment) |
| cospar_id | VARCHAR(20) | UNIQUE | International designator (e.g., 1998-067A for ISS) |
| name | VARCHAR(200) | NOT NULL | Common name of the object |
| object_type | VARCHAR(50) | NOT NULL, CHECK | SATELLITE, DEBRIS, ROCKET_BODY, or UNKNOWN |
| launch_date | DATE | | Date the object was launched |
| decay_date | DATE | | Date of atmospheric re-entry (if applicable) |
| launch_site | VARCHAR(150) | | Launch facility name |
| country_code | CHAR(3) | | ISO 3166-1 alpha-3 country code of registrant |
| operator | VARCHAR(200) | | Operating organization |
| owner | VARCHAR(200) | | Owning entity |
| mass_kg | NUMERIC(12,2) | | Mass in kilograms |
| cross_section_m2 | NUMERIC(10,4) | | Radar cross-section in square meters |
| orbit_class | VARCHAR(50) | CHECK | LEO, MEO, GEO, HEO, SSO, MOLNIYA, or OTHER |
| status | VARCHAR(50) | CHECK, DEFAULT 'UNKNOWN' | ACTIVE, INACTIVE, DECAYED, FUTURE, or UNKNOWN |
| purpose | VARCHAR(200) | | Mission purpose (Communications, Earth Observation, etc.) |
| metadata | JSONB | DEFAULT '{}' | Extensible JSON field for additional properties |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp (auto-updated via trigger) |

#### OrbitState (tracking.orbit_state)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| state_id | BIGSERIAL | PK (composite with epoch) | Auto-generated identifier |
| object_id | BIGINT | FK -> space_object, NOT NULL | The tracked object |
| epoch | TIMESTAMPTZ | PK (composite), NOT NULL | Time at which this state is valid |
| position_x_km | DOUBLE PRECISION | | X position in TEME/ECEF frame |
| position_y_km | DOUBLE PRECISION | | Y position |
| position_z_km | DOUBLE PRECISION | | Z position |
| velocity_x_km_s | DOUBLE PRECISION | | X velocity component |
| velocity_y_km_s | DOUBLE PRECISION | | Y velocity component |
| velocity_z_km_s | DOUBLE PRECISION | | Z velocity component |
| reference_frame | VARCHAR(10) | CHECK, DEFAULT 'TEME' | TEME, J2000, ECEF, or ITRF |
| position_geom | GEOMETRY(PointZ, 4978) | | PostGIS 3D point for spatial queries (auto-computed) |
| semimajor_axis_km | DOUBLE PRECISION | | Semi-major axis (Keplerian element) |
| eccentricity | DOUBLE PRECISION | | Orbital eccentricity |
| inclination_deg | DOUBLE PRECISION | | Orbital inclination in degrees |
| raan_deg | DOUBLE PRECISION | | Right Ascension of Ascending Node |
| arg_perigee_deg | DOUBLE PRECISION | | Argument of perigee |
| true_anomaly_deg | DOUBLE PRECISION | | True anomaly |
| mean_anomaly_deg | DOUBLE PRECISION | | Mean anomaly |
| mean_motion_rev_day | DOUBLE PRECISION | | Revolutions per day |
| period_minutes | DOUBLE PRECISION | | Orbital period |
| apoapsis_km | DOUBLE PRECISION | | Altitude at farthest point (auto-computed via trigger) |
| periapsis_km | DOUBLE PRECISION | | Altitude at closest point (auto-computed via trigger) |
| tle_line1 | TEXT | | Raw TLE line 1 |
| tle_line2 | TEXT | | Raw TLE line 2 |
| covariance_matrix | JSONB | | 6x6 state uncertainty covariance matrix |
| source | VARCHAR(30) | CHECK, DEFAULT 'TLE' | TLE, RADAR, OPTICAL, GPS, PROPAGATED, or MANEUVER |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

#### GroundStation (tracking.ground_station)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| station_id | SERIAL | PK | Auto-generated identifier |
| name | VARCHAR(200) | NOT NULL | Station name |
| location | GEOMETRY(PointZ, 4326) | NOT NULL | Longitude, latitude, altitude (WGS84) |
| country_code | CHAR(3) | | Country code |
| operator | VARCHAR(200) | | Operating organization |
| station_type | VARCHAR(50) | CHECK | RADAR, OPTICAL, LASER, COMMS, or MULTI |
| frequency_bands | JSONB | DEFAULT '[]' | Available communication frequencies |
| antenna_diameter_m | NUMERIC(6,2) | | Antenna dish diameter |
| min_elevation_deg | NUMERIC(5,2) | DEFAULT 5.0 | Minimum elevation angle for tracking |
| capabilities | JSONB | DEFAULT '{}' | Additional capability metadata |
| is_active | BOOLEAN | DEFAULT TRUE | Operational status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

#### SatelliteTelemetry (telemetry.satellite_telemetry)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| telemetry_id | BIGSERIAL | PK (composite with ts) | Auto-generated identifier |
| object_id | BIGINT | FK -> space_object, NOT NULL | Source satellite |
| ts | TIMESTAMPTZ | PK (composite), NOT NULL | Measurement timestamp |
| subsystem | VARCHAR(50) | NOT NULL, CHECK | EPS, ADCS, COMMS, THERMAL, PROPULSION, PAYLOAD, OBC, or OTHER |
| parameter_name | VARCHAR(120) | NOT NULL | Measured parameter (e.g., battery_charge, cabin_temperature) |
| value | DOUBLE PRECISION | | Numeric measurement value |
| unit | VARCHAR(30) | | Unit of measurement |
| quality | VARCHAR(20) | CHECK, DEFAULT 'NOMINAL' | NOMINAL, WARNING, CRITICAL, STALE, or UNKNOWN |
| raw_data | JSONB | | Original unprocessed data |

#### ConjunctionEvent (analytics.conjunction_event)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| conjunction_id | BIGSERIAL | PK | Auto-generated identifier |
| primary_object_id | BIGINT | FK -> space_object, NOT NULL | First object in the conjunction |
| secondary_object_id | BIGINT | FK -> space_object, NOT NULL | Second object |
| time_of_closest_approach | TIMESTAMPTZ | NOT NULL | Predicted TCA |
| miss_distance_km | DOUBLE PRECISION | | Total miss distance |
| miss_distance_radial_km | DOUBLE PRECISION | | Radial component |
| miss_distance_in_track_km | DOUBLE PRECISION | | In-track component |
| miss_distance_cross_track_km | DOUBLE PRECISION | | Cross-track component |
| collision_probability | DOUBLE PRECISION | | Computed probability (0 to 1) |
| relative_velocity_km_s | DOUBLE PRECISION | | Closing speed |
| combined_hard_body_radius_m | DOUBLE PRECISION | | Combined physical size |
| covariance_primary | JSONB | | Primary object uncertainty |
| covariance_secondary | JSONB | | Secondary object uncertainty |
| cdm_id | VARCHAR(100) | | Conjunction Data Message identifier |
| cdm_data | JSONB | | Full CDM payload |
| risk_level | VARCHAR(20) | CHECK, DEFAULT 'LOW' | LOW, MEDIUM, HIGH, CRITICAL, or RED |
| status | VARCHAR(30) | CHECK, DEFAULT 'PENDING' | PENDING, SCREENING, ANALYZED, MITIGATED, EXPIRED, or FALSE_ALARM |
| recommended_action | TEXT | | Suggested response |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

#### SpaceWeather (analytics.space_weather)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| weather_id | BIGSERIAL | PK (composite with ts) | Auto-generated identifier |
| ts | TIMESTAMPTZ | PK (composite), NOT NULL | Observation timestamp |
| solar_flux_f10_7 | DOUBLE PRECISION | | F10.7 cm solar radio flux |
| kp_index | DOUBLE PRECISION | | Planetary K-index (geomagnetic activity) |
| ap_index | INTEGER | | Planetary A-index |
| dst_index | INTEGER | | Disturbance Storm Time index |
| bz_gsm_nt | DOUBLE PRECISION | | Interplanetary magnetic field Bz component |
| proton_density_cm3 | DOUBLE PRECISION | | Solar wind proton density |
| solar_wind_speed_km_s | DOUBLE PRECISION | | Solar wind speed |
| proton_flux | DOUBLE PRECISION | | Energetic proton flux |
| electron_flux | DOUBLE PRECISION | | Energetic electron flux |
| geomagnetic_storm_level | VARCHAR(10) | | NOAA G-scale (G0-G5) |
| solar_flare_class | VARCHAR(10) | | Flare classification (B, C, M, X) |
| data_source | VARCHAR(60) | | Provider (e.g., NOAA_SWPC) |
| is_forecast | BOOLEAN | DEFAULT FALSE | Whether this is forecast vs. observed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

#### ManeuverLog (analytics.maneuver_log)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| maneuver_id | BIGSERIAL | PK | Auto-generated identifier |
| object_id | BIGINT | FK -> space_object, NOT NULL | Object performing the maneuver |
| conjunction_id | BIGINT | FK -> conjunction_event | Triggering conjunction (if any) |
| planned_time | TIMESTAMPTZ | NOT NULL | Scheduled burn time |
| executed_time | TIMESTAMPTZ | | Actual execution time |
| delta_v_m_s | DOUBLE PRECISION | | Velocity change magnitude |
| direction | JSONB | | {radial, in_track, cross_track} components |
| status | VARCHAR(30) | CHECK, DEFAULT 'PLANNED' | PLANNED, APPROVED, EXECUTING, COMPLETED, CANCELLED, or FAILED |
| notes | TEXT | | Operator notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

#### Mission (catalog.mission)
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| mission_id | BIGSERIAL | PK | Auto-generated identifier |
| name | VARCHAR(200) | NOT NULL | Mission name |
| description | TEXT | | Mission description |
| operator | VARCHAR(200) | | Operating organization |
| launch_date | DATE | | Mission start date |
| end_date | DATE | | Mission end date |
| status | VARCHAR(50) | CHECK, DEFAULT 'PLANNED' | PLANNED, ACTIVE, COMPLETED, or FAILED |
| metadata | JSONB | DEFAULT '{}' | Additional mission data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

#### MissionObject (catalog.mission_object) -- Associative Entity
| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| mission_id | BIGINT | PK (composite), FK -> mission | The mission |
| object_id | BIGINT | PK (composite), FK -> space_object | The space object |
| role | VARCHAR(50) | DEFAULT 'PRIMARY' | Role of the object in the mission |

---

## 4. ER MODEL

### 4.1 ER Diagram (Chen Notation - Textual Representation)

```
                                    ┌─────────────────┐
                                    │     MISSION      │
                                    │─────────────────│
                                    │ mission_id (PK)  │
                                    │ name             │
                                    │ description      │
                                    │ operator         │
                                    │ launch_date      │
                                    │ end_date         │
                                    │ status           │
                                    └────────┬────────┘
                                             │
                                        M:N  │  (via MissionObject)
                                             │
┌──────────────────┐    1:N    ┌─────────────┴─────────────┐    1:N    ┌──────────────────────┐
│  GROUND STATION  │          │       SPACE OBJECT         │          │     ORBIT STATE       │
│──────────────────│          │───────────────────────────│          │──────────────────────│
│ station_id (PK)  │          │ object_id (PK)             │──────────│ state_id (PK)         │
│ name             │          │ norad_id (UNIQUE)          │          │ object_id (FK)        │
│ location (GEOM)  │          │ cospar_id (UNIQUE)         │          │ epoch (PK)            │
│ country_code     │          │ name                       │          │ position_x/y/z_km     │
│ operator         │          │ object_type                │          │ velocity_x/y/z_km_s   │
│ station_type     │          │ launch_date                │          │ position_geom (GEOM)  │
│ antenna_diam     │          │ country_code               │          │ semimajor_axis_km     │
│ min_elevation    │          │ operator / owner           │          │ eccentricity          │
│ is_active        │          │ mass_kg                    │          │ inclination_deg       │
└──────────────────┘          │ orbit_class                │          │ raan_deg              │
                              │ status                     │          │ apoapsis/periapsis_km │
                              │ purpose                    │          │ tle_line1/2           │
                              └──┬───────┬────────┬───────┘          │ covariance_matrix     │
                                 │       │        │                   │ source                │
                            1:N  │  1:N  │   M:N  │                   └──────────────────────┘
                                 │       │        │
              ┌──────────────────┘       │        └──────────────────┐
              │                          │                           │
              ▼                          ▼                           ▼
┌─────────────────────┐   ┌────────────────────┐   ┌──────────────────────────┐
│ SATELLITE TELEMETRY │   │   MANEUVER LOG     │   │   CONJUNCTION EVENT      │
│─────────────────────│   │────────────────────│   │──────────────────────────│
│ telemetry_id (PK)   │   │ maneuver_id (PK)   │   │ conjunction_id (PK)      │
│ object_id (FK)      │   │ object_id (FK)     │   │ primary_object_id (FK)   │
│ ts (PK)             │   │ conjunction_id(FK) │   │ secondary_object_id (FK) │
│ subsystem           │   │ planned_time       │   │ time_of_closest_approach │
│ parameter_name      │   │ executed_time      │   │ miss_distance_km         │
│ value               │   │ delta_v_m_s        │   │ collision_probability    │
│ unit                │   │ direction          │   │ relative_velocity_km_s   │
│ quality             │   │ status             │   │ risk_level               │
└─────────────────────┘   └────────────────────┘   │ status                   │
                                    ▲               │ recommended_action       │
                                    │               └──────────────────────────┘
                                    │ 1:N                       │
                                    └───────────────────────────┘
                                    (conjunction triggers maneuver)


                              ┌──────────────────────┐
                              │    SPACE WEATHER      │
                              │──────────────────────│
                              │ weather_id (PK)       │
                              │ ts (PK)               │
                              │ solar_flux_f10_7      │
                              │ kp_index              │
                              │ ap_index / dst_index  │
                              │ solar_wind_speed_km_s │
                              │ geomagnetic_storm_lvl │
                              │ solar_flare_class     │
                              │ is_forecast           │
                              └──────────────────────┘
                              (correlates temporally with
                               Telemetry and ConjunctionEvent)
```

### 4.2 Relationship Summary

```
MISSION ──── M:N ──── SPACE_OBJECT  (via MISSION_OBJECT associative entity)
SPACE_OBJECT ──── 1:N ──── ORBIT_STATE
SPACE_OBJECT ──── 1:N ──── SATELLITE_TELEMETRY
SPACE_OBJECT ──── 1:N ──── MANEUVER_LOG
SPACE_OBJECT ──── M:N ──── CONJUNCTION_EVENT  (as primary or secondary)
CONJUNCTION_EVENT ──── 1:N ──── MANEUVER_LOG
SPACE_WEATHER ~~~~ temporal correlation ~~~~ TELEMETRY / CONJUNCTION_EVENT
```

### 4.3 Participation Constraints

| Relationship | Total/Partial | Explanation |
|-------------|---------------|-------------|
| SpaceObject -> OrbitState | Partial | Newly cataloged objects may not yet have orbit data |
| SpaceObject -> Telemetry | Partial | Only active satellites generate telemetry; debris does not |
| SpaceObject -> ConjunctionEvent | Partial | Not all objects have conjunction alerts |
| Mission -> MissionObject | Total | A mission must have at least one associated object |
| ConjunctionEvent -> ManeuverLog | Partial | Not all conjunctions require maneuvers (most are low risk) |

---

## 5. RELATIONAL SCHEMA DESIGN

### 5.1 Schema Organization

The database uses **4 schemas** to logically separate concerns:

| Schema | Purpose | Tables |
|--------|---------|--------|
| **catalog** | Master data (what exists in space) | space_object, mission, mission_object |
| **tracking** | Positional data (where things are) | orbit_state, ground_station |
| **telemetry** | Health data (how things are doing) | satellite_telemetry |
| **analytics** | Derived intelligence (what it means) | conjunction_event, space_weather, maneuver_log |

### 5.2 Relational Schemas (in Relational Notation)

```
catalog.space_object (
    object_id: BIGSERIAL [PK],
    norad_id: INTEGER [UNIQUE],
    cospar_id: VARCHAR(20) [UNIQUE],
    name: VARCHAR(200) [NOT NULL],
    object_type: VARCHAR(50) [NOT NULL, CHECK],
    launch_date: DATE,
    decay_date: DATE,
    launch_site: VARCHAR(150),
    country_code: CHAR(3),
    operator: VARCHAR(200),
    owner: VARCHAR(200),
    mass_kg: NUMERIC(12,2),
    cross_section_m2: NUMERIC(10,4),
    orbit_class: VARCHAR(50) [CHECK],
    status: VARCHAR(50) [CHECK, DEFAULT 'UNKNOWN'],
    purpose: VARCHAR(200),
    metadata: JSONB [DEFAULT '{}'],
    created_at: TIMESTAMPTZ [DEFAULT NOW()],
    updated_at: TIMESTAMPTZ [DEFAULT NOW()]
)

catalog.mission (
    mission_id: BIGSERIAL [PK],
    name: VARCHAR(200) [NOT NULL],
    description: TEXT,
    operator: VARCHAR(200),
    launch_date: DATE,
    end_date: DATE,
    status: VARCHAR(50) [CHECK, DEFAULT 'PLANNED'],
    metadata: JSONB [DEFAULT '{}'],
    created_at: TIMESTAMPTZ [DEFAULT NOW()],
    updated_at: TIMESTAMPTZ [DEFAULT NOW()]
)

catalog.mission_object (
    mission_id: BIGINT [PK, FK -> mission.mission_id ON DELETE CASCADE],
    object_id: BIGINT [PK, FK -> space_object.object_id ON DELETE CASCADE],
    role: VARCHAR(50) [DEFAULT 'PRIMARY']
)

tracking.orbit_state (
    state_id: BIGSERIAL [PK],
    object_id: BIGINT [FK -> space_object.object_id ON DELETE CASCADE, NOT NULL],
    epoch: TIMESTAMPTZ [PK, NOT NULL],
    position_x_km: DOUBLE PRECISION,
    position_y_km: DOUBLE PRECISION,
    position_z_km: DOUBLE PRECISION,
    velocity_x_km_s: DOUBLE PRECISION,
    velocity_y_km_s: DOUBLE PRECISION,
    velocity_z_km_s: DOUBLE PRECISION,
    reference_frame: VARCHAR(10) [CHECK, DEFAULT 'TEME'],
    position_geom: GEOMETRY(PointZ, 4978),   -- auto-populated via trigger
    semimajor_axis_km: DOUBLE PRECISION,
    eccentricity: DOUBLE PRECISION,
    inclination_deg: DOUBLE PRECISION,
    raan_deg: DOUBLE PRECISION,
    arg_perigee_deg: DOUBLE PRECISION,
    true_anomaly_deg: DOUBLE PRECISION,
    mean_anomaly_deg: DOUBLE PRECISION,
    mean_motion_rev_day: DOUBLE PRECISION,
    period_minutes: DOUBLE PRECISION,
    apoapsis_km: DOUBLE PRECISION,           -- auto-computed via trigger
    periapsis_km: DOUBLE PRECISION,          -- auto-computed via trigger
    tle_line1: TEXT,
    tle_line2: TEXT,
    covariance_matrix: JSONB,
    source: VARCHAR(30) [CHECK, DEFAULT 'TLE'],
    created_at: TIMESTAMPTZ [DEFAULT NOW()]
)

tracking.ground_station (
    station_id: SERIAL [PK],
    name: VARCHAR(200) [NOT NULL],
    location: GEOMETRY(PointZ, 4326) [NOT NULL],
    country_code: CHAR(3),
    operator: VARCHAR(200),
    station_type: VARCHAR(50) [CHECK],
    frequency_bands: JSONB [DEFAULT '[]'],
    antenna_diameter_m: NUMERIC(6,2),
    min_elevation_deg: NUMERIC(5,2) [DEFAULT 5.0],
    capabilities: JSONB [DEFAULT '{}'],
    is_active: BOOLEAN [DEFAULT TRUE],
    created_at: TIMESTAMPTZ [DEFAULT NOW()]
)

telemetry.satellite_telemetry (
    telemetry_id: BIGSERIAL [PK],
    object_id: BIGINT [FK -> space_object.object_id ON DELETE CASCADE, NOT NULL],
    ts: TIMESTAMPTZ [PK, NOT NULL],
    subsystem: VARCHAR(50) [NOT NULL, CHECK],
    parameter_name: VARCHAR(120) [NOT NULL],
    value: DOUBLE PRECISION,
    unit: VARCHAR(30),
    quality: VARCHAR(20) [CHECK, DEFAULT 'NOMINAL'],
    raw_data: JSONB
)

analytics.conjunction_event (
    conjunction_id: BIGSERIAL [PK],
    primary_object_id: BIGINT [FK -> space_object.object_id, NOT NULL],
    secondary_object_id: BIGINT [FK -> space_object.object_id, NOT NULL],
    time_of_closest_approach: TIMESTAMPTZ [NOT NULL],
    miss_distance_km: DOUBLE PRECISION,
    miss_distance_radial_km: DOUBLE PRECISION,
    miss_distance_in_track_km: DOUBLE PRECISION,
    miss_distance_cross_track_km: DOUBLE PRECISION,
    collision_probability: DOUBLE PRECISION,
    relative_velocity_km_s: DOUBLE PRECISION,
    combined_hard_body_radius_m: DOUBLE PRECISION,
    covariance_primary: JSONB,
    covariance_secondary: JSONB,
    cdm_id: VARCHAR(100),
    cdm_data: JSONB,
    risk_level: VARCHAR(20) [CHECK, DEFAULT 'LOW'],
    status: VARCHAR(30) [CHECK, DEFAULT 'PENDING'],
    recommended_action: TEXT,
    created_at: TIMESTAMPTZ [DEFAULT NOW()],
    updated_at: TIMESTAMPTZ [DEFAULT NOW()]
)

analytics.space_weather (
    weather_id: BIGSERIAL [PK],
    ts: TIMESTAMPTZ [PK, NOT NULL],
    solar_flux_f10_7: DOUBLE PRECISION,
    kp_index: DOUBLE PRECISION,
    ap_index: INTEGER,
    dst_index: INTEGER,
    bz_gsm_nt: DOUBLE PRECISION,
    proton_density_cm3: DOUBLE PRECISION,
    solar_wind_speed_km_s: DOUBLE PRECISION,
    proton_flux: DOUBLE PRECISION,
    electron_flux: DOUBLE PRECISION,
    geomagnetic_storm_level: VARCHAR(10),
    solar_flare_class: VARCHAR(10),
    data_source: VARCHAR(60),
    is_forecast: BOOLEAN [DEFAULT FALSE],
    created_at: TIMESTAMPTZ [DEFAULT NOW()]
)

analytics.maneuver_log (
    maneuver_id: BIGSERIAL [PK],
    object_id: BIGINT [FK -> space_object.object_id, NOT NULL],
    conjunction_id: BIGINT [FK -> conjunction_event.conjunction_id],
    planned_time: TIMESTAMPTZ [NOT NULL],
    executed_time: TIMESTAMPTZ,
    delta_v_m_s: DOUBLE PRECISION,
    direction: JSONB,
    status: VARCHAR(30) [CHECK, DEFAULT 'PLANNED'],
    notes: TEXT,
    created_at: TIMESTAMPTZ [DEFAULT NOW()]
)
```

### 5.3 Normalization

All relations are in **Third Normal Form (3NF)**:

- **1NF**: All attributes are atomic. Multi-valued data (frequency bands, covariance matrices) is stored in JSONB columns, which PostgreSQL treats as structured atomic values with indexing support.
- **2NF**: No partial dependencies exist. All non-key attributes depend on the entire primary key.
- **3NF**: No transitive dependencies. The auto-computed fields (apoapsis_km, periapsis_km, position_geom) are derived from other columns in the same row via triggers but are stored for query performance (controlled denormalization).

### 5.4 Indexing Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| space_object | norad_id, cospar_id | B-Tree (UNIQUE) | Fast lookup by standard identifiers |
| space_object | name | GIN (trigram) | Fuzzy text search on object names |
| space_object | metadata | GIN | JSON path queries on extensible fields |
| orbit_state | (object_id, epoch DESC) | B-Tree | Latest orbit for a given object |
| orbit_state | position_geom | GiST (spatial) | 3D proximity and containment queries |
| satellite_telemetry | (object_id, ts DESC) | B-Tree | Latest telemetry per object |
| conjunction_event | collision_probability DESC | B-Tree | Highest-risk conjunctions first |
| conjunction_event | time_of_closest_approach | B-Tree | Upcoming events |
| ground_station | location | GiST (spatial) | Nearest station queries |

### 5.5 Triggers and Automated Computations

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| trg_space_object_updated | space_object | BEFORE UPDATE | Sets updated_at = NOW() |
| trg_mission_updated | mission | BEFORE UPDATE | Sets updated_at = NOW() |
| trg_conjunction_updated | conjunction_event | BEFORE UPDATE | Sets updated_at = NOW() |
| trg_orbit_state_geom | orbit_state | BEFORE INSERT/UPDATE | Computes PostGIS geometry from x,y,z coordinates |
| trg_orbit_state_apsides | orbit_state | BEFORE INSERT/UPDATE | Computes apoapsis and periapsis from SMA and eccentricity |

---

## 6. DATABASE AND TABLE CREATION

### 6.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| RDBMS | PostgreSQL | 16 |
| Spatial Extension | PostGIS | 3.6.1 |
| Fuzzy Search | pg_trgm | 1.6 |
| Composite Indexing | btree_gist | 1.7 |
| Containerization | Docker | Latest |
| Backend API | Python / FastAPI | 3.11 / 0.115 |
| Orbit Propagation | SGP4 / Skyfield | 2.23 / 1.49 |

### 6.2 Database Creation

```sql
-- Database created via Docker environment variable:
-- POSTGRES_DB: orbita_registry
-- POSTGRES_USER: orbita_admin

-- Extensions enabled:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Schema creation:
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS tracking;
CREATE SCHEMA IF NOT EXISTS telemetry;
CREATE SCHEMA IF NOT EXISTS analytics;
```

### 6.3 Table Creation (DDL)

The complete DDL is implemented across SQL initialization scripts that execute automatically on database startup. Key excerpts:

#### SpaceObject Table

```sql
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
```

#### OrbitState Table

```sql
CREATE TABLE tracking.orbit_state (
    state_id            BIGSERIAL,
    object_id           BIGINT      NOT NULL
        REFERENCES catalog.space_object(object_id) ON DELETE CASCADE,
    epoch               TIMESTAMPTZ NOT NULL,
    position_x_km       DOUBLE PRECISION,
    position_y_km       DOUBLE PRECISION,
    position_z_km       DOUBLE PRECISION,
    velocity_x_km_s     DOUBLE PRECISION,
    velocity_y_km_s     DOUBLE PRECISION,
    velocity_z_km_s     DOUBLE PRECISION,
    reference_frame     VARCHAR(10) DEFAULT 'TEME'
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
    source              VARCHAR(30) DEFAULT 'TLE'
        CHECK (source IN ('TLE','RADAR','OPTICAL','GPS','PROPAGATED','MANEUVER')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (state_id, epoch)
);
```

#### ConjunctionEvent Table

```sql
CREATE TABLE analytics.conjunction_event (
    conjunction_id              BIGSERIAL       PRIMARY KEY,
    primary_object_id           BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    secondary_object_id         BIGINT          NOT NULL
        REFERENCES catalog.space_object(object_id),
    time_of_closest_approach    TIMESTAMPTZ     NOT NULL,
    miss_distance_km            DOUBLE PRECISION,
    collision_probability       DOUBLE PRECISION,
    relative_velocity_km_s      DOUBLE PRECISION,
    risk_level                  VARCHAR(20)     DEFAULT 'LOW'
        CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL','RED')),
    status                      VARCHAR(30)     DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','SCREENING','ANALYZED',
                          'MITIGATED','EXPIRED','FALSE_ALARM')),
    recommended_action          TEXT,
    created_at                  TIMESTAMPTZ     DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     DEFAULT NOW()
);
```

### 6.4 Sample Data Verification

The database is pre-populated with realistic seed data:

| Entity | Records | Examples |
|--------|---------|---------|
| Space Objects | 15 | ISS, Hubble, JWST, Starlink-2636, Chandrayaan-3, Cosmos 1408 debris |
| Ground Stations | 8 | Goldstone DSN, Canberra DSN, Madrid DSN, ISTRAC Bangalore, SvalSat |
| Orbit States | 4 | ISS (2 epochs), Hubble (1 epoch), Starlink (1 epoch) |
| Telemetry | 13 | ISS: voltage, battery, temperature, attitude; Hubble: current, payload status |
| Conjunction Events | 3 | ISS vs Cosmos 1408 debris (HIGH risk), Starlink vs CZ-5B (MEDIUM) |
| Space Weather | 3 | Solar flux, Kp index, geomagnetic storm readings |
| Missions | 3 | ISS Operations, Hubble Servicing, Starlink Gen2 |

### 6.5 Views Created

| View | Schema | Purpose |
|------|--------|---------|
| v_active_satellites | catalog | Active satellites with their latest orbital parameters |
| v_upcoming_alerts | analytics | High-risk conjunction events in the next 7 days |
| v_population_summary | catalog | Object counts grouped by type, orbit class, and status |
| v_latest_telemetry | telemetry | Most recent telemetry reading per satellite per subsystem |

### 6.6 Stored Functions

| Function | Schema | Purpose |
|----------|--------|---------|
| fn_set_updated_at() | catalog | Trigger function to auto-update timestamps |
| fn_set_position_geom() | tracking | Converts Cartesian (x,y,z) to PostGIS geometry |
| fn_compute_apsides() | tracking | Calculates apoapsis/periapsis from orbital elements |
| fn_objects_in_sphere() | tracking | Spatial query: find all objects within a radius of a point |
| fn_orbit_history() | tracking | Returns paginated orbit history for an object |
| fn_classify_risk() | analytics | Maps collision probability to risk level (LOW through RED) |

---

## 7. MACHINE LEARNING CAPABILITIES

ORBITA integrates three machine learning modules that operate on the data stored in the database to provide predictive intelligence beyond traditional query-based analytics.

### 7.1 Telemetry Anomaly Detection

| Attribute | Detail |
|-----------|--------|
| **Objective** | Detect abnormal satellite subsystem behavior before failures occur |
| **Model** | LSTM Autoencoder (sequence-to-sequence reconstruction) |
| **Input** | Time-series telemetry: voltage, current, temperature, battery SoC, attitude error |
| **Training Data** | Historical telemetry from `telemetry.satellite_telemetry` table |
| **Output** | Anomaly score (reconstruction error); alerts when score exceeds dynamic threshold |
| **Use Case** | Predictive maintenance -- flagging a gradual power bus voltage drop 48 hours before a subsystem failure |

**How It Works:**
1. Telemetry data is fetched from the database in sliding windows (e.g., 60 timesteps)
2. The LSTM autoencoder learns to reconstruct "normal" telemetry patterns during training
3. At inference, high reconstruction error indicates the current telemetry deviates from learned norms
4. Anomalies are scored and can be correlated with space weather events from the `analytics.space_weather` table

### 7.2 Debris Characterization (Object Classification)

| Attribute | Detail |
|-----------|--------|
| **Objective** | Automatically classify unknown tracked objects by type |
| **Model** | Random Forest / Gradient Boosting Classifier |
| **Input Features** | Semi-major axis, eccentricity, inclination, BSTAR drag term, radar cross-section, mean motion |
| **Classes** | PAYLOAD (active satellite), DEBRIS (fragmentation), ROCKET_BODY, UNKNOWN |
| **Training Data** | Labeled objects from `catalog.space_object` joined with `tracking.orbit_state` |
| **Output** | Predicted class + confidence score |
| **Use Case** | After a breakup event generates hundreds of new tracked objects, automatically classify each fragment |

**Feature Engineering:**
- Orbital elements are extracted from the latest epoch in `tracking.orbit_state`
- Derived features: orbital period, apoapsis/periapsis altitude, area-to-mass ratio (from BSTAR)
- Objects with known types serve as training labels; UNKNOWN objects are the prediction targets

### 7.3 Orbital Traffic Pattern Analysis

| Attribute | Detail |
|-----------|--------|
| **Objective** | Identify congested orbital regions and predict future congestion trends |
| **Model** | DBSCAN clustering + time-series forecasting |
| **Input** | 3D position vectors from `tracking.orbit_state`, binned by altitude/inclination shells |
| **Output** | Congestion density maps, cluster labels, trend forecasts |
| **Use Case** | Identifying that the 500-550 km / 53° inclination shell is approaching dangerous density levels |

**Analysis Pipeline:**
1. **Spatial Binning**: Orbit states are binned into altitude shells (50 km bands) and inclination bands (5° bands)
2. **Density Computation**: Object count per bin at each epoch, stored as time series
3. **Clustering**: DBSCAN identifies spatial clusters of objects that move as groups (e.g., constellation trains)
4. **Trend Forecasting**: Historical density time series is used to forecast future congestion using statistical models

### 7.4 ML Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         PostgreSQL + PostGIS                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ catalog.     │  │ tracking.    │  │ telemetry.           │    │
│  │ space_object │  │ orbit_state  │  │ satellite_telemetry  │    │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘    │
│         │                │                      │                │
└─────────┼────────────────┼──────────────────────┼────────────────┘
          │                │                      │
          ▼                ▼                      ▼
   ┌──────────────┐ ┌──────────────┐  ┌────────────────────┐
   │   Debris     │ │   Traffic    │  │  Anomaly Detection │
   │   Classifier │ │   Analyzer   │  │  (LSTM Autoencoder)│
   │  (RF / XGB)  │ │  (DBSCAN)   │  │                    │
   └──────┬───────┘ └──────┬───────┘  └────────┬───────────┘
          │                │                    │
          ▼                ▼                    ▼
   ┌──────────────────────────────────────────────────────┐
   │              FastAPI REST API (/api/v1/ml/...)       │
   │  /predict-type    /congestion     /anomaly-score     │
   └──────────────────────────────────────────────────────┘
```

---

## APPENDIX: Project Structure

```
ORBITA/
├── backend/
│   ├── app/
│   │   ├── api/routes/         # REST API endpoints (7 route modules)
│   │   ├── core/               # Configuration, database connection
│   │   ├── models/             # SQLAlchemy ORM models (8 models)
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # Business logic (TLE ingestion)
│   │   ├── ml/                 # Machine learning modules
│   │   │   ├── anomaly_detection.py    # LSTM autoencoder for telemetry
│   │   │   ├── debris_classifier.py    # Object type classification
│   │   │   └── traffic_analyzer.py     # Orbital congestion analysis
│   │   └── main.py             # FastAPI application entry point
│   ├── Dockerfile
│   └── requirements.txt
├── docker/
│   └── db.Dockerfile           # Custom PostgreSQL + PostGIS image
├── init-db/
│   ├── 01-extensions.sql       # Extension setup
│   ├── 02-schemas.sql          # Schema creation
│   ├── 03-tables.sql           # Table DDL with constraints & indexes
│   ├── 04-views.sql            # Database views
│   ├── 05-functions.sql        # Stored functions & triggers
│   ├── 06-seed-data.sql        # Sample data
│   └── 07-permissions.sql      # Role-based access control
├── docs/
│   └── Review-1.md             # This document
├── docker-compose.yml          # Multi-service orchestration
└── README.md
```

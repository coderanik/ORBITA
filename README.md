# ORBITA-ATSAD

**An Integrated Platform for Benchmarking and Operational Deployment of LLM-Based Anomaly Detection in Spacecraft Telemetry**

Built on top of **ORBITA** (Orbital Registry for Big Data, Intelligence, and Traffic Analysis), this platform integrates real-time spacecraft telemetry management with the ATSADBench evaluation framework to systematically test, visualize, and operationally deploy anomaly detection models — including Large Language Models (LLMs) — on aerospace time-series data.

---

## The Problem

Large Language Models (LLMs) are being proposed for aerospace anomaly detection, but their effectiveness remains under-examined due to:

- Complex, multivariate spacecraft telemetry data
- Misaligned evaluation metrics that don't reflect operational needs
- Absence of domain-specific knowledge in general-purpose LLMs

## Recent Development

The **ATSADBench** (Aerospace Time Series Anomaly Detection Benchmark) was recently released with:

- **9 tasks** covering univariate and multivariate spacecraft telemetry
- **108,000+ data points** from real and simulated missions
- **Novel user-oriented metrics**: Alarm Accuracy, Alarm Latency, Alarm Contiguity

### Preliminary Findings

| Scenario | LLM Performance |
|----------|----------------|
| Univariate tasks | ✅ Strong performance |
| Multivariate telemetry | ❌ Approaches random guessing |
| RAG augmentation | ⚠️ No significant improvement |
| Few-shot learning | ⚠️ Modest gains only |

## The Gap

The benchmark exists, but **nobody has built an integrated platform** that allows systematic testing, visualization, and operational deployment of these models.

## Our Novel Contribution

ORBITA-ATSAD bridges the gap between benchmark evaluation and operational deployment:

1. **ORBITA as the data backend** — Full spacecraft catalog, orbit tracking, and telemetry management
2. **ATSADBench evaluation framework as a service** — Register models, submit predictions, auto-compute all metrics
3. **Visualization dashboards** — Time-series anomaly detection results, leaderboards, per-channel analysis
4. **Extensible model registry** — Test your own novel detection methods alongside baselines
5. **Operational pipeline** — From benchmark validation to real-time anomaly monitoring

---

## Architecture

```
[External Data Sources: CelesTrak, Space-Track.org, NOAA SWPC]
        |
        v
[FastAPI Backend] <---> [PostgreSQL + PostGIS + TimescaleDB]
        |                         |
        v                         v
   [Redis Cache]          [Temporal + Spatial + ML Queries]
        |
        v
[ATSAD Benchmark Engine]    [React Frontend + CesiumJS] (coming soon)
   |          |
   v          v
[Model Registry]  [Evaluation Pipeline]
   |                    |
   v                    v
[Leaderboard]    [Anomaly Visualizations]
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Database** | PostgreSQL 15 + PostGIS + TimescaleDB |
| **Backend** | Python / FastAPI |
| **Orbit Propagation** | SGP4 / Skyfield |
| **ML Evaluation** | NumPy / ATSADBench metrics engine |
| **Cache** | Redis |
| **Frontend** | React + TypeScript + CesiumJS (planned) |
| **Containerization** | Docker + Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### 1. Clone & Start

```bash
git clone <repo-url> orbita-platform
cd orbita-platform

# Start all services (database + API + pgAdmin + Redis)
docker compose up -d
```

### 2. Verify

| Service | URL |
|---------|-----|
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Docs (ReDoc)** | http://localhost:8000/redoc |
| **pgAdmin** | http://localhost:8080 |
| **Health Check** | http://localhost:8000/health |

pgAdmin credentials: `admin@orbita.dev` / `admin123`
Add server: host=`orbita-db`, port=`5432`, db=`orbita_registry`, user=`orbita_admin`

### 3. API Endpoints

All routes are prefixed with `/api/v1`.

#### Core Catalog

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/space-objects` | GET, POST | Catalog of satellites, debris, rocket bodies |
| `/space-objects/{id}` | GET, PATCH, DELETE | Single object CRUD |
| `/space-objects/norad/{norad_id}` | GET | Lookup by NORAD ID |
| `/operators` | GET, POST | Space agencies and companies |
| `/launch-vehicles` | GET, POST | Rocket / launch vehicle catalog |
| `/launches` | GET, POST | Launch event records |
| `/missions` | GET, POST, PATCH | Mission management |

#### Tracking & Orbits

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/orbits/{object_id}` | GET, POST | Orbit state history |
| `/orbits/{object_id}/latest` | GET | Most recent orbit |
| `/orbits/batch` | POST | Batch orbit ingestion |
| `/observations` | GET, POST | Tracking observations (radar/optical) |
| `/observations/batch` | POST | Batch observation ingestion |
| `/propagations/{object_id}` | GET | Orbit propagation results |
| `/propagations/batch` | POST | Batch propagation ingestion |
| `/ground-stations` | GET, POST | Ground station catalog |

#### Telemetry

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/telemetry/{object_id}` | GET, POST | Satellite telemetry |
| `/telemetry/batch` | POST | Batch telemetry ingestion |

#### Analytics & Events

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/conjunctions` | GET, POST | Conjunction events |
| `/conjunctions/alerts` | GET | Active high-risk alerts |
| `/conjunctions/{id}` | GET, PATCH | Single event |
| `/maneuvers` | GET, POST, PATCH | Orbital maneuver logs |
| `/breakup-events` | GET, POST, PATCH | In-orbit breakup events |
| `/reentry-events` | GET, POST, PATCH | Atmospheric reentry events |
| `/space-weather` | GET, POST | Space weather data |
| `/space-weather/latest` | GET | Most recent observation |

#### ML & Anomaly Detection

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/anomaly-alerts` | GET, POST, PATCH | ML-detected anomaly alerts |
| `/anomaly-alerts/unacknowledged` | GET | Unacknowledged alerts |
| `/debris-classifications` | GET, POST, PATCH | ML debris type predictions |
| `/congestion-reports` | GET, POST | Orbital congestion analysis |

#### 🆕 ATSAD Benchmark

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/atsad/datasets` | GET, POST | ATSADBench dataset registry |
| `/atsad/models` | GET, POST, PATCH | Anomaly detection model registry |
| `/atsad/runs` | GET, POST, PATCH | Benchmark evaluation runs |
| `/atsad/runs/{id}/results` | GET | Results for a specific run |
| `/atsad/runs/{id}/detections` | GET | Detection events (for visualization) |
| `/atsad/evaluate` | POST | **Auto-compute all ATSADBench metrics** |
| `/atsad/results` | POST | Submit pre-computed results |
| `/atsad/detections/batch` | POST | Batch detection event ingestion |
| `/atsad/leaderboard` | GET | Benchmark leaderboard with dynamic sort |

#### Dashboard

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/stats/overview` | GET | Dashboard statistics |

## ATSADBench Metrics

ORBITA-ATSAD implements the complete ATSADBench evaluation framework:

### User-Oriented Metrics (Novel)

| Metric | Description | Range |
|--------|-------------|-------|
| **Alarm Accuracy** | Fraction of predicted alarms overlapping with true anomalies | 0–1 (higher = better) |
| **Alarm Latency** | Average delay from anomaly onset to first detection | 0+ time steps (lower = better) |
| **Alarm Contiguity** | Whether detections are fragmented within anomaly segments | 0–1 (higher = better) |
| **Composite Score** | Weighted combination of all ATSADBench metrics | 0–1 (higher = better) |

### Standard Metrics

- Precision, Recall, F1 Score, Accuracy, AUC-ROC, AUC-PR
- Point-Adjust Precision, Recall, and F1
- Operational: inference time, token usage (LLM cost tracking)

## Database Schema

### Schemas

- **catalog** — Space object master data, operators, launches, missions
- **tracking** — Orbit states, ground stations, observations, propagation results
- **telemetry** — Satellite health data (TimescaleDB hypertable)
- **analytics** — Conjunction events, space weather, maneuver logs, breakup/reentry events
- **ml** — Anomaly alerts, debris classification, congestion reports, **ATSAD benchmark**

### Key Features

- **Temporal data** via TimescaleDB hypertables for orbit states, telemetry, and space weather
- **Spatial indexing** via PostGIS for 3D position queries (ECEF coordinates, SRID 4978)
- **Auto-computed fields**: periapsis/apoapsis from Keplerian elements, PostGIS geometry from Cartesian coordinates
- **Uncertainty tracking**: 6x6 covariance matrices stored as JSONB
- **Risk classification**: Automated collision probability to risk-level mapping
- **ATSADBench evaluation engine**: Alarm Accuracy, Latency, Contiguity metrics computed server-side

## Project Structure

```
ORBITA/
├── backend/
│   ├── app/
│   │   ├── api/routes/         # FastAPI route handlers (19 modules)
│   │   │   ├── space_objects   # Core catalog CRUD
│   │   │   ├── operators       # Space agency management
│   │   │   ├── launch_vehicles # Rocket catalog
│   │   │   ├── launches        # Launch events
│   │   │   ├── missions        # Mission management
│   │   │   ├── orbits          # Orbit state tracking
│   │   │   ├── observations    # Radar/optical tracking
│   │   │   ├── propagations    # Orbit propagation results
│   │   │   ├── ground_stations # Ground station catalog
│   │   │   ├── telemetry       # Satellite health data
│   │   │   ├── conjunctions    # Collision risk assessment
│   │   │   ├── maneuvers       # Orbital maneuvers
│   │   │   ├── breakup_events  # In-orbit breakup events
│   │   │   ├── reentry_events  # Atmospheric reentry events
│   │   │   ├── space_weather   # Space weather data
│   │   │   ├── anomaly_alerts  # ML anomaly detection
│   │   │   ├── debris_classifications # ML debris typing
│   │   │   ├── congestion_reports     # Orbital congestion
│   │   │   ├── benchmark       # 🆕 ATSAD Benchmark
│   │   │   └── stats           # Dashboard statistics
│   │   ├── core/               # Config, database setup
│   │   ├── models/             # SQLAlchemy ORM models (23 models)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic
│   │   │   ├── tle_service     # TLE parsing from CelesTrak
│   │   │   └── atsad_evaluator # 🆕 ATSADBench metrics engine
│   │   └── main.py             # App entry point
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── init-db/                    # SQL scripts run on first DB start
│   ├── 01-extensions.sql
│   ├── 02-schemas.sql
│   ├── 03-tables.sql
│   ├── 04-views.sql
│   ├── 05-functions.sql
│   ├── 06-seed-data.sql
│   ├── 07-permissions.sql
│   ├── 08-atsad-benchmark.sql  # 🆕 ATSAD tables
│   └── 09-atsad-seed-data.sql  # 🆕 Benchmark datasets & models
├── frontend/                   # React + CesiumJS (planned)
├── docs/
├── docker-compose.yml
└── README.md
```

## Benchmark Workflow

```
1. Register Dataset    POST /api/v1/atsad/datasets
2. Register Model      POST /api/v1/atsad/models
3. Create Run          POST /api/v1/atsad/runs
4. Run Your Model      (external — your anomaly detection code)
5. Submit Predictions  POST /api/v1/atsad/evaluate   ← auto-computes all metrics
6. View Leaderboard    GET  /api/v1/atsad/leaderboard
7. Visualise Results   GET  /api/v1/atsad/runs/{id}/detections
```

## License

MIT

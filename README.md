# ORBITA

**Orbital Registry for Big Data, Intelligence, and Traffic Analysis**

A Space Domain Awareness (SDA) platform that integrates real-time and historical data streams to maintain a high-fidelity catalog of space objects. It provides automated orbit propagation, collision risk assessment, and operational decision support for safe and sustainable space operations.

---

## Architecture

```
[External Data Sources: CelesTrak, Space-Track.org, NOAA SWPC]
        |
        v
[FastAPI Backend] <---> [PostgreSQL + PostGIS + TimescaleDB]
        |                         |
        v                         v
   [Redis Cache]          [Temporal + Spatial Queries]
        |
        v
[React Frontend + CesiumJS]  (coming soon)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Database** | PostgreSQL 15 + PostGIS + TimescaleDB |
| **Backend** | Python / FastAPI |
| **Orbit Propagation** | SGP4 / Skyfield |
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

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/space-objects` | GET, POST | Catalog of satellites, debris, rocket bodies |
| `/space-objects/{id}` | GET, PATCH, DELETE | Single object CRUD |
| `/space-objects/norad/{norad_id}` | GET | Lookup by NORAD ID |
| `/orbits/{object_id}` | GET, POST | Orbit state history |
| `/orbits/{object_id}/latest` | GET | Most recent orbit |
| `/orbits/batch` | POST | Batch orbit ingestion |
| `/telemetry/{object_id}` | GET, POST | Satellite telemetry |
| `/telemetry/batch` | POST | Batch telemetry ingestion |
| `/conjunctions` | GET, POST | Conjunction events |
| `/conjunctions/alerts` | GET | Active high-risk alerts |
| `/conjunctions/{id}` | GET, PATCH | Single event |
| `/ground-stations` | GET, POST | Ground station catalog |
| `/space-weather` | GET, POST | Space weather data |
| `/space-weather/latest` | GET | Most recent observation |
| `/stats/overview` | GET | Dashboard statistics |

## Database Schema

### Schemas

- **catalog** - Space object master data, missions
- **tracking** - Orbit states (TimescaleDB hypertable), ground stations
- **telemetry** - Satellite health data (TimescaleDB hypertable)
- **analytics** - Conjunction events, space weather, maneuver logs

### Key Features

- **Temporal data** via TimescaleDB hypertables for orbit states, telemetry, and space weather
- **Spatial indexing** via PostGIS for 3D position queries (ECEF coordinates, SRID 4978)
- **Auto-computed fields**: periapsis/apoapsis from Keplerian elements, PostGIS geometry from Cartesian coordinates
- **Uncertainty tracking**: 6x6 covariance matrices stored as JSONB
- **Risk classification**: Automated collision probability to risk-level mapping

## Project Structure

```
ORBITA/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # FastAPI route handlers
│   │   ├── core/            # Config, database setup
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic (TLE parsing, etc.)
│   │   └── main.py          # App entry point
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── init-db/                 # SQL scripts run on first DB start
│   ├── 01-extensions.sql
│   ├── 02-schemas.sql
│   ├── 03-tables.sql
│   ├── 04-views.sql
│   ├── 05-functions.sql
│   ├── 06-seed-data.sql
│   └── 07-permissions.sql
├── frontend/                # React + CesiumJS (planned)
├── docs/
├── docker-compose.yml
└── README.md
```

## License

MIT

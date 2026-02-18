# PostgreSQL 16 + PostGIS (Debian bookworm, native ARM64 + AMD64)
FROM postgres:16-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-16-postgis-3 \
        postgresql-16-postgis-3-scripts \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

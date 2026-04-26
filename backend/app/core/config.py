"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "ORBITA-ATSAD"
    APP_VERSION: str = "0.2.0"
    APP_DESCRIPTION: str = (
        "Integrated Platform for Benchmarking and Operational Deployment "
        "of LLM-Based Anomaly Detection in Spacecraft Telemetry"
    )
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ── Auth ───────────────────────────────────────────────────
    SECRET_KEY: str = "orbita_super_secret_jwt_key_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://orbita_admin:orbita_secret_2026@localhost:5432/orbita_registry"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://orbita_admin:orbita_secret_2026@localhost:5432/orbita_registry"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── External APIs ─────────────────────────────────────────
    SPACETRACK_USERNAME: str = ""
    SPACETRACK_PASSWORD: str = ""
    SPACETRACK_BASE_URL: str = "https://www.space-track.org"
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai"

    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8085"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()

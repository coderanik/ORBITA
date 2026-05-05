"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import model_validator
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
    # ── External APIs ─────────────────────────────────────────
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai"

    # ── CORS ──────────────────────────────────────────────────
    # Accepts a comma-separated string from env, e.g.:
    # CORS_ORIGINS=https://orbiita.vercel.app,https://orbita-64lu.onrender.com
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8085"

    @model_validator(mode="after")
    def normalise_settings(self) -> "Settings":
        """Post-process settings after loading from environment."""
        # ── CORS: split comma-separated string into a list ────
        if isinstance(self.CORS_ORIGINS, str):
            self._cors_origins_list = [
                origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
            ]
        else:
            self._cors_origins_list = list(self.CORS_ORIGINS)

        # ── Database URL normalisation ────────────────────────
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            self.DATABASE_URL = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            self.DATABASE_URL = url.replace("postgres://", "postgresql+asyncpg://", 1)

        sync = self.DATABASE_URL_SYNC
        if sync.startswith("postgresql://") or sync.startswith("postgres://"):
            self.DATABASE_URL_SYNC = sync.replace(
                "postgres://", "postgresql+psycopg2://", 1
            ).replace(
                "postgresql://", "postgresql+psycopg2://", 1
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Parsed list of CORS origin URLs."""
        return getattr(self, "_cors_origins_list", self.CORS_ORIGINS.split(","))

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()

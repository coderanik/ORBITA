from app.core.config import Settings


def test_production_database_urls_require_driver_specific_tls() -> None:
    settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@example.com/db?sslmode=require",
        DATABASE_URL_SYNC="postgresql://user:pass@example.com/db?ssl=require",
    )

    assert settings.DATABASE_URL == (
        "postgresql+asyncpg://user:pass@example.com/db?ssl=require"
    )
    assert settings.DATABASE_URL_SYNC == (
        "postgresql+psycopg2://user:pass@example.com/db?sslmode=require"
    )


def test_development_database_urls_do_not_force_tls() -> None:
    settings = Settings(
        ENVIRONMENT="development",
        DATABASE_URL="postgresql://user:pass@localhost/db",
        DATABASE_URL_SYNC="postgresql://user:pass@localhost/db",
    )

    assert settings.DATABASE_URL.endswith("@localhost/db")
    assert settings.DATABASE_URL_SYNC.endswith("@localhost/db")

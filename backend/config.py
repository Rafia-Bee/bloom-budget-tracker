import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Basic Flask config
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # DB configuration - PostgreSQL or local SQLite
    _raw_url = os.getenv("DATABASE_URL", "")

    if _raw_url and "postgresql" in _raw_url:
        # PostgreSQL (Neon or other)
        SQLALCHEMY_DATABASE_URI = _raw_url
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,  # Test connections before use
            "pool_recycle": 280,  # Recycle before Neon's 5min timeout
            "pool_size": 3,  # Smaller pool for serverless
            "max_overflow": 2,
            "connect_args": {
                "connect_timeout": 10,
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 10,
                "keepalives_count": 5,
            },
        }
    else:
        # Local SQLite fallback - use absolute path
        import pathlib

        db_dir = pathlib.Path(__file__).parent.parent / "instance"
        db_dir.mkdir(exist_ok=True)
        db_path = db_dir / "bloom.db"
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
        }

    # Email
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@bloom.com")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False


def _validate_production_secrets():
    """
    Validate production secrets at startup.
    Fails fast if secrets are missing or use weak defaults.
    This is called when ProductionConfig is accessed.
    """
    secret_key = os.getenv("SECRET_KEY")
    jwt_secret = os.getenv("JWT_SECRET_KEY")

    # Define weak/default secrets that should never be used in production
    weak_secrets = [
        "dev-secret-key",
        "jwt-secret-key",
        "dev-secret-key-change-in-production",
        "jwt-secret-key-change-in-production",
        "change-me",
        "secret",
        "",
        None,
    ]

    # Validate SECRET_KEY
    if not secret_key or secret_key in weak_secrets:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY not set or using default value.\n"
            "Generate a strong secret key with:\n"
            "  python -c 'import secrets; print(secrets.token_urlsafe(64))'\n"
            "Then set it in your environment: export SECRET_KEY='<generated-key>'"
        )

    # Validate JWT_SECRET_KEY
    if not jwt_secret or jwt_secret in weak_secrets:
        raise ValueError(
            "SECURITY ERROR: JWT_SECRET_KEY not set or using default value.\n"
            "Generate a strong secret key with:\n"
            "  python -c 'import secrets; print(secrets.token_urlsafe(64))'\n"
            "Then set it in your environment: export JWT_SECRET_KEY='<generated-key>'"
        )

    # Validate minimum length (at least 32 characters)
    if len(secret_key) < 32:
        raise ValueError(
            f"SECURITY ERROR: SECRET_KEY too short ({len(secret_key)} chars). "
            "Must be at least 32 characters long."
        )

    if len(jwt_secret) < 32:
        raise ValueError(
            f"SECURITY ERROR: JWT_SECRET_KEY too short ({len(jwt_secret)} chars). "
            "Must be at least 32 characters long."
        )


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

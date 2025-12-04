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

    # DB configuration - handle Turso or local SQLite
    _raw_url = os.getenv("DATABASE_URL", "")
    _token = os.getenv("TURSO_AUTH_TOKEN", "")

    if _raw_url and "turso.io" in _raw_url:
        # Turso setup - normalize URL format
        if _raw_url.startswith("libsql://"):
            _raw_url = _raw_url.replace("libsql://", "libsql+https://", 1)
        elif _raw_url.startswith("https://"):
            _raw_url = _raw_url.replace("https://", "libsql+https://", 1)
        elif not _raw_url.startswith("libsql+https://"):
            # No scheme - add it
            _raw_url = f"libsql+https://{_raw_url}"

        # Append auth token
        if _token and "authToken=" not in _raw_url:
            _sep = "&" if "?" in _raw_url else "?"
            _raw_url = f"{_raw_url}{_sep}authToken={_token}"

        SQLALCHEMY_DATABASE_URI = _raw_url
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
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


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

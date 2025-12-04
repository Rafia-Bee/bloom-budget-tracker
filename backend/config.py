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

    # Load raw DB values
    raw_url = os.getenv("DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")

    # --- TURSO CONFIG -------------------------------------------------
    if raw_url and "turso.io" in raw_url:
        SQLALCHEMY_DATABASE_URI = f"sqlite+libsql:///?url={raw_url}&authToken={token}"

        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
        }

    else:
        # --- LOCAL SQLITE (dev fallback) ------------------------------
        db_path = os.getenv("DB_PATH", "instance/bloom.db")
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"

        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "connect_args": {"check_same_thread": False},
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

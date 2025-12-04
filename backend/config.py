import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    def __init__(self):
        # Basic Flask config
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
        self.JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

        # DB configuration
        raw_url = os.getenv("DATABASE_URL")
        token = os.getenv("TURSO_AUTH_TOKEN")

        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        # Most reliable Turso URL format
        if raw_url and "turso.io" in raw_url:
            # Normalize prefix
            if raw_url.startswith("libsql://"):
                raw_url = raw_url.replace("libsql://", "libsql+https://", 1)
            if raw_url.startswith("https://"):
                raw_url = raw_url.replace("https://", "libsql+https://", 1)

            # Append token
            if token and "authToken=" not in raw_url:
                sep = "&" if "?" in raw_url else "?"
                raw_url = f"{raw_url}{sep}authToken={token}"

            self.SQLALCHEMY_DATABASE_URI = raw_url

            # No connect_args needed for libsql
            self.SQLALCHEMY_ENGINE_OPTIONS = {
                "pool_pre_ping": True,
                "pool_recycle": 300,
            }

        else:
            # Default fallback (local dev)
            db_path = "instance/bloom.db"
            self.SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
            self.SQLALCHEMY_ENGINE_OPTIONS = {
                "pool_pre_ping": True,
                "pool_recycle": 300,
            }

        # Email
        self.SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
        self.SENDGRID_FROM_EMAIL = os.getenv(
            "SENDGRID_FROM_EMAIL", "noreply@bloom.com")
        self.FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


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

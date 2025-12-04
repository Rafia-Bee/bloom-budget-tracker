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

        # Load raw DB values
        raw_url = os.getenv("DATABASE_URL")
        token = os.getenv("TURSO_AUTH_TOKEN")

        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        # --- TURSO CONFIG -------------------------------------------------
        if raw_url and "turso.io" in raw_url:
            # REQUIRED: SQLAlchemy + libsql-client URI format
            self.SQLALCHEMY_DATABASE_URI = (
                f"sqlite+libsql:///?url={raw_url}&authToken={token}"
            )

            # Engine settings for Turso
            self.SQLALCHEMY_ENGINE_OPTIONS = {
                "pool_pre_ping": True,
                "pool_recycle": 300,
            }

        else:
            # --- LOCAL SQLITE (dev fallback) ------------------------------
            db_path = os.getenv("DB_PATH", "instance/bloom.db")
            self.SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"

            self.SQLALCHEMY_ENGINE_OPTIONS = {
                "pool_pre_ping": True,
                "pool_recycle": 300,
                "connect_args": {"check_same_thread": False},
            }

        # Email
        self.SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
        self.SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@bloom.com")
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

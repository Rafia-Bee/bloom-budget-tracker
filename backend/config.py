"""
Bloom - Configuration

This module contains configuration settings for the Flask application.
Loads environment variables and defines config classes for different environments.

Config Classes:
- Config: Base configuration
- DevelopmentConfig: Development environment settings
- ProductionConfig: Production environment settings
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # Database configuration
    # Supports: SQLite (local), Turso (libSQL cloud), PostgreSQL (scaling)
    database_url = os.getenv("DATABASE_URL")
    turso_auth_token = os.getenv("TURSO_AUTH_TOKEN")

    if not database_url:
        # Default: Local SQLite
        db_path = os.getenv("DB_PATH", "instance/bloom.db")
        database_url = f"sqlite:///{db_path}"
    elif database_url.startswith("libsql://"):
        # Turso (libSQL) - add auth token to URL and convert format
        # libsql://db.turso.io?authToken=xxx -> libsql://db.turso.io?authToken=xxx
        if turso_auth_token and "authToken" not in database_url:
            database_url = f"{database_url}?authToken={turso_auth_token}"
        # Don't add sqlite+ prefix - libsql:// is the correct dialect
    elif database_url.startswith("postgres://"):
        # Fix Render's postgres:// to postgresql://
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = database_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Engine options
    engine_options = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # Add secure flag for Turso
    if database_url and "libsql" in database_url:
        engine_options["connect_args"] = {"secure": True}

    SQLALCHEMY_ENGINE_OPTIONS = engine_options

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # Extended for offline PWA usage
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    CREDIT_CARD_LIMIT = int(os.getenv("CREDIT_CARD_LIMIT", 1500))

    # Email configuration
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@bloom-budget.com")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    FLASK_ENV = "development"
    USE_RELOADER = False  # Disable auto-reloader to prevent server restarts

    # Override for SQLite - no SSL config
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False

    # SSL configuration for PostgreSQL only
    database_url = os.getenv("DATABASE_URL", "sqlite:///bloom.db")
    if database_url.startswith(("postgres://", "postgresql://")):
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "connect_args": {"sslmode": "require"},
        }
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
        }


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

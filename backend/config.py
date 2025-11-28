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
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Handle DATABASE_URL and fix postgres:// to postgresql://
    database_url = os.getenv('DATABASE_URL', 'sqlite:///bloom.db')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = database_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    JWT_SECRET_KEY = os.getenv(
        'JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=24)  # Extended for offline PWA usage
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    CREDIT_CARD_LIMIT = int(os.getenv('CREDIT_CARD_LIMIT', 1500))


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    FLASK_ENV = 'development'
    USE_RELOADER = False  # Disable auto-reloader to prevent server restarts

    # Override for SQLite - no SSL config
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False

    # SSL configuration for PostgreSQL
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'sslmode': 'require'
        }
    }


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

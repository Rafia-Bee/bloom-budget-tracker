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
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///bloom.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # Extended for offline PWA usage
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    CREDIT_CARD_LIMIT = int(os.getenv('CREDIT_CARD_LIMIT', 1500))


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    FLASK_ENV = 'development'
    USE_RELOADER = False  # Disable auto-reloader to prevent server restarts


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

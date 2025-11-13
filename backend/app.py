"""
Bloom - Flask Application

This is the main Flask application entry point.
Initializes the app, database, and registers routes.

Functions:
- create_app: Factory function to create and configure Flask app
"""

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from backend.config import config
from backend.models.database import db
from backend.routes.auth import auth_bp
from backend.routes.expenses import expenses_bp


def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    CORS(app)

    db.init_app(app)

    jwt = JWTManager(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(expenses_bp)

    with app.app_context():
        db.create_all()

    @app.route('/')
    def index():
        return {'message': 'Bloom API - Financial Habits That Grow With You'}

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000)

"""
API Version 1 Blueprint

Aggregates all v1 API routes under /api/v1 prefix.
Provides versioned API structure for backward compatibility.
"""

from flask import Blueprint
from backend.routes.auth import auth_bp
from backend.routes.expenses import expenses_bp
from backend.routes.income import income_bp
from backend.routes.budget_periods import budget_periods_bp
from backend.routes.debts import debts_bp
from backend.routes.recurring_expenses import recurring_expenses_bp
from backend.routes.recurring_generation import recurring_generation_bp
from backend.routes.salary_periods import salary_periods_bp
from backend.routes.password_reset import password_reset_bp
from backend.routes.export_import import export_import_bp
from backend.routes.user_data import user_data_bp
from backend.routes.subcategories import subcategories_bp
from backend.routes.goals import goals_bp


def create_v1_blueprint():
    """
    Create and configure API v1 blueprint with all routes
    """
    v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")

    # Register all route blueprints under v1
    v1_bp.register_blueprint(auth_bp)
    v1_bp.register_blueprint(expenses_bp)
    v1_bp.register_blueprint(income_bp, url_prefix="/income")
    v1_bp.register_blueprint(budget_periods_bp)
    v1_bp.register_blueprint(debts_bp)
    v1_bp.register_blueprint(recurring_expenses_bp, url_prefix="/recurring-expenses")
    v1_bp.register_blueprint(
        recurring_generation_bp, url_prefix="/recurring-generation"
    )
    v1_bp.register_blueprint(salary_periods_bp, url_prefix="/salary-periods")
    v1_bp.register_blueprint(password_reset_bp, url_prefix="/auth")
    v1_bp.register_blueprint(export_import_bp)
    v1_bp.register_blueprint(user_data_bp, url_prefix="/user-data")
    v1_bp.register_blueprint(subcategories_bp)
    v1_bp.register_blueprint(goals_bp, url_prefix="/goals")

    return v1_bp

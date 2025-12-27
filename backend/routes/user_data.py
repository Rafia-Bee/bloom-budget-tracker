"""
Bloom - User Data Management Routes

Endpoints for user data operations including data deletion.
WARNING: These operations are destructive and cannot be undone!
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import (
    db,
    User,
    Expense,
    Income,
    BudgetPeriod,
    SalaryPeriod,
    Debt,
    RecurringExpense,
    Subcategory,
    Goal,
)
from backend.services.audit_service import log_admin_event
from sqlalchemy.exc import SQLAlchemyError

user_data_bp = Blueprint("user_data", __name__)


@user_data_bp.route("/delete-all", methods=["POST"])
@jwt_required()
def delete_all_user_data():
    """
    Delete ALL user data except the user account itself.

    This removes:
    - All expenses
    - All income entries
    - All budget periods
    - All salary periods
    - All debts
    - All recurring expenses
    - All goals
    - All custom subcategories

    The user account and login credentials remain intact.

    ⚠️ WARNING: THIS OPERATION CANNOT BE UNDONE!
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Require confirmation text
        confirmation = data.get("confirmation", "").strip()
        if confirmation != "Delete everything":
            return (
                jsonify(
                    {
                        "error": "Invalid confirmation text. You must type exactly: Delete everything"
                    }
                ),
                400,
            )

        # Count records before deletion (for confirmation message)
        expense_count = Expense.query.filter_by(user_id=current_user_id).count()
        income_count = Income.query.filter_by(user_id=current_user_id).count()
        budget_period_count = BudgetPeriod.query.filter_by(
            user_id=current_user_id
        ).count()
        salary_period_count = SalaryPeriod.query.filter_by(
            user_id=current_user_id
        ).count()
        debt_count = Debt.query.filter_by(user_id=current_user_id).count()
        recurring_count = RecurringExpense.query.filter_by(
            user_id=current_user_id
        ).count()
        goal_count = Goal.query.filter_by(user_id=current_user_id).count()
        subcategory_count = Subcategory.query.filter_by(user_id=current_user_id).count()

        total_records = (
            expense_count
            + income_count
            + budget_period_count
            + salary_period_count
            + debt_count
            + recurring_count
            + goal_count
            + subcategory_count
        )

        # Delete all data (order matters due to foreign keys)
        Expense.query.filter_by(user_id=current_user_id).delete()
        Income.query.filter_by(user_id=current_user_id).delete()
        BudgetPeriod.query.filter_by(user_id=current_user_id).delete()
        SalaryPeriod.query.filter_by(user_id=current_user_id).delete()
        Debt.query.filter_by(user_id=current_user_id).delete()
        RecurringExpense.query.filter_by(user_id=current_user_id).delete()
        Goal.query.filter_by(user_id=current_user_id).delete()
        Subcategory.query.filter_by(user_id=current_user_id).delete()

        db.session.commit()

        # Audit log this critical operation
        log_admin_event(
            "delete_all_user_data",
            {
                "total_records": total_records,
                "expenses": expense_count,
                "income": income_count,
                "debts": debt_count,
                "goals": goal_count,
            },
        )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "All user data successfully deleted",
                    "deleted_records": {
                        "expenses": expense_count,
                        "income": income_count,
                        "budget_periods": budget_period_count,
                        "salary_periods": salary_period_count,
                        "debts": debt_count,
                        "recurring_expenses": recurring_count,
                        "goals": goal_count,
                        "subcategories": subcategory_count,
                        "total": total_records,
                    },
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[delete_all_user_data] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to delete user data. Please try again."}), 500


@user_data_bp.route("/settings/recurring-lookahead", methods=["GET"])
@jwt_required()
def get_recurring_lookahead():
    """
    Get the user's recurring expense lookahead setting.

    Returns:
        - recurring_lookahead_days: Number of days to look ahead (7-90)
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"recurring_lookahead_days": user.recurring_lookahead_days}), 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_recurring_lookahead] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to load settings. Please try again."}), 500


@user_data_bp.route("/settings/recurring-lookahead", methods=["PUT"])
@jwt_required()
def update_recurring_lookahead():
    """
    Update the user's recurring expense lookahead setting.

    Body:
        - recurring_lookahead_days: Number of days (7-90)

    Returns:
        - Success message with updated value
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        days = data.get("recurring_lookahead_days")

        if days is None:
            return jsonify({"error": "recurring_lookahead_days is required"}), 400

        # Validate range
        try:
            days = int(days)
        except (ValueError, TypeError):
            return jsonify({"error": "recurring_lookahead_days must be a number"}), 400

        if days < 7 or days > 90:
            return (
                jsonify(
                    {"error": "recurring_lookahead_days must be between 7 and 90 days"}
                ),
                400,
            )

        user.recurring_lookahead_days = days
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Recurring lookahead setting updated successfully",
                    "recurring_lookahead_days": days,
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[update_recurring_lookahead] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to update settings. Please try again."}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@user_data_bp.route("/settings/default-currency", methods=["GET"])
@jwt_required()
def get_default_currency():
    """
    Get the user's default currency setting.

    Returns:
        - default_currency: ISO 4217 currency code (e.g., 'EUR')
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"default_currency": user.default_currency}), 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_default_currency] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to load settings. Please try again."}), 500


@user_data_bp.route("/settings/default-currency", methods=["PUT"])
@jwt_required()
def update_default_currency():
    """
    Update the user's default currency setting.

    Body:
        - default_currency: ISO 4217 currency code (e.g., 'EUR', 'USD', 'GBP')

    Returns:
        - Success message with updated value
    """
    from backend.services.currency_service import SUPPORTED_CURRENCIES

    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        currency = data.get("default_currency")

        if not currency:
            return jsonify({"error": "default_currency is required"}), 400

        currency = currency.upper()
        if currency not in SUPPORTED_CURRENCIES:
            return (
                jsonify(
                    {
                        "error": f"Invalid currency. Supported: {', '.join(SUPPORTED_CURRENCIES)}"
                    }
                ),
                400,
            )

        user.default_currency = currency
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Default currency updated successfully",
                    "default_currency": currency,
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[update_default_currency] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to update settings. Please try again."}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

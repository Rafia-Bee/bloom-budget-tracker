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
    RecurringIncome,
    Subcategory,
    Goal,
)
from backend.services.audit_service import log_admin_event
from sqlalchemy import func, and_, or_
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
    - All recurring income
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
        recurring_income_count = RecurringIncome.query.filter_by(
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
            + recurring_income_count
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
        RecurringIncome.query.filter_by(user_id=current_user_id).delete()
        Goal.query.filter_by(user_id=current_user_id).delete()
        Subcategory.query.filter_by(user_id=current_user_id).delete()

        # Reset User balance tracking fields (Issue #149)
        # Without this, deleted data would still affect new salary periods
        user = User.query.get(current_user_id)
        if user:
            user.balance_start_date = None
            user.user_initial_debit_balance = 0
            user.user_initial_credit_limit = 0
            user.user_initial_credit_debt = 0
            # Keep balance_mode - it's a preference, not data

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
        user = db.session.get(User, current_user_id)

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
        user = db.session.get(User, current_user_id)

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
        user = db.session.get(User, current_user_id)

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
        user = db.session.get(User, current_user_id)

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


# Valid balance modes
VALID_BALANCE_MODES = ["sync", "budget"]


@user_data_bp.route("/settings/balance-mode", methods=["GET"])
@jwt_required()
def get_balance_mode():
    """
    Get the user's balance mode setting.

    Balance Modes:
    - "sync": Sync with Bank - balances cumulate across periods
    - "budget": Budget Tracker - each period is isolated

    Returns:
        - balance_mode: Current mode ("sync" or "budget")
        - balance_start_date: When balance tracking started
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        return (
            jsonify(
                {
                    "balance_mode": user.balance_mode,
                    "balance_start_date": (
                        user.balance_start_date.isoformat()
                        if user.balance_start_date
                        else None
                    ),
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        current_app.logger.error(f"[get_balance_mode] Error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to load settings. Please try again."}), 500


@user_data_bp.route("/settings/balance-mode", methods=["PUT"])
@jwt_required()
def update_balance_mode():
    """
    Update the user's balance mode setting.

    Body:
        - balance_mode: "sync" or "budget"

    Balance Modes:
    - "sync": Sync with Bank - balances cumulate across all periods
    - "budget": Budget Tracker - each period has isolated balance

    Returns:
        - Success message with updated value
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        mode = data.get("balance_mode")

        if not mode:
            return jsonify({"error": "balance_mode is required"}), 400

        mode = mode.lower()
        if mode not in VALID_BALANCE_MODES:
            return (
                jsonify(
                    {
                        "error": f"Invalid balance mode. Must be one of: {', '.join(VALID_BALANCE_MODES)}"
                    }
                ),
                400,
            )

        user.balance_mode = mode
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Balance mode updated successfully",
                    "balance_mode": mode,
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[update_balance_mode] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to update settings. Please try again."}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@user_data_bp.route("/settings/global-balances", methods=["GET"])
@jwt_required()
def get_global_balances():
    """
    Get the user's current global balances (for use when no salary period exists).

    In SYNC mode, this calculates the running balance from:
    - User's initial balance settings
    - All income (excluding 'Initial Balance' type which is already in initial balance)
    - All expenses

    Returns:
        - debit_balance: Current debit card balance (cents)
        - credit_available: Available credit (cents)
        - credit_limit: Credit card limit (cents)
        - balance_mode: Current mode
        - has_initial_balances: Whether user has set up initial balances
        - period_income: Income in viewing window (0 if no period)
        - all_time_spent: Total debit spending ever
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if user has set up initial balances
        has_initial_balances = user.balance_start_date is not None

        if not has_initial_balances:
            return (
                jsonify(
                    {
                        "debit_balance": 0,
                        "credit_available": 0,
                        "credit_limit": 0,
                        "balance_mode": user.balance_mode,
                        "has_initial_balances": False,
                        "period_income": 0,
                        "all_time_spent": 0,
                    }
                ),
                200,
            )

        # Calculate global balance based on mode
        if user.balance_mode == "sync":
            # SYNC MODE: Calculate cumulative balance from all time

            # Total income (excluding 'Initial Balance' entries)
            total_income = (
                db.session.query(func.coalesce(func.sum(Income.amount), 0))
                .filter(
                    and_(
                        Income.user_id == current_user_id,
                        Income.deleted_at.is_(None),
                        Income.type != "Initial Balance",
                    )
                )
                .scalar()
                or 0
            )

            # Total debit expenses
            total_debit_expenses = (
                db.session.query(func.coalesce(func.sum(Expense.amount), 0))
                .filter(
                    and_(
                        Expense.user_id == current_user_id,
                        Expense.deleted_at.is_(None),
                        Expense.payment_method == "Debit card",
                    )
                )
                .scalar()
                or 0
            )

            # Total credit expenses (exclude Debt category - those are just markers)
            total_credit_expenses = (
                db.session.query(func.coalesce(func.sum(Expense.amount), 0))
                .filter(
                    and_(
                        Expense.user_id == current_user_id,
                        Expense.deleted_at.is_(None),
                        Expense.payment_method == "Credit card",
                        Expense.category != "Debt",  # Exclude debt markers
                    )
                )
                .scalar()
                or 0
            )

            # Total credit card payments (reduce debt, increase available)
            total_credit_payments = (
                db.session.query(func.coalesce(func.sum(Expense.amount), 0))
                .filter(
                    and_(
                        Expense.user_id == current_user_id,
                        Expense.deleted_at.is_(None),
                        Expense.category == "Debt Payments",
                        Expense.subcategory == "Credit Card",
                    )
                )
                .scalar()
                or 0
            )

            # Calculate debit balance: initial + income - debit expenses
            debit_balance = (
                user.user_initial_debit_balance + total_income - total_debit_expenses
            )

            # Calculate credit available: initial available + payments - expenses
            credit_available = (
                user.user_initial_credit_available
                + total_credit_payments
                - total_credit_expenses
            )

            # Cap at limit (can't have more available than limit)
            credit_limit = user.user_initial_credit_limit
            credit_available = min(credit_available, credit_limit)
            credit_available = max(credit_available, 0)  # Can't be negative

        else:
            # BUDGET MODE: No global balance concept, just return initial settings
            debit_balance = user.user_initial_debit_balance
            credit_available = user.user_initial_credit_available
            credit_limit = user.user_initial_credit_limit

        # All-time debit spending (excluding fixed bills)
        all_time_spent = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.deleted_at.is_(None),
                    Expense.payment_method == "Debit card",
                    Expense.is_fixed_bill == False,
                )
            )
            .scalar()
            or 0
        )

        # Total income (all time)
        total_income_all_time = (
            db.session.query(func.coalesce(func.sum(Income.amount), 0))
            .filter(
                and_(
                    Income.user_id == current_user_id,
                    Income.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        return (
            jsonify(
                {
                    "debit_balance": debit_balance,
                    "credit_available": credit_available,
                    "credit_limit": credit_limit,
                    "balance_mode": user.balance_mode,
                    "has_initial_balances": True,
                    "period_income": 0,  # No period, so 0
                    "all_time_spent": all_time_spent,
                    "total_income": total_income_all_time,
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_global_balances] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to load balances. Please try again."}), 500


# Valid payment date adjustment modes (Issue #177)
VALID_PAYMENT_DATE_ADJUSTMENTS = ["exact_date", "previous_workday", "next_workday"]


@user_data_bp.route("/settings/payment-date-adjustment", methods=["GET"])
@jwt_required()
def get_payment_date_adjustment():
    """
    Get the user's payment date adjustment setting for recurring income.

    Adjustment Modes:
    - "exact_date": No adjustment - use scheduled date as-is
    - "previous_workday": If falls on weekend, use Friday before
    - "next_workday": If falls on weekend, use Monday after

    Returns:
        - payment_date_adjustment: Current setting
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        return (
            jsonify(
                {
                    "payment_date_adjustment": user.payment_date_adjustment,
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_payment_date_adjustment] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to load settings. Please try again."}), 500


@user_data_bp.route("/settings/payment-date-adjustment", methods=["PUT"])
@jwt_required()
def update_payment_date_adjustment():
    """
    Update the user's payment date adjustment setting for recurring income.

    Body:
        - payment_date_adjustment: "exact_date", "previous_workday", or "next_workday"

    Returns:
        - Success message with updated value
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        adjustment = data.get("payment_date_adjustment")

        if not adjustment:
            return jsonify({"error": "payment_date_adjustment is required"}), 400

        adjustment = adjustment.lower()
        if adjustment not in VALID_PAYMENT_DATE_ADJUSTMENTS:
            return (
                jsonify(
                    {
                        "error": f"Invalid adjustment. Must be one of: {', '.join(VALID_PAYMENT_DATE_ADJUSTMENTS)}"
                    }
                ),
                400,
            )

        user.payment_date_adjustment = adjustment
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Payment date adjustment updated successfully",
                    "payment_date_adjustment": adjustment,
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[update_payment_date_adjustment] Error: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to update settings. Please try again."}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

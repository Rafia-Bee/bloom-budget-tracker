"""
Bloom - User Data Management Routes

Endpoints for user data operations including data deletion.
WARNING: These operations are destructive and cannot be undone!
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import (
    db,
    Expense,
    Income,
    BudgetPeriod,
    SalaryPeriod,
    Debt,
    RecurringExpense,
)

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

        total_records = (
            expense_count
            + income_count
            + budget_period_count
            + salary_period_count
            + debt_count
            + recurring_count
        )

        # Delete all data (order matters due to foreign keys)
        Expense.query.filter_by(user_id=current_user_id).delete()
        Income.query.filter_by(user_id=current_user_id).delete()
        BudgetPeriod.query.filter_by(user_id=current_user_id).delete()
        SalaryPeriod.query.filter_by(user_id=current_user_id).delete()
        Debt.query.filter_by(user_id=current_user_id).delete()
        RecurringExpense.query.filter_by(user_id=current_user_id).delete()

        db.session.commit()

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
                        "total": total_records,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

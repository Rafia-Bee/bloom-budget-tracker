"""
Bloom - Recurring Expenses Routes

CRUD endpoints for managing recurring expense templates.
Handles creation, retrieval, updates, and deletion of recurring expenses.
Also includes export/import for testing purposes.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, RecurringExpense, SalaryPeriod
from datetime import datetime, timedelta
from sqlalchemy import and_
from sqlalchemy.exc import SQLAlchemyError
import json

recurring_expenses_bp = Blueprint("recurring_expenses", __name__)


def calculate_budget_impact(user_id):
    """
    Calculate the budget impact of current fixed bills on the active salary period.
    Returns None if no active salary period exists.
    """
    # Find active salary period
    today = datetime.now().date()
    salary_period = SalaryPeriod.query.filter(
        and_(
            SalaryPeriod.user_id == user_id,
            SalaryPeriod.is_active == True,
            SalaryPeriod.start_date <= today,
            SalaryPeriod.end_date >= today,
        )
    ).first()

    if not salary_period:
        return None

    # Calculate current fixed bills total
    fixed_bills = (
        RecurringExpense.active()
        .filter_by(user_id=user_id, is_active=True, is_fixed_bill=True)
        .all()
    )
    current_fixed_bills_total = sum(bill.amount for bill in fixed_bills)

    # Check if there's a difference
    stored_fixed_bills_total = salary_period.fixed_bills_total or 0
    difference = current_fixed_bills_total - stored_fixed_bills_total

    if difference == 0:
        return None

    # Calculate projected weekly budget
    projected_total_budget = (
        salary_period.initial_debit_balance
        + salary_period.credit_budget_allowance
        - current_fixed_bills_total
    )
    projected_weekly_budget = projected_total_budget // 4
    weekly_budget_difference = projected_weekly_budget - salary_period.weekly_budget

    return {
        "salary_period_id": salary_period.id,
        "current_fixed_bills_total": stored_fixed_bills_total,
        "new_fixed_bills_total": current_fixed_bills_total,
        "fixed_bills_difference": difference,
        "current_weekly_budget": salary_period.weekly_budget,
        "suggested_weekly_budget": projected_weekly_budget,
        "weekly_budget_difference": weekly_budget_difference,
    }


@recurring_expenses_bp.route("", methods=["GET"])
@jwt_required()
def get_recurring_expenses():
    """Get all recurring expense templates for the current user"""
    try:
        current_user_id = int(get_jwt_identity())
        active_only = request.args.get("active_only", "false").lower() == "true"

        query = RecurringExpense.active().filter_by(user_id=current_user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        recurring_expenses = query.order_by(RecurringExpense.next_due_date).all()

        return (
            jsonify(
                [
                    {
                        "id": re.id,
                        "name": re.name,
                        "amount": re.amount,
                        "category": re.category,
                        "subcategory": re.subcategory,
                        "payment_method": re.payment_method,
                        "frequency": re.frequency,
                        "frequency_value": re.frequency_value,
                        "day_of_month": re.day_of_month,
                        "day_of_week": re.day_of_week,
                        "start_date": re.start_date.isoformat(),
                        "end_date": re.end_date.isoformat() if re.end_date else None,
                        "next_due_date": re.next_due_date.isoformat(),
                        "is_active": re.is_active,
                        "is_fixed_bill": re.is_fixed_bill,
                        "notes": re.notes,
                        "created_at": re.created_at.isoformat(),
                        "updated_at": re.updated_at.isoformat(),
                    }
                    for re in recurring_expenses
                ]
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_recurring_expenses] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to load recurring expenses. Please try again."}),
            500,
        )


@recurring_expenses_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_recurring_expense(id):
    """Get a specific recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.active().filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        return (
            jsonify(
                {
                    "id": re.id,
                    "name": re.name,
                    "amount": re.amount,
                    "category": re.category,
                    "subcategory": re.subcategory,
                    "payment_method": re.payment_method,
                    "frequency": re.frequency,
                    "frequency_value": re.frequency_value,
                    "day_of_month": re.day_of_month,
                    "day_of_week": re.day_of_week,
                    "start_date": re.start_date.isoformat(),
                    "end_date": re.end_date.isoformat() if re.end_date else None,
                    "next_due_date": re.next_due_date.isoformat(),
                    "is_active": re.is_active,
                    "is_fixed_bill": re.is_fixed_bill,
                    "notes": re.notes,
                    "created_at": re.created_at.isoformat(),
                    "updated_at": re.updated_at.isoformat(),
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_recurring_expense] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to load recurring expense. Please try again."}),
            500,
        )


@recurring_expenses_bp.route("", methods=["POST"])
@jwt_required()
def create_recurring_expense():
    """Create a new recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Calculate next_due_date based on start_date and frequency
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        today = datetime.now().date()

        # If start_date is in the past, calculate the next occurrence from today
        if start_date < today:
            frequency = data["frequency"]
            if frequency == "monthly" and data.get("day_of_month"):
                # For monthly expenses, find next occurrence of day_of_month
                day = data["day_of_month"]
                if today.day < day:
                    # Day hasn't occurred this month yet
                    next_due_date = datetime(today.year, today.month, day).date()
                else:
                    # Day already passed, use next month
                    next_month = today.month + 1
                    next_year = today.year
                    if next_month > 12:
                        next_month = 1
                        next_year += 1
                    next_due_date = datetime(next_year, next_month, day).date()
            elif frequency == "weekly" or frequency == "biweekly":
                # For weekly/biweekly, calculate from start_date
                from datetime import timedelta

                days_increment = 7 if frequency == "weekly" else 14
                next_due_date = start_date
                while next_due_date < today:
                    next_due_date += timedelta(days=days_increment)
            else:
                # For custom or other frequencies, start from start_date
                next_due_date = start_date
        else:
            # start_date is today or in the future, use it as next_due_date
            next_due_date = start_date

        recurring_expense = RecurringExpense(
            user_id=current_user_id,
            name=data["name"],
            amount=data["amount"],
            category=data["category"],
            subcategory=data.get("subcategory"),
            payment_method=data["payment_method"],
            frequency=data["frequency"],
            frequency_value=data.get("frequency_value"),
            day_of_month=data.get("day_of_month"),
            day_of_week=data.get("day_of_week"),
            start_date=start_date,
            end_date=(
                datetime.strptime(data["end_date"], "%Y-%m-%d").date()
                if data.get("end_date")
                else None
            ),
            next_due_date=next_due_date,
            is_active=data.get("is_active", True),
            is_fixed_bill=data.get("is_fixed_bill", False),
            notes=data.get("notes"),
        )

        db.session.add(recurring_expense)
        db.session.commit()

        # Calculate budget impact if this is a fixed bill
        response_data = {
            "id": recurring_expense.id,
            "message": "Recurring expense created successfully",
        }

        if recurring_expense.is_fixed_bill:
            budget_impact = calculate_budget_impact(current_user_id)
            if budget_impact:
                response_data["budget_impact"] = budget_impact

        return jsonify(response_data), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[create_recurring_expense] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to create recurring expense. Please try again."}),
            500,
        )
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400


@recurring_expenses_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_recurring_expense(id):
    """Update a recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.active().filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        data = request.get_json()

        # Track if fixed bill status or amount changed (for budget impact)
        old_is_fixed_bill = re.is_fixed_bill
        old_amount = re.amount

        re.name = data.get("name", re.name)
        re.amount = data.get("amount", re.amount)
        re.category = data.get("category", re.category)
        re.subcategory = data.get("subcategory", re.subcategory)
        re.payment_method = data.get("payment_method", re.payment_method)
        re.frequency = data.get("frequency", re.frequency)
        re.frequency_value = data.get("frequency_value", re.frequency_value)
        re.day_of_month = data.get("day_of_month", re.day_of_month)
        re.day_of_week = data.get("day_of_week", re.day_of_week)

        if "start_date" in data:
            re.start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        if "end_date" in data:
            re.end_date = (
                datetime.strptime(data["end_date"], "%Y-%m-%d").date()
                if data["end_date"]
                else None
            )
        if "is_active" in data:
            re.is_active = data["is_active"]
        if "is_fixed_bill" in data:
            re.is_fixed_bill = data["is_fixed_bill"]
        if "notes" in data:
            re.notes = data["notes"]

        # Recalculate next_due_date if frequency-related fields changed
        if any(
            key in data
            for key in ["day_of_month", "day_of_week", "frequency", "start_date"]
        ):
            today = datetime.now().date()
            start_date = re.start_date

            if start_date < today:
                if re.frequency == "monthly" and re.day_of_month:
                    day = re.day_of_month
                    if today.day < day:
                        re.next_due_date = datetime(today.year, today.month, day).date()
                    else:
                        next_month = today.month + 1
                        next_year = today.year
                        if next_month > 12:
                            next_month = 1
                            next_year += 1
                        re.next_due_date = datetime(next_year, next_month, day).date()
                elif re.frequency == "weekly" or re.frequency == "biweekly":
                    from datetime import timedelta

                    days_increment = 7 if re.frequency == "weekly" else 14
                    next_due_date = start_date
                    while next_due_date < today:
                        next_due_date += timedelta(days=days_increment)
                    re.next_due_date = next_due_date
                else:
                    re.next_due_date = start_date
            else:
                re.next_due_date = start_date

        db.session.commit()

        # Calculate budget impact if fixed bill status or amount changed
        response_data = {"message": "Recurring expense updated successfully"}

        fixed_bill_changed = old_is_fixed_bill != re.is_fixed_bill or (
            re.is_fixed_bill and old_amount != re.amount
        )
        if fixed_bill_changed:
            budget_impact = calculate_budget_impact(current_user_id)
            if budget_impact:
                response_data["budget_impact"] = budget_impact

        return jsonify(response_data), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[update_recurring_expense] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to update recurring expense. Please try again."}),
            500,
        )
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400


@recurring_expenses_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_recurring_expense(id):
    """Delete a recurring expense template (soft delete)"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.active().filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        # Track if this was a fixed bill before deletion
        was_fixed_bill = re.is_fixed_bill

        # Soft delete instead of hard delete
        re.soft_delete()
        db.session.commit()

        # Calculate budget impact if deleted expense was a fixed bill
        response_data = {"message": "Recurring expense deleted successfully"}

        if was_fixed_bill:
            budget_impact = calculate_budget_impact(current_user_id)
            if budget_impact:
                response_data["budget_impact"] = budget_impact

        return jsonify(response_data), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[delete_recurring_expense] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to delete recurring expense. Please try again."}),
            500,
        )


@recurring_expenses_bp.route("/<int:id>/restore", methods=["POST"])
@jwt_required()
def restore_recurring_expense(id):
    """Restore a soft-deleted recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = (
            RecurringExpense.deleted().filter_by(id=id, user_id=current_user_id).first()
        )

        if not re:
            return jsonify({"error": "Deleted recurring expense not found"}), 404

        re.restore()
        db.session.commit()

        # Calculate budget impact if restored expense is a fixed bill
        response_data = {"message": "Recurring expense restored successfully"}

        if re.is_fixed_bill:
            budget_impact = calculate_budget_impact(current_user_id)
            if budget_impact:
                response_data["budget_impact"] = budget_impact

        return jsonify(response_data), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[restore_recurring_expense] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify(
                {"error": "Failed to restore recurring expense. Please try again."}
            ),
            500,
        )


@recurring_expenses_bp.route("/deleted", methods=["GET"])
@jwt_required()
def get_deleted_recurring_expenses():
    """Get all soft-deleted recurring expense templates for the current user"""
    current_user_id = int(get_jwt_identity())
    deleted_recurring = (
        RecurringExpense.deleted().filter_by(user_id=current_user_id).all()
    )

    return (
        jsonify(
            [
                {
                    "id": r.id,
                    "name": r.name,
                    "amount": r.amount,
                    "category": r.category,
                    "subcategory": r.subcategory,
                    "frequency": r.frequency,
                    "is_fixed_bill": r.is_fixed_bill,
                    "deleted_at": r.deleted_at.isoformat() if r.deleted_at else None,
                }
                for r in deleted_recurring
            ]
        ),
        200,
    )


@recurring_expenses_bp.route("/<int:id>/toggle", methods=["PUT"])
@jwt_required()
def toggle_recurring_expense(id):
    """Toggle active status of a recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.active().filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        re.is_active = not re.is_active
        db.session.commit()

        # Calculate budget impact if toggling a fixed bill
        response_data = {
            "message": "Recurring expense toggled successfully",
            "is_active": re.is_active,
        }

        if re.is_fixed_bill:
            budget_impact = calculate_budget_impact(current_user_id)
            if budget_impact:
                response_data["budget_impact"] = budget_impact

        return jsonify(response_data), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[toggle_recurring_expense] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to toggle recurring expense. Please try again."}),
            500,
        )


@recurring_expenses_bp.route("/<int:id>/fixed-bill", methods=["PATCH"])
@jwt_required()
def toggle_fixed_bill(id):
    """Toggle whether a recurring expense is a fixed bill"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.active().filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        data = request.get_json()
        re.is_fixed_bill = data.get("is_fixed_bill", not re.is_fixed_bill)
        db.session.commit()

        # Always calculate budget impact when changing fixed bill status
        response_data = {
            "message": "Fixed bill status updated successfully",
            "is_fixed_bill": re.is_fixed_bill,
        }

        budget_impact = calculate_budget_impact(current_user_id)
        if budget_impact:
            response_data["budget_impact"] = budget_impact

        return jsonify(response_data), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"[toggle_fixed_bill] Error: {str(e)}", exc_info=True)
        return (
            jsonify({"error": "Failed to update fixed bill status. Please try again."}),
            500,
        )


@recurring_expenses_bp.route("/export", methods=["GET"])
@jwt_required()
def export_recurring_expenses():
    """Export all recurring expenses as JSON for backup/testing"""
    current_user_id = int(get_jwt_identity())
    recurring_expenses = (
        RecurringExpense.active().filter_by(user_id=current_user_id).all()
    )

    export_data = [
        {
            "name": re.name,
            "amount": re.amount,
            "category": re.category,
            "subcategory": re.subcategory,
            "payment_method": re.payment_method,
            "frequency": re.frequency,
            "frequency_value": re.frequency_value,
            "day_of_month": re.day_of_month,
            "day_of_week": re.day_of_week,
            "start_date": re.start_date.isoformat(),
            "end_date": re.end_date.isoformat() if re.end_date else None,
            "next_due_date": re.next_due_date.isoformat(),
            "is_active": re.is_active,
            "is_fixed_bill": re.is_fixed_bill,
            "notes": re.notes,
        }
        for re in recurring_expenses
    ]

    return jsonify({"recurring_expenses": export_data, "count": len(export_data)}), 200


@recurring_expenses_bp.route("/import", methods=["POST"])
@jwt_required()
def import_recurring_expenses():
    """Import recurring expenses from JSON (for testing/setup)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if "recurring_expenses" not in data:
            return jsonify({"error": "Missing recurring_expenses array"}), 400

        imported_count = 0
        for re_data in data["recurring_expenses"]:
            recurring_expense = RecurringExpense(
                user_id=current_user_id,
                name=re_data["name"],
                amount=re_data["amount"],
                category=re_data["category"],
                subcategory=re_data.get("subcategory"),
                payment_method=re_data["payment_method"],
                frequency=re_data["frequency"],
                frequency_value=re_data.get("frequency_value", 1),
                day_of_month=re_data.get("day_of_month"),
                day_of_week=re_data.get("day_of_week"),
                start_date=datetime.fromisoformat(re_data["start_date"]).date(),
                end_date=(
                    datetime.fromisoformat(re_data["end_date"]).date()
                    if re_data.get("end_date")
                    else None
                ),
                next_due_date=datetime.fromisoformat(re_data["next_due_date"]).date(),
                is_active=re_data.get("is_active", True),
                is_fixed_bill=re_data.get("is_fixed_bill", False),
                notes=re_data.get("notes"),
            )
            db.session.add(recurring_expense)
            imported_count += 1

        db.session.commit()
        return (
            jsonify(
                {
                    "message": f"Successfully imported {imported_count} recurring expenses"
                }
            ),
            201,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[import_recurring_expenses] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify(
                {"error": "Failed to import recurring expenses. Please try again."}
            ),
            500,
        )
    except (ValueError, KeyError, json.JSONDecodeError) as e:
        return jsonify({"error": str(e)}), 400

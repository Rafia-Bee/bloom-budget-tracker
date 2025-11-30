"""
Bloom - Recurring Expenses Routes

CRUD endpoints for managing recurring expense templates.
Handles creation, retrieval, updates, and deletion of recurring expenses.
Also includes export/import for testing purposes.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, RecurringExpense
from datetime import datetime, timedelta
from sqlalchemy import and_
import json

recurring_expenses_bp = Blueprint("recurring_expenses", __name__)


@recurring_expenses_bp.route("", methods=["GET"])
@jwt_required()
def get_recurring_expenses():
    """Get all recurring expense templates for the current user"""
    try:
        current_user_id = int(get_jwt_identity())
        active_only = request.args.get("active_only", "false").lower() == "true"

        query = RecurringExpense.query.filter_by(user_id=current_user_id)

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
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@recurring_expenses_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_recurring_expense(id):
    """Get a specific recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.query.filter_by(id=id, user_id=current_user_id).first()

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
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
            end_date=datetime.strptime(data["end_date"], "%Y-%m-%d").date()
            if data.get("end_date")
            else None,
            next_due_date=next_due_date,
            is_active=data.get("is_active", True),
            is_fixed_bill=data.get("is_fixed_bill", False),
            notes=data.get("notes"),
        )

        db.session.add(recurring_expense)
        db.session.commit()

        return (
            jsonify(
                {
                    "id": recurring_expense.id,
                    "message": "Recurring expense created successfully",
                }
            ),
            201,
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@recurring_expenses_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_recurring_expense(id):
    """Update a recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.query.filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        data = request.get_json()

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

        db.session.commit()

        return jsonify({"message": "Recurring expense updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@recurring_expenses_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_recurring_expense(id):
    """Delete a recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.query.filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        db.session.delete(re)
        db.session.commit()

        return jsonify({"message": "Recurring expense deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@recurring_expenses_bp.route("/<int:id>/toggle", methods=["PUT"])
@jwt_required()
def toggle_recurring_expense(id):
    """Toggle active status of a recurring expense template"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.query.filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        re.is_active = not re.is_active
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Recurring expense toggled successfully",
                    "is_active": re.is_active,
                }
            ),
            200,
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@recurring_expenses_bp.route("/<int:id>/fixed-bill", methods=["PATCH"])
@jwt_required()
def toggle_fixed_bill(id):
    """Toggle whether a recurring expense is a fixed bill"""
    try:
        current_user_id = int(get_jwt_identity())
        re = RecurringExpense.query.filter_by(id=id, user_id=current_user_id).first()

        if not re:
            return jsonify({"error": "Recurring expense not found"}), 404

        data = request.get_json()
        re.is_fixed_bill = data.get("is_fixed_bill", not re.is_fixed_bill)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Fixed bill status updated successfully",
                    "is_fixed_bill": re.is_fixed_bill,
                }
            ),
            200,
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@recurring_expenses_bp.route("/export", methods=["GET"])
@jwt_required()
def export_recurring_expenses():
    """Export all recurring expenses as JSON for backup/testing"""
    current_user_id = int(get_jwt_identity())
    recurring_expenses = RecurringExpense.query.filter_by(user_id=current_user_id).all()

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
                end_date=datetime.fromisoformat(re_data["end_date"]).date()
                if re_data.get("end_date")
                else None,
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

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

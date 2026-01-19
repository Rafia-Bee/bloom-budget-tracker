"""
Bloom - Recurring Income Routes

CRUD endpoints for managing recurring income templates.
Handles creation, retrieval, updates, and deletion of recurring income.
Issue #177 - Recurring Income Feature
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, RecurringIncome
from datetime import datetime, timedelta
from sqlalchemy.exc import SQLAlchemyError

recurring_income_bp = Blueprint("recurring_income", __name__)


def serialize_recurring_income(ri):
    """Serialize a RecurringIncome object to dict."""
    return {
        "id": ri.id,
        "name": ri.name,
        "amount": ri.amount,
        "income_type": ri.income_type,
        "currency": ri.currency,
        "frequency": ri.frequency,
        "frequency_value": ri.frequency_value,
        "day_of_month": ri.day_of_month,
        "day_of_week": ri.day_of_week,
        "start_date": ri.start_date.isoformat(),
        "end_date": ri.end_date.isoformat() if ri.end_date else None,
        "next_due_date": ri.next_due_date.isoformat(),
        "is_active": ri.is_active,
        "notes": ri.notes,
        "created_at": ri.created_at.isoformat() if ri.created_at else None,
        "updated_at": ri.updated_at.isoformat() if ri.updated_at else None,
    }


@recurring_income_bp.route("", methods=["GET"])
@jwt_required()
def get_recurring_income():
    """Get all recurring income templates for the current user."""
    try:
        current_user_id = int(get_jwt_identity())
        active_only = request.args.get("active_only", "false").lower() == "true"

        query = RecurringIncome.active().filter_by(user_id=current_user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        recurring_income_list = query.order_by(RecurringIncome.next_due_date).all()

        return (
            jsonify([serialize_recurring_income(ri) for ri in recurring_income_list]),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_recurring_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to load recurring income. Please try again."}),
            500,
        )


@recurring_income_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_recurring_income_by_id(id):
    """Get a specific recurring income template."""
    try:
        current_user_id = int(get_jwt_identity())
        ri = RecurringIncome.active().filter_by(id=id, user_id=current_user_id).first()

        if not ri:
            return jsonify({"error": "Recurring income not found"}), 404

        return jsonify(serialize_recurring_income(ri)), 200
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_recurring_income_by_id] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to load recurring income. Please try again."}),
            500,
        )


def calculate_next_due_date(
    start_date, frequency, day_of_month=None, day_of_week=None, frequency_value=None
):
    """Calculate next_due_date based on start_date and frequency."""
    today = datetime.now().date()

    if start_date >= today:
        return start_date

    if frequency == "monthly" and day_of_month:
        day = min(day_of_month, 28)
        if today.day < day:
            return datetime(today.year, today.month, day).date()
        else:
            next_month = today.month + 1
            next_year = today.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            return datetime(next_year, next_month, day).date()
    elif frequency == "weekly":
        next_due = start_date
        while next_due < today:
            next_due += timedelta(days=7)
        return next_due
    elif frequency == "biweekly":
        next_due = start_date
        while next_due < today:
            next_due += timedelta(days=14)
        return next_due
    elif frequency == "custom" and frequency_value:
        next_due = start_date
        while next_due < today:
            next_due += timedelta(days=frequency_value)
        return next_due

    return start_date


@recurring_income_bp.route("", methods=["POST"])
@jwt_required()
def create_recurring_income():
    """Create a new recurring income template."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Validate required fields
        if not data.get("name"):
            return jsonify({"error": "Name is required"}), 400
        if not data.get("amount") or data["amount"] <= 0:
            return jsonify({"error": "Amount must be positive"}), 400
        if not data.get("frequency"):
            return jsonify({"error": "Frequency is required"}), 400
        if not data.get("start_date"):
            return jsonify({"error": "Start date is required"}), 400

        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()

        next_due_date = calculate_next_due_date(
            start_date,
            data["frequency"],
            data.get("day_of_month"),
            data.get("day_of_week"),
            data.get("frequency_value"),
        )

        recurring_income = RecurringIncome(
            user_id=current_user_id,
            name=data["name"],
            amount=data["amount"],
            income_type=data.get("income_type", "Salary"),
            currency=data.get("currency", "EUR"),
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
            notes=data.get("notes"),
        )

        db.session.add(recurring_income)
        db.session.commit()

        return (
            jsonify(
                {
                    "id": recurring_income.id,
                    "message": "Recurring income created successfully",
                    **serialize_recurring_income(recurring_income),
                }
            ),
            201,
        )
    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[create_recurring_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to create recurring income. Please try again."}),
            500,
        )


@recurring_income_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_recurring_income(id):
    """Update a recurring income template."""
    try:
        current_user_id = int(get_jwt_identity())
        ri = RecurringIncome.active().filter_by(id=id, user_id=current_user_id).first()

        if not ri:
            return jsonify({"error": "Recurring income not found"}), 404

        data = request.get_json()

        if "name" in data:
            ri.name = data["name"]
        if "amount" in data:
            if data["amount"] <= 0:
                return jsonify({"error": "Amount must be positive"}), 400
            ri.amount = data["amount"]
        if "income_type" in data:
            ri.income_type = data["income_type"]
        if "currency" in data:
            ri.currency = data["currency"]
        if "frequency" in data:
            ri.frequency = data["frequency"]
        if "frequency_value" in data:
            ri.frequency_value = data["frequency_value"]
        if "day_of_month" in data:
            ri.day_of_month = data["day_of_month"]
        if "day_of_week" in data:
            ri.day_of_week = data["day_of_week"]
        if "start_date" in data:
            ri.start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        if "end_date" in data:
            ri.end_date = (
                datetime.strptime(data["end_date"], "%Y-%m-%d").date()
                if data["end_date"]
                else None
            )
        if "is_active" in data:
            ri.is_active = data["is_active"]
        if "notes" in data:
            ri.notes = data["notes"]

        # Recalculate next_due_date if frequency settings changed
        if any(
            key in data
            for key in [
                "frequency",
                "day_of_month",
                "day_of_week",
                "frequency_value",
                "start_date",
            ]
        ):
            ri.next_due_date = calculate_next_due_date(
                ri.start_date,
                ri.frequency,
                ri.day_of_month,
                ri.day_of_week,
                ri.frequency_value,
            )

        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Recurring income updated successfully",
                    **serialize_recurring_income(ri),
                }
            ),
            200,
        )
    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[update_recurring_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to update recurring income. Please try again."}),
            500,
        )


@recurring_income_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_recurring_income(id):
    """Soft delete a recurring income template."""
    try:
        current_user_id = int(get_jwt_identity())
        ri = RecurringIncome.active().filter_by(id=id, user_id=current_user_id).first()

        if not ri:
            return jsonify({"error": "Recurring income not found"}), 404

        ri.soft_delete()
        db.session.commit()

        return jsonify({"message": "Recurring income deleted successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[delete_recurring_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to delete recurring income. Please try again."}),
            500,
        )


@recurring_income_bp.route("/<int:id>/toggle", methods=["PUT"])
@jwt_required()
def toggle_recurring_income(id):
    """Toggle active status of a recurring income template."""
    try:
        current_user_id = int(get_jwt_identity())
        ri = RecurringIncome.active().filter_by(id=id, user_id=current_user_id).first()

        if not ri:
            return jsonify({"error": "Recurring income not found"}), 404

        ri.is_active = not ri.is_active
        db.session.commit()

        return (
            jsonify(
                {
                    "message": f"Recurring income {'activated' if ri.is_active else 'paused'}",
                    "is_active": ri.is_active,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[toggle_recurring_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to toggle recurring income. Please try again."}),
            500,
        )


@recurring_income_bp.route("/deleted", methods=["GET"])
@jwt_required()
def get_deleted_recurring_income():
    """Get all soft-deleted recurring income templates for the current user."""
    try:
        current_user_id = int(get_jwt_identity())
        deleted_income = (
            RecurringIncome.deleted()
            .filter_by(user_id=current_user_id)
            .order_by(RecurringIncome.deleted_at.desc())
            .all()
        )

        return (
            jsonify([serialize_recurring_income(ri) for ri in deleted_income]),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"[get_deleted_recurring_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify(
                {"error": "Failed to load deleted recurring income. Please try again."}
            ),
            500,
        )


@recurring_income_bp.route("/<int:id>/restore", methods=["POST"])
@jwt_required()
def restore_recurring_income(id):
    """Restore a soft-deleted recurring income template."""
    try:
        current_user_id = int(get_jwt_identity())
        ri = RecurringIncome.deleted().filter_by(id=id, user_id=current_user_id).first()

        if not ri:
            return jsonify({"error": "Deleted recurring income not found"}), 404

        ri.restore()
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Recurring income restored successfully",
                    **serialize_recurring_income(ri),
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"[restore_recurring_income] Error: {str(e)}", exc_info=True
        )
        return (
            jsonify({"error": "Failed to restore recurring income. Please try again."}),
            500,
        )

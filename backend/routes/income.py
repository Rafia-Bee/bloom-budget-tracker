"""
Bloom - Income Routes

Handles income entries (salary, other income).
Supports CRUD operations for income tracking.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, Income
from backend.services.currency_service import get_exchange_rate
from datetime import datetime

income_bp = Blueprint("income", __name__)


@income_bp.route("", methods=["GET"])
@jwt_required()
def get_income():
    """Get all income entries for the current user, optionally filtered by budget period."""
    user_id = int(get_jwt_identity())

    # Pagination parameters
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 50, type=int)

    # Filter parameters
    budget_period_id = request.args.get("budget_period_id", type=int)
    income_type = request.args.get("type")
    start_date = request.args.get("start_date")  # YYYY-MM-DD
    end_date = request.args.get("end_date")  # YYYY-MM-DD
    min_amount = request.args.get("min_amount", type=int)
    max_amount = request.args.get("max_amount", type=int)
    search = request.args.get("search")  # Search in type field

    query = Income.active().filter_by(user_id=user_id)

    # Apply filters
    # Note: budget_period_id parameter is deprecated - use start_date/end_date instead
    if income_type:
        query = query.filter_by(type=income_type)
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Income.actual_date >= start)
        except ValueError:
            pass
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Income.actual_date <= end)
        except ValueError:
            pass
    if min_amount is not None:
        query = query.filter(Income.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Income.amount <= max_amount)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(Income.type.ilike(search_pattern))

    # Get total count before pagination
    total = query.count()

    # Apply pagination
    income_entries = (
        query.order_by(Income.actual_date.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all()
    )

    return (
        jsonify(
            {
                "income": [
                    {
                        "id": entry.id,
                        "type": entry.type,
                        "amount": entry.amount,
                        "currency": entry.currency,
                        "original_amount": entry.original_amount,
                        "date": entry.actual_date.strftime("%d %b, %Y")
                        if entry.actual_date
                        else None,
                        "date_iso": entry.actual_date.strftime("%Y-%m-%d")
                        if entry.actual_date
                        else None,
                        "scheduled_date": entry.scheduled_date.strftime("%d %b, %Y")
                        if entry.scheduled_date
                        else None,
                    }
                    for entry in income_entries
                ],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit,
                    "has_more": page * limit < total,
                },
            }
        ),
        200,
    )


@income_bp.route("", methods=["POST"])
@jwt_required()
def create_income():
    """Create a new income entry."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    # Validate required fields
    if not data.get("type") or not data.get("amount"):
        return jsonify({"error": "Type and amount are required"}), 400

    try:
        amount = int(data["amount"])
        if amount <= 0:
            return jsonify({"error": "Amount must be positive"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    # Parse date
    date_str = data.get("date")
    if date_str:
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    else:
        date = datetime.utcnow().date()

    # Get currency, default to EUR
    currency = data.get("currency", "EUR").upper()
    # If foreign currency, store original amount and exchange rate
    original_amount = data.get("original_amount") if currency != "EUR" else None
    exchange_rate_used = None
    if currency != "EUR" and original_amount:
        try:
            exchange_rate_used = get_exchange_rate(currency, "EUR")
        except (ValueError, ConnectionError, TimeoutError):
            # Silently fail - exchange rate is optional
            pass

    # Create income entry
    income = Income(
        user_id=user_id,
        type=data["type"],
        amount=amount,
        currency=currency,
        original_amount=original_amount,
        exchange_rate_used=exchange_rate_used,
        actual_date=date,
        scheduled_date=date,
    )

    db.session.add(income)
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Income created successfully",
                "income": {
                    "id": income.id,
                    "type": income.type,
                    "amount": income.amount,
                    "currency": income.currency,
                    "original_amount": income.original_amount,
                    "date": income.actual_date.strftime("%d %b, %Y"),
                },
            }
        ),
        201,
    )


@income_bp.route("/<int:income_id>", methods=["PUT"])
@jwt_required()
def update_income(income_id):
    """Update an existing income entry."""
    user_id = int(get_jwt_identity())
    income = Income.active().filter_by(id=income_id, user_id=user_id).first()

    if not income:
        return jsonify({"error": "Income not found"}), 404

    data = request.get_json()

    # Update fields if provided
    if "type" in data:
        income.type = data["type"]

    if "amount" in data:
        try:
            amount = int(data["amount"])
            if amount <= 0:
                return jsonify({"error": "Amount must be positive"}), 400
            income.amount = amount
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid amount"}), 400

    if "date" in data:
        try:
            income.actual_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if "currency" in data:
        income.currency = data["currency"].upper()
    if "original_amount" in data:
        income.original_amount = data["original_amount"]

    db.session.commit()

    return (
        jsonify(
            {
                "message": "Income updated successfully",
                "income": {
                    "id": income.id,
                    "type": income.type,
                    "amount": income.amount,
                    "date": income.actual_date.strftime("%d %b, %Y")
                    if income.actual_date
                    else None,
                },
            }
        ),
        200,
    )


@income_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_income_stats():
    """Get income statistics for the current user.

    Returns:
        - total_income: All-time income INCLUDING first Initial Balance (starting money),
                        excluding subsequent Initial Balance snapshots (in cents)
        - period_income: Income for current salary period excluding all Initial Balance (in cents)
    """
    from backend.models.database import SalaryPeriod
    from sqlalchemy import func

    user_id = int(get_jwt_identity())

    # Find the earliest Initial Balance (the actual starting money)
    earliest_initial_balance = (
        db.session.query(Income)
        .filter(Income.user_id == user_id, Income.type == "Initial Balance")
        .order_by(Income.actual_date)
        .first()
    )

    # Start with the first Initial Balance as the starting money
    starting_balance = (
        earliest_initial_balance.amount if earliest_initial_balance else 0
    )

    # Sum all other income (excluding ALL Initial Balance entries)
    other_income = (
        db.session.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(Income.user_id == user_id, Income.type != "Initial Balance")
        .scalar()
        or 0
    )

    # Total income = starting balance + all other income
    total_income = starting_balance + other_income

    # Period income (current salary period) - excludes all Initial Balance entries
    current_period = SalaryPeriod.query.filter_by(
        user_id=user_id, is_active=True
    ).first()

    period_income = 0
    if current_period:
        period_income = (
            db.session.query(func.coalesce(func.sum(Income.amount), 0))
            .filter(
                Income.user_id == user_id,
                Income.type != "Initial Balance",
                Income.actual_date >= current_period.start_date,
                Income.actual_date <= current_period.end_date,
            )
            .scalar()
            or 0
        )

    return (
        jsonify(
            {
                "total_income": total_income,  # cents
                "period_income": period_income,  # cents
            }
        ),
        200,
    )


@income_bp.route("/<int:income_id>", methods=["DELETE"])
@jwt_required()
def delete_income(income_id):
    """Delete an income entry."""
    user_id = int(get_jwt_identity())
    income = Income.active().filter_by(id=income_id, user_id=user_id).first()

    if not income:
        return jsonify({"error": "Income not found"}), 404

    db.session.delete(income)
    db.session.commit()

    return jsonify({"message": "Income deleted successfully"}), 200

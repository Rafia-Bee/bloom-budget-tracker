"""
Bloom - Analytics Routes

This module provides aggregated analytics endpoints for the Reports dashboard.

Endpoints:
- GET /analytics/spending-by-category: Category breakdown with totals
- GET /analytics/spending-trends: Time-series data for trend charts
- GET /analytics/income-vs-expense: Summary comparison
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, case
from backend.models.database import db, Expense, Income

analytics_bp = Blueprint("analytics", __name__, url_prefix="/analytics")


def parse_date(date_str, default=None):
    """Parse date string in YYYY-MM-DD format, return default if invalid."""
    if not date_str:
        return default
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return default


def get_date_range_defaults():
    """Get default date range (last 30 days)."""
    today = datetime.now().date()
    return today - timedelta(days=30), today


@analytics_bp.route("/spending-by-category", methods=["GET"])
@jwt_required()
def get_spending_by_category():
    """
    Get spending breakdown by category.

    Query params:
        start_date: YYYY-MM-DD (default: 30 days ago)
        end_date: YYYY-MM-DD (default: today)
        payment_method: 'debit' | 'credit' | null (all)

    Returns:
        {
            categories: [
                { name: 'Food', total: 15000, count: 12, percentage: 25.5 },
                ...
            ],
            total_spending: 58800,
            date_range: { start: '2025-12-01', end: '2025-12-31' }
        }
    """
    current_user_id = int(get_jwt_identity())

    default_start, default_end = get_date_range_defaults()
    start_date = parse_date(request.args.get("start_date"), default_start)
    end_date = parse_date(request.args.get("end_date"), default_end)
    payment_method = request.args.get("payment_method")

    query = (
        db.session.query(
            Expense.category,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count"),
        )
        .filter(
            Expense.user_id == current_user_id,
            Expense.deleted_at.is_(None),
            Expense.date >= start_date,
            Expense.date <= end_date,
        )
        .group_by(Expense.category)
    )

    if payment_method in ("debit", "credit"):
        query = query.filter(Expense.payment_method == payment_method)

    results = query.all()

    total_spending = sum(r.total for r in results)

    categories = [
        {
            "name": r.category,
            "total": r.total,
            "count": r.count,
            "percentage": (
                round((r.total / total_spending) * 100, 1) if total_spending > 0 else 0
            ),
        }
        for r in sorted(results, key=lambda x: x.total, reverse=True)
    ]

    return jsonify(
        {
            "categories": categories,
            "total_spending": total_spending,
            "date_range": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            },
        }
    )


@analytics_bp.route("/spending-trends", methods=["GET"])
@jwt_required()
def get_spending_trends():
    """
    Get spending trends over time.

    Query params:
        start_date: YYYY-MM-DD (default: 30 days ago)
        end_date: YYYY-MM-DD (default: today)
        granularity: 'daily' | 'weekly' | 'monthly' (default: daily)
        payment_method: 'debit' | 'credit' | null (all)

    Returns:
        {
            trends: [
                { date: '2025-12-01', total: 5000, debit: 3000, credit: 2000 },
                ...
            ],
            granularity: 'daily',
            date_range: { start: '2025-12-01', end: '2025-12-31' }
        }
    """
    current_user_id = int(get_jwt_identity())

    default_start, default_end = get_date_range_defaults()
    start_date = parse_date(request.args.get("start_date"), default_start)
    end_date = parse_date(request.args.get("end_date"), default_end)
    granularity = request.args.get("granularity", "daily")
    payment_method = request.args.get("payment_method")

    if granularity not in ("daily", "weekly", "monthly"):
        granularity = "daily"

    base_query = Expense.query.filter(
        Expense.user_id == current_user_id,
        Expense.deleted_at.is_(None),
        Expense.date >= start_date,
        Expense.date <= end_date,
    )

    if payment_method in ("debit", "credit"):
        base_query = base_query.filter(Expense.payment_method == payment_method)

    expenses = base_query.all()

    trends_dict = {}

    for expense in expenses:
        if granularity == "daily":
            key = expense.date.strftime("%Y-%m-%d")
        elif granularity == "weekly":
            week_start = expense.date - timedelta(days=expense.date.weekday())
            key = week_start.strftime("%Y-%m-%d")
        else:
            key = expense.date.strftime("%Y-%m-01")

        if key not in trends_dict:
            trends_dict[key] = {"date": key, "total": 0, "debit": 0, "credit": 0}

        trends_dict[key]["total"] += expense.amount
        if expense.payment_method == "debit":
            trends_dict[key]["debit"] += expense.amount
        else:
            trends_dict[key]["credit"] += expense.amount

    trends = sorted(trends_dict.values(), key=lambda x: x["date"])

    return jsonify(
        {
            "trends": trends,
            "granularity": granularity,
            "date_range": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            },
        }
    )


@analytics_bp.route("/income-vs-expense", methods=["GET"])
@jwt_required()
def get_income_vs_expense():
    """
    Get income vs expense summary for comparison.

    Query params:
        start_date: YYYY-MM-DD (default: 30 days ago)
        end_date: YYYY-MM-DD (default: today)

    Returns:
        {
            total_income: 300000,
            total_expense: 150000,
            net_savings: 150000,
            savings_rate: 50.0,
            by_month: [
                { month: '2025-12', income: 300000, expense: 150000, net: 150000 },
                ...
            ],
            date_range: { start: '2025-12-01', end: '2025-12-31' }
        }
    """
    current_user_id = int(get_jwt_identity())

    default_start, default_end = get_date_range_defaults()
    start_date = parse_date(request.args.get("start_date"), default_start)
    end_date = parse_date(request.args.get("end_date"), default_end)

    total_expense = (
        db.session.query(func.sum(Expense.amount))
        .filter(
            Expense.user_id == current_user_id,
            Expense.deleted_at.is_(None),
            Expense.date >= start_date,
            Expense.date <= end_date,
        )
        .scalar()
        or 0
    )

    total_income = (
        db.session.query(func.sum(Income.amount))
        .filter(
            Income.user_id == current_user_id,
            Income.deleted_at.is_(None),
            Income.actual_date >= start_date,
            Income.actual_date <= end_date,
        )
        .scalar()
        or 0
    )

    net_savings = total_income - total_expense
    savings_rate = (
        round((net_savings / total_income) * 100, 1) if total_income > 0 else 0
    )

    expenses_by_month = (
        db.session.query(
            func.strftime("%Y-%m", Expense.date).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .filter(
            Expense.user_id == current_user_id,
            Expense.deleted_at.is_(None),
            Expense.date >= start_date,
            Expense.date <= end_date,
        )
        .group_by(func.strftime("%Y-%m", Expense.date))
        .all()
    )

    income_by_month = (
        db.session.query(
            func.strftime("%Y-%m", Income.actual_date).label("month"),
            func.sum(Income.amount).label("total"),
        )
        .filter(
            Income.user_id == current_user_id,
            Income.deleted_at.is_(None),
            Income.actual_date >= start_date,
            Income.actual_date <= end_date,
        )
        .group_by(func.strftime("%Y-%m", Income.actual_date))
        .all()
    )

    expense_dict = {r.month: r.total for r in expenses_by_month}
    income_dict = {r.month: r.total for r in income_by_month}

    all_months = sorted(set(expense_dict.keys()) | set(income_dict.keys()))

    by_month = []
    for month in all_months:
        inc = income_dict.get(month, 0)
        exp = expense_dict.get(month, 0)
        by_month.append(
            {"month": month, "income": inc, "expense": exp, "net": inc - exp}
        )

    return jsonify(
        {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_savings": net_savings,
            "savings_rate": savings_rate,
            "by_month": by_month,
            "date_range": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            },
        }
    )

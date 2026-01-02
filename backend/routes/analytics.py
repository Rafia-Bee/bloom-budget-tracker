"""
Bloom - Analytics Routes

This module provides aggregated analytics endpoints for the Reports dashboard.

Endpoints:
- GET /analytics/spending-by-category: Category breakdown with totals
- GET /analytics/spending-trends: Time-series data for trend charts
- GET /analytics/income-vs-expense: Summary comparison
"""

import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from backend.models.database import db, Expense, Income, Debt

analytics_bp = Blueprint("analytics", __name__, url_prefix="/analytics")


def _is_postgresql():
    """Check if we're using PostgreSQL (production) or SQLite (dev/test)."""
    database_url = os.getenv("DATABASE_URL", "")
    return "postgresql" in database_url


def _format_year_month(date_column):
    """
    Return a database-agnostic expression to format a date as 'YYYY-MM'.
    Uses to_char for PostgreSQL and strftime for SQLite.
    """
    if _is_postgresql():
        return func.to_char(date_column, "YYYY-MM")
    else:
        return func.strftime("%Y-%m", date_column)


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
            # Exclude pre-existing credit card debt entries from analytics
            ~Expense.name.ilike("%pre-existing credit card debt%"),
        )
        .group_by(Expense.category)
    )

    # Payment method stored as "Debit card" or "Credit card" in database
    if payment_method == "debit":
        query = query.filter(Expense.payment_method.ilike("%debit%"))
    elif payment_method == "credit":
        query = query.filter(Expense.payment_method.ilike("%credit%"))

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


@analytics_bp.route("/spending-by-subcategory", methods=["GET"])
@jwt_required()
def get_spending_by_subcategory():
    """
    Get spending breakdown by subcategory within categories.

    Query params:
        start_date: YYYY-MM-DD (default: 30 days ago)
        end_date: YYYY-MM-DD (default: today)
        category: Optional filter by parent category
        payment_method: 'debit' | 'credit' | null (all)

    Returns:
        {
            subcategories: [
                {
                    category: 'Food',
                    subcategory: 'Groceries',
                    total: 15000,
                    count: 12,
                    percentage: 25.5
                },
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
    category_filter = request.args.get("category")
    payment_method = request.args.get("payment_method")

    query = (
        db.session.query(
            Expense.category,
            Expense.subcategory,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count"),
        )
        .filter(
            Expense.user_id == current_user_id,
            Expense.deleted_at.is_(None),
            Expense.date >= start_date,
            Expense.date <= end_date,
            # Exclude pre-existing credit card debt entries from analytics
            ~Expense.name.ilike("%pre-existing credit card debt%"),
        )
        .group_by(Expense.category, Expense.subcategory)
    )

    # Filter by category if specified
    if category_filter:
        query = query.filter(Expense.category == category_filter)

    # Payment method stored as "Debit card" or "Credit card" in database
    if payment_method == "debit":
        query = query.filter(Expense.payment_method.ilike("%debit%"))
    elif payment_method == "credit":
        query = query.filter(Expense.payment_method.ilike("%credit%"))

    results = query.all()

    total_spending = sum(r.total for r in results)

    # When filtering by category, show only subcategory name; otherwise show "Category / Subcategory"
    def format_name(category, subcategory):
        subcat_name = subcategory or "Uncategorized"
        if category_filter:
            return subcat_name
        return f"{category} / {subcat_name}"

    subcategories = [
        {
            "category": r.category,
            "subcategory": r.subcategory or "Uncategorized",
            "name": format_name(r.category, r.subcategory),
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
            "subcategories": subcategories,
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
        # Exclude pre-existing credit card debt entries from analytics
        ~Expense.name.ilike("%pre-existing credit card debt%"),
    )

    # Payment method stored as "Debit card" or "Credit card" in database
    if payment_method == "debit":
        base_query = base_query.filter(Expense.payment_method.ilike("%debit%"))
    elif payment_method == "credit":
        base_query = base_query.filter(Expense.payment_method.ilike("%credit%"))

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
        # Payment method stored as "Debit card" or "Credit card" in database
        if expense.payment_method and "debit" in expense.payment_method.lower():
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

    # Check if "all_time" parameter is present
    is_all_time = request.args.get("all_time") == "true"

    if is_all_time:
        # For all-time, set start date to very old date and end date to today
        start_date = datetime(2000, 1, 1).date()
        end_date = datetime.now().date()
    else:
        start_date = parse_date(request.args.get("start_date"), default_start)
        end_date = parse_date(request.args.get("end_date"), default_end)

    # Find the first "Initial Balance" income for this user (to exclude later ones)
    first_initial_balance = (
        Income.query.filter(
            Income.user_id == current_user_id,
            Income.deleted_at.is_(None),
            Income.type == "Initial Balance",
        )
        .order_by(Income.actual_date.asc(), Income.id.asc())
        .first()
    )
    first_initial_balance_id = (
        first_initial_balance.id if first_initial_balance else None
    )

    total_expense = (
        db.session.query(func.sum(Expense.amount))
        .filter(
            Expense.user_id == current_user_id,
            Expense.deleted_at.is_(None),
            Expense.date >= start_date,
            Expense.date <= end_date,
            # Exclude pre-existing credit card debt entries from analytics
            ~Expense.name.ilike("%pre-existing credit card debt%"),
        )
        .scalar()
        or 0
    )

    # Build income query, excluding Initial Balance entries after the first one
    income_query = db.session.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user_id,
        Income.deleted_at.is_(None),
        Income.actual_date >= start_date,
        Income.actual_date <= end_date,
    )

    # Exclude "Initial Balance" entries except the very first one
    if first_initial_balance_id:
        income_query = income_query.filter(
            db.or_(
                Income.type != "Initial Balance",
                Income.id == first_initial_balance_id,
            )
        )

    total_income = income_query.scalar() or 0

    net_savings = total_income - total_expense
    savings_rate = (
        round((net_savings / total_income) * 100, 1) if total_income > 0 else 0
    )

    expenses_by_month = (
        db.session.query(
            _format_year_month(Expense.date).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .filter(
            Expense.user_id == current_user_id,
            Expense.deleted_at.is_(None),
            Expense.date >= start_date,
            Expense.date <= end_date,
            # Exclude pre-existing credit card debt entries from analytics
            ~Expense.name.ilike("%pre-existing credit card debt%"),
        )
        .group_by(_format_year_month(Expense.date))
        .all()
    )

    # Build income by month query, excluding Initial Balance after the first one
    income_by_month_query = db.session.query(
        _format_year_month(Income.actual_date).label("month"),
        func.sum(Income.amount).label("total"),
    ).filter(
        Income.user_id == current_user_id,
        Income.deleted_at.is_(None),
        Income.actual_date >= start_date,
        Income.actual_date <= end_date,
    )

    if first_initial_balance_id:
        income_by_month_query = income_by_month_query.filter(
            db.or_(
                Income.type != "Initial Balance",
                Income.id == first_initial_balance_id,
            )
        )

    income_by_month = income_by_month_query.group_by(
        _format_year_month(Income.actual_date)
    ).all()

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


@analytics_bp.route("/debt-payoff", methods=["GET"])
@jwt_required()
def get_debt_payoff_progress():
    """
    Get debt payoff progress over time.

    Query params:
        start_date: YYYY-MM-DD (default: 90 days ago)
        end_date: YYYY-MM-DD (default: today)

    Returns:
        {
            data: [
                { date: 'YYYY-MM-DD', total_balance: 12345, debts: { 'Visa': 5000, ... } }
            ]
        }
    """
    current_user_id = int(get_jwt_identity())

    is_all_time = request.args.get("all_time") == "true"
    end_date = parse_date(request.args.get("end_date"), datetime.now().date())

    if is_all_time:
        # Find the earliest relevant date
        # 1. Earliest debt creation
        earliest_debt = (
            db.session.query(func.min(Debt.created_at))
            .filter_by(user_id=current_user_id)
            .scalar()
        )
        # 2. Earliest debt payment
        earliest_payment = (
            db.session.query(func.min(Expense.date))
            .filter(
                Expense.user_id == current_user_id, Expense.category == "Debt Payments"
            )
            .scalar()
        )

        start_date = datetime.now().date()  # Default fallback

        if earliest_debt:
            start_date = earliest_debt.date()

        if earliest_payment:
            # Handle string date from SQLite if necessary
            if isinstance(earliest_payment, str):
                try:
                    earliest_payment = datetime.strptime(
                        earliest_payment, "%Y-%m-%d"
                    ).date()
                except ValueError:
                    pass

            if isinstance(earliest_payment, datetime):
                earliest_payment = earliest_payment.date()

            if earliest_payment < start_date:
                start_date = earliest_payment

        # Add a small buffer (e.g. 1 day before)
        start_date = start_date - timedelta(days=1)
    else:
        start_date = parse_date(request.args.get("start_date"))
        if not start_date:
            # Default to 90 days ago if not specified
            start_date = end_date - timedelta(days=90)

    # 1. Get all debts (active and archived)
    # Note: SoftDeleteMixin filters out deleted debts automatically
    debts = Debt.query.filter_by(user_id=current_user_id).all()

    # 2. Get all debt payments
    # We need payments from start_date to NOW to calculate history correctly
    payments = Expense.query.filter(
        Expense.user_id == current_user_id,
        Expense.category == "Debt Payments",
        Expense.date >= start_date,
    ).all()

    # Group payments by date and debt name
    # payments_by_date[date][debt_name] = amount
    payments_by_date = {}
    for p in payments:
        if not p.subcategory:
            continue

        # Ensure date is a date object (handle potential string from SQLite)
        p_date = p.date
        if isinstance(p_date, str):
            try:
                p_date = datetime.strptime(p_date, "%Y-%m-%d").date()
            except ValueError:
                continue

        if p_date not in payments_by_date:
            payments_by_date[p_date] = {}

        if p.subcategory not in payments_by_date[p_date]:
            payments_by_date[p_date][p.subcategory] = 0

        payments_by_date[p_date][p.subcategory] += p.amount

    # 3. Initialize balances at END of today (current state)
    current_balances = {d.name: d.current_balance for d in debts}

    today = datetime.now().date()

    # If end_date is in the past, roll back from today to end_date
    temp_date = today
    while temp_date > end_date:
        # Add payments made on temp_date to get balance at end of temp_date - 1
        if temp_date in payments_by_date:
            day_payments = payments_by_date[temp_date]
            for debt_name, amount in day_payments.items():
                if debt_name in current_balances:
                    current_balances[debt_name] += amount
        temp_date -= timedelta(days=1)

    # Now current_balances represents the state at the END of end_date

    # 4. Generate time series backwards from end_date to start_date
    result_data = []
    curr = end_date

    while curr >= start_date:
        # Record state at END of curr
        daily_data = {
            "date": curr.strftime("%Y-%m-%d"),
            "total_balance": sum(current_balances.values()),
            "debts": current_balances.copy(),
        }
        result_data.append(daily_data)

        # Prepare for next iteration (yesterday)
        # Add payments made on curr to get balance at end of curr-1
        if curr in payments_by_date:
            day_payments = payments_by_date[curr]
            for debt_name, amount in day_payments.items():
                if debt_name in current_balances:
                    current_balances[debt_name] += amount

        curr -= timedelta(days=1)

    # Reverse to get chronological order
    result_data.reverse()

    return jsonify({"data": result_data}), 200


@analytics_bp.route("/period-comparison", methods=["GET"])
@jwt_required()
def get_period_comparison():
    """
    Compare spending and categories between current and previous period.

    Query params:
        current_start: YYYY-MM-DD (required)
        current_end: YYYY-MM-DD (required)
        previous_start: YYYY-MM-DD (optional, auto-calculated if not provided)
        previous_end: YYYY-MM-DD (optional, auto-calculated if not provided)

    Returns:
        {
            current_period: {
                start: '2025-12-21', end: '2026-01-17',
                total_spending: 48000,
                total_income: 200000,
                by_category: [{ name: 'Food', total: 15000, percentage: 31.25 }, ...]
            },
            previous_period: {
                start: '2025-11-23', end: '2025-12-20',
                total_spending: 52000,
                total_income: 200000,
                by_category: [{ name: 'Food', total: 18000, percentage: 34.62 }, ...]
            },
            comparison: {
                spending_change: -4000,
                spending_change_percent: -7.69,
                income_change: 0,
                income_change_percent: 0,
                category_changes: [
                    { name: 'Food', current: 15000, previous: 18000, change: -3000, change_percent: -16.67 },
                    ...
                ]
            }
        }
    """
    current_user_id = int(get_jwt_identity())

    # Parse dates
    current_start = parse_date(request.args.get("current_start"))
    current_end = parse_date(request.args.get("current_end"))

    if not current_start or not current_end:
        return jsonify({"error": "current_start and current_end are required"}), 400

    # Calculate period length
    period_length = (current_end - current_start).days + 1

    # Auto-calculate previous period if not provided
    previous_end_str = request.args.get("previous_end")
    previous_start_str = request.args.get("previous_start")

    if previous_end_str and previous_start_str:
        previous_start = parse_date(previous_start_str)
        previous_end = parse_date(previous_end_str)
    else:
        # Previous period ends one day before current starts
        previous_end = current_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=period_length - 1)

    def get_period_stats(start_date, end_date):
        """Get spending stats for a period."""
        # Total spending
        spending_query = (
            db.session.query(func.sum(Expense.amount))
            .filter(
                Expense.user_id == current_user_id,
                Expense.deleted_at.is_(None),
                Expense.date >= start_date,
                Expense.date <= end_date,
                ~Expense.name.ilike("%pre-existing credit card debt%"),
            )
            .scalar()
        ) or 0

        # Spending by category
        category_query = (
            db.session.query(
                Expense.category,
                func.sum(Expense.amount).label("total"),
            )
            .filter(
                Expense.user_id == current_user_id,
                Expense.deleted_at.is_(None),
                Expense.date >= start_date,
                Expense.date <= end_date,
                ~Expense.name.ilike("%pre-existing credit card debt%"),
            )
            .group_by(Expense.category)
        )

        categories = {}
        for r in category_query.all():
            categories[r.category] = r.total

        # Calculate percentages
        category_list = [
            {
                "name": name,
                "total": total,
                "percentage": (
                    round((total / spending_query) * 100, 2)
                    if spending_query > 0
                    else 0
                ),
            }
            for name, total in sorted(
                categories.items(), key=lambda x: x[1], reverse=True
            )
        ]

        # Total income
        income_query = (
            db.session.query(func.sum(Income.amount))
            .filter(
                Income.user_id == current_user_id,
                Income.deleted_at.is_(None),
                func.coalesce(Income.actual_date, Income.scheduled_date) >= start_date,
                func.coalesce(Income.actual_date, Income.scheduled_date) <= end_date,
                Income.type != "Initial Balance",
            )
            .scalar()
        ) or 0

        return {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d"),
            "total_spending": spending_query,
            "total_income": income_query,
            "by_category": category_list,
        }

    # Get stats for both periods
    current_stats = get_period_stats(current_start, current_end)
    previous_stats = get_period_stats(previous_start, previous_end)

    # Calculate comparisons
    def calc_change(current, previous):
        change = current - previous
        if previous > 0:
            change_percent = round((change / previous) * 100, 2)
        elif current > 0:
            change_percent = 100.0  # Went from 0 to something
        else:
            change_percent = 0.0
        return change, change_percent

    spending_change, spending_change_percent = calc_change(
        current_stats["total_spending"], previous_stats["total_spending"]
    )
    income_change, income_change_percent = calc_change(
        current_stats["total_income"], previous_stats["total_income"]
    )

    # Category comparisons
    all_categories = set()
    for cat in current_stats["by_category"]:
        all_categories.add(cat["name"])
    for cat in previous_stats["by_category"]:
        all_categories.add(cat["name"])

    current_by_cat = {c["name"]: c["total"] for c in current_stats["by_category"]}
    previous_by_cat = {c["name"]: c["total"] for c in previous_stats["by_category"]}

    category_changes = []
    for cat_name in all_categories:
        curr_val = current_by_cat.get(cat_name, 0)
        prev_val = previous_by_cat.get(cat_name, 0)
        change, change_percent = calc_change(curr_val, prev_val)
        category_changes.append(
            {
                "name": cat_name,
                "current": curr_val,
                "previous": prev_val,
                "change": change,
                "change_percent": change_percent,
            }
        )

    # Sort by absolute change (biggest changes first)
    category_changes.sort(key=lambda x: abs(x["change"]), reverse=True)

    return jsonify(
        {
            "current_period": current_stats,
            "previous_period": previous_stats,
            "comparison": {
                "spending_change": spending_change,
                "spending_change_percent": spending_change_percent,
                "income_change": income_change,
                "income_change_percent": income_change_percent,
                "category_changes": category_changes,
            },
        }
    )


@analytics_bp.route("/top-merchants", methods=["GET"])
@jwt_required()
def get_top_merchants():
    """
    Get top merchants by frequency and total spending.

    Query params:
        start_date: YYYY-MM-DD (default: 30 days ago)
        end_date: YYYY-MM-DD (default: today)
        limit: Number of merchants to return (default: 10)
        sort_by: 'frequency' | 'amount' (default: 'amount')
        payment_method: 'debit' | 'credit' | null (all)

    Returns:
        {
            merchants: [
                {
                    name: 'Wolt',
                    total: 45000,
                    count: 15,
                    average: 3000,
                    percentage: 25.5,
                    category: 'Food'
                },
                ...
            ],
            total_spending: 176400,
            total_transactions: 45,
            date_range: { start: '2025-12-01', end: '2025-12-31' }
        }
    """
    current_user_id = int(get_jwt_identity())

    default_start, default_end = get_date_range_defaults()
    start_date = parse_date(request.args.get("start_date"), default_start)
    end_date = parse_date(request.args.get("end_date"), default_end)
    limit = request.args.get("limit", 10, type=int)
    sort_by = request.args.get("sort_by", "amount")
    payment_method = request.args.get("payment_method")

    # Base query to group by merchant name
    query = (
        db.session.query(
            Expense.name,
            Expense.category,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count"),
        )
        .filter(
            Expense.user_id == current_user_id,
            Expense.deleted_at.is_(None),
            Expense.date >= start_date,
            Expense.date <= end_date,
            # Exclude system entries
            ~Expense.name.ilike("%pre-existing credit card debt%"),
            ~Expense.name.ilike("%initial balance%"),
        )
        .group_by(Expense.name, Expense.category)
    )

    # Payment method filter
    if payment_method == "debit":
        query = query.filter(Expense.payment_method.ilike("%debit%"))
    elif payment_method == "credit":
        query = query.filter(Expense.payment_method.ilike("%credit%"))

    results = query.all()

    # Calculate totals
    total_spending = sum(r.total for r in results)
    total_transactions = sum(r.count for r in results)

    # Sort and limit
    if sort_by == "frequency":
        sorted_results = sorted(results, key=lambda x: x.count, reverse=True)
    else:
        sorted_results = sorted(results, key=lambda x: x.total, reverse=True)

    limited_results = sorted_results[:limit]

    merchants = [
        {
            "name": r.name,
            "total": r.total,
            "count": r.count,
            "average": r.total // r.count if r.count > 0 else 0,
            "percentage": (
                round((r.total / total_spending) * 100, 1) if total_spending > 0 else 0
            ),
            "category": r.category,
        }
        for r in limited_results
    ]

    return jsonify(
        {
            "merchants": merchants,
            "total_spending": total_spending,
            "total_transactions": total_transactions,
            "date_range": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            },
        }
    )


@analytics_bp.route("/budget-vs-actual", methods=["GET"])
@jwt_required()
def get_budget_vs_actual():
    """
    Compare planned budget vs actual spending by category.

    Query params:
        start_date: YYYY-MM-DD (default: current salary period start)
        end_date: YYYY-MM-DD (default: current salary period end)

    Returns:
        {
            planned_budget: 60000,  // Total planned budget for the period
            actual_spending: 45000,  // Total actual spending
            remaining: 15000,  // Budget remaining
            utilization_percent: 75.0,  // Percentage of budget used
            by_category: [
                {
                    name: 'Food',
                    actual: 15000,
                    percentage_of_spending: 33.3,
                    percentage_of_budget: 25.0
                },
                ...
            ],
            salary_period: {
                id: 1,
                start_date: '2025-12-21',
                end_date: '2026-01-17',
                weekly_budget: 15000
            },
            date_range: { start: '2025-12-21', end: '2026-01-17' }
        }
    """
    from backend.models.database import SalaryPeriod

    current_user_id = int(get_jwt_identity())
    today = datetime.now().date()

    # Get current salary period if no dates specified
    salary_period = SalaryPeriod.query.filter(
        SalaryPeriod.user_id == current_user_id,
        SalaryPeriod.is_active.is_(True),
        SalaryPeriod.start_date <= today,
        SalaryPeriod.end_date >= today,
    ).first()

    if salary_period:
        default_start = salary_period.start_date
        default_end = salary_period.end_date
    else:
        default_start, default_end = get_date_range_defaults()

    start_date = parse_date(request.args.get("start_date"), default_start)
    end_date = parse_date(request.args.get("end_date"), default_end)

    # Find the salary period that covers the date range
    matching_period = SalaryPeriod.query.filter(
        SalaryPeriod.user_id == current_user_id,
        SalaryPeriod.start_date <= start_date,
        SalaryPeriod.end_date >= end_date,
    ).first()

    # If no exact match, try to find overlapping period
    if not matching_period:
        matching_period = SalaryPeriod.query.filter(
            SalaryPeriod.user_id == current_user_id,
            SalaryPeriod.start_date <= end_date,
            SalaryPeriod.end_date >= start_date,
        ).first()

    # Calculate planned budget based on the period and date range
    if matching_period:
        # Calculate how many days in the selected range
        total_period_days = (
            matching_period.end_date - matching_period.start_date
        ).days + 1
        selected_days = (end_date - start_date).days + 1

        # Pro-rate the budget if date range is subset of period
        if selected_days < total_period_days:
            # Calculate daily budget and multiply by selected days
            total_period_budget = (
                matching_period.remaining_amount
            )  # Budget after fixed bills
            daily_budget = total_period_budget / total_period_days
            planned_budget = int(daily_budget * selected_days)
        else:
            planned_budget = matching_period.remaining_amount

        period_info = {
            "id": matching_period.id,
            "start_date": matching_period.start_date.strftime("%Y-%m-%d"),
            "end_date": matching_period.end_date.strftime("%Y-%m-%d"),
            "weekly_budget": matching_period.weekly_budget,
            "total_budget": matching_period.remaining_amount,
            "num_sub_periods": matching_period.num_sub_periods,
        }
    else:
        # No matching period - return zero budget
        planned_budget = 0
        period_info = None

    # Get actual spending by category (excluding fixed bills for fair comparison)
    category_query = (
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
            Expense.is_fixed_bill.is_(False),
            ~Expense.name.ilike("%pre-existing credit card debt%"),
        )
        .group_by(Expense.category)
        .all()
    )

    # Calculate totals
    actual_spending = sum(r.total for r in category_query)
    remaining = planned_budget - actual_spending

    # Calculate utilization percentage
    if planned_budget > 0:
        utilization_percent = round((actual_spending / planned_budget) * 100, 1)
    else:
        utilization_percent = 0 if actual_spending == 0 else 100

    # Build category breakdown
    by_category = []
    for r in sorted(category_query, key=lambda x: x.total, reverse=True):
        cat_data = {
            "name": r.category,
            "actual": r.total,
            "count": r.count,
            "percentage_of_spending": (
                round((r.total / actual_spending) * 100, 1)
                if actual_spending > 0
                else 0
            ),
            "percentage_of_budget": (
                round((r.total / planned_budget) * 100, 1) if planned_budget > 0 else 0
            ),
        }
        by_category.append(cat_data)

    return jsonify(
        {
            "planned_budget": planned_budget,
            "actual_spending": actual_spending,
            "remaining": remaining,
            "utilization_percent": utilization_percent,
            "by_category": by_category,
            "salary_period": period_info,
            "date_range": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            },
        }
    )

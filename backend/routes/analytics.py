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
from backend.models.database import db, Expense, Income, Debt

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
            func.strftime("%Y-%m", Expense.date).label("month"),
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
        .group_by(func.strftime("%Y-%m", Expense.date))
        .all()
    )

    # Build income by month query, excluding Initial Balance after the first one
    income_by_month_query = db.session.query(
        func.strftime("%Y-%m", Income.actual_date).label("month"),
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
        func.strftime("%Y-%m", Income.actual_date)
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

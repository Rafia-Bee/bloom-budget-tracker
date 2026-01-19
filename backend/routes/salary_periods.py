"""
Bloom - Salary Periods Routes

Endpoints for managing salary periods and weekly budgeting.
Handles salary period creation, weekly budget tracking, and leftover allocation.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import (
    db,
    SalaryPeriod,
    BudgetPeriod,
    RecurringExpense,
    RecurringIncome,
    Expense,
    Income,
    Debt,
    Goal,
    User,
)
from backend.services.balance_service import get_display_balances
from backend.services.budget_service import (
    calculate_weeks_with_carryover,
    weeks_to_dict,
    WeekData,
)
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, or_, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

salary_periods_bp = Blueprint("salary_periods", __name__)


@salary_periods_bp.route("", methods=["GET"])
@jwt_required()
def get_salary_periods():
    """Get all salary periods for the current user"""
    try:
        current_user_id = int(get_jwt_identity())
        active_only = request.args.get("active_only", "false").lower() == "true"

        query = SalaryPeriod.query.filter_by(user_id=current_user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        salary_periods = query.order_by(SalaryPeriod.start_date.desc()).all()

        return (
            jsonify(
                [
                    {
                        "period_id": sp.id,  # Use period_id for consistency with budget periods
                        "id": sp.id,
                        "initial_debit_balance": sp.initial_debit_balance,
                        "initial_credit_balance": sp.initial_credit_balance,
                        "credit_limit": sp.credit_limit,
                        "credit_budget_allowance": sp.credit_budget_allowance,
                        "total_budget_amount": sp.total_budget_amount,
                        "fixed_bills_total": sp.fixed_bills_total,
                        "remaining_amount": sp.remaining_amount,
                        "weekly_budget": sp.weekly_budget,
                        "weekly_debit_budget": sp.weekly_debit_budget,
                        "weekly_credit_budget": sp.weekly_credit_budget,
                        "num_sub_periods": sp.num_sub_periods,
                        "start_date": sp.start_date.isoformat(),
                        "end_date": sp.end_date.isoformat(),
                        "is_active": sp.is_active,
                        "created_at": sp.created_at.isoformat(),
                    }
                    for sp in salary_periods
                ]
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error fetching salary periods for user {current_user_id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to retrieve salary periods"}), 500


@salary_periods_bp.route("/current", methods=["GET"])
@jwt_required()
def get_current_salary_period():
    """Get the currently active salary period with current week info"""
    try:
        current_user_id = int(get_jwt_identity())
        today = datetime.now().date()

        # Auto-activate future periods that have started
        # Find inactive periods that should be active (start_date <= today <= end_date)
        periods_to_activate = SalaryPeriod.query.filter(
            and_(
                SalaryPeriod.user_id == current_user_id,
                SalaryPeriod.is_active == False,
                SalaryPeriod.start_date <= today,
                SalaryPeriod.end_date >= today,
            )
        ).all()

        if periods_to_activate:
            # Activate periods that have started - don't deactivate others
            # Multiple periods can be active (past + current)
            for period in periods_to_activate:
                period.is_active = True
            db.session.commit()

        # Find active salary period that contains today
        salary_period = SalaryPeriod.query.filter(
            and_(
                SalaryPeriod.user_id == current_user_id,
                SalaryPeriod.is_active == True,
                SalaryPeriod.start_date <= today,
                SalaryPeriod.end_date >= today,
            )
        ).first()

        if not salary_period:
            return jsonify({"error": "No active salary period found"}), 404

        # Find current week
        current_week = BudgetPeriod.query.filter(
            and_(
                BudgetPeriod.salary_period_id == salary_period.id,
                BudgetPeriod.start_date <= today,
                BudgetPeriod.end_date >= today,
            )
        ).first()

        # Calculate spending for current week (excluding fixed bills)
        week_spent = 0
        if current_week:
            # Use date range instead of budget_period_id
            week_spent = (
                db.session.query(func.sum(Expense.amount))
                .filter(
                    and_(
                        Expense.user_id == current_user_id,
                        Expense.date >= current_week.start_date,
                        Expense.date <= current_week.end_date,
                        Expense.is_fixed_bill == False,
                    )
                )
                .scalar()
                or 0
            )

        # Get all weeks with their spending using single aggregation query
        week_sums = (
            db.session.query(
                BudgetPeriod.id,
                BudgetPeriod.week_number,
                BudgetPeriod.budget_amount,
                BudgetPeriod.start_date,
                BudgetPeriod.end_date,
                func.coalesce(func.sum(Expense.amount), 0).label("total_spent"),
            )
            .outerjoin(
                Expense,
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= BudgetPeriod.start_date,
                    Expense.date <= BudgetPeriod.end_date,
                    Expense.is_fixed_bill == False,
                ),
            )
            .filter(BudgetPeriod.salary_period_id == salary_period.id)
            .group_by(
                BudgetPeriod.id,
                BudgetPeriod.week_number,
                BudgetPeriod.budget_amount,
                BudgetPeriod.start_date,
                BudgetPeriod.end_date,
            )
            .order_by(BudgetPeriod.week_number)
            .all()
        )

        # Convert query results to WeekData and calculate carryover
        week_data_list = [
            WeekData(
                week_id=row[0],
                week_number=row[1],
                budget_amount=row[2],
                start_date=row[3],
                end_date=row[4],
                spent=row[5],
            )
            for row in week_sums
        ]
        calculated_weeks = calculate_weeks_with_carryover(week_data_list, today)
        weeks_data = weeks_to_dict(calculated_weeks)

        # Calculate period-level spending by payment method (excluding fixed bills)
        period_debit_spent = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= salary_period.start_date,
                    Expense.date <= salary_period.end_date,
                    Expense.is_fixed_bill == False,
                    Expense.payment_method == "Debit card",
                )
            )
            .scalar()
            or 0
        )

        period_credit_spent = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= salary_period.start_date,
                    Expense.date <= salary_period.end_date,
                    Expense.is_fixed_bill == False,
                    Expense.payment_method == "Credit card",
                )
            )
            .scalar()
            or 0
        )

        # Calculate period income (excluding 'Initial Balance' unless this is first period)
        first_salary_period = (
            SalaryPeriod.query.filter_by(user_id=current_user_id)
            .order_by(SalaryPeriod.start_date.asc())
            .first()
        )
        is_first_period = (
            first_salary_period and first_salary_period.id == salary_period.id
        )

        period_income_query = db.session.query(
            func.coalesce(func.sum(Income.amount), 0)
        ).filter(
            and_(
                Income.user_id == current_user_id,
                Income.deleted_at.is_(None),
                or_(
                    and_(
                        Income.actual_date.isnot(None),
                        Income.actual_date >= salary_period.start_date,
                        Income.actual_date <= salary_period.end_date,
                    ),
                    and_(
                        Income.actual_date.is_(None),
                        Income.scheduled_date >= salary_period.start_date,
                        Income.scheduled_date <= salary_period.end_date,
                    ),
                ),
            )
        )

        # Exclude 'Initial Balance' type unless this is the first period
        if not is_first_period:
            period_income_query = period_income_query.filter(
                Income.type != "Initial Balance"
            )

        period_income = period_income_query.scalar() or 0

        # Calculate all-time spent (total debit expenses for this user, excluding fixed bills)
        all_time_spent = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.payment_method == "Debit card",
                    Expense.is_fixed_bill == False,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        # Get real-time balances using balance service
        real_balances = get_display_balances(salary_period.id, current_user_id)

        return (
            jsonify(
                {
                    "salary_period": {
                        "id": salary_period.id,
                        "salary_amount": salary_period.salary_amount,
                        "fixed_bills_total": salary_period.fixed_bills_total,
                        "remaining_amount": salary_period.remaining_amount,
                        "weekly_budget": salary_period.weekly_budget,
                        "credit_limit": salary_period.credit_limit,
                        "initial_debit_balance": salary_period.initial_debit_balance,
                        "initial_credit_balance": salary_period.initial_credit_balance,
                        # Add real-time balances (in cents for consistency with other amounts)
                        "display_debit_balance": int(
                            real_balances["debit_balance"] * 100
                        ),
                        "display_credit_available": int(
                            real_balances["credit_available"] * 100
                        ),
                        # Add period-level spending by payment method (in cents)
                        "period_debit_spent": period_debit_spent,
                        "period_credit_spent": period_credit_spent,
                        # Add period income (in cents)
                        "period_income": period_income,
                        # Add all-time spent for this user (in cents)
                        "all_time_spent": all_time_spent,
                        "credit_budget_allowance": salary_period.credit_budget_allowance,
                        "num_sub_periods": salary_period.num_sub_periods,
                        "start_date": salary_period.start_date.isoformat(),
                        "end_date": salary_period.end_date.isoformat(),
                        "weeks": weeks_data,
                    },
                    "current_week": {
                        "id": current_week.id if current_week else None,
                        "week_number": (
                            current_week.week_number if current_week else None
                        ),
                        "budget_amount": (
                            current_week.budget_amount if current_week else None
                        ),
                        "spent": week_spent,
                        "remaining": (
                            (current_week.budget_amount - week_spent)
                            if current_week
                            else 0
                        ),
                        "start_date": (
                            current_week.start_date.isoformat()
                            if current_week
                            else None
                        ),
                        "end_date": (
                            current_week.end_date.isoformat() if current_week else None
                        ),
                    },
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error fetching current salary period: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to retrieve current salary period"}), 500


@salary_periods_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_salary_period_by_id(id):
    """Get a specific salary period by ID with calculated balances and week data"""
    try:
        current_user_id = int(get_jwt_identity())
        today = datetime.now().date()

        # Find the salary period
        salary_period = SalaryPeriod.query.filter_by(
            id=id, user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({"error": "Salary period not found"}), 404

        # Get all weeks with their spending using single aggregation query
        week_sums = (
            db.session.query(
                BudgetPeriod.id,
                BudgetPeriod.week_number,
                BudgetPeriod.budget_amount,
                BudgetPeriod.start_date,
                BudgetPeriod.end_date,
                func.coalesce(func.sum(Expense.amount), 0).label("total_spent"),
            )
            .outerjoin(
                Expense,
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= BudgetPeriod.start_date,
                    Expense.date <= BudgetPeriod.end_date,
                    Expense.is_fixed_bill == False,
                ),
            )
            .filter(BudgetPeriod.salary_period_id == salary_period.id)
            .group_by(
                BudgetPeriod.id,
                BudgetPeriod.week_number,
                BudgetPeriod.budget_amount,
                BudgetPeriod.start_date,
                BudgetPeriod.end_date,
            )
            .order_by(BudgetPeriod.week_number)
            .all()
        )

        # Convert query results to WeekData and calculate carryover
        week_data_list = [
            WeekData(
                week_id=row[0],
                week_number=row[1],
                budget_amount=row[2],
                start_date=row[3],
                end_date=row[4],
                spent=row[5],
            )
            for row in week_sums
        ]
        calculated_weeks = calculate_weeks_with_carryover(week_data_list, today)
        weeks_data = weeks_to_dict(calculated_weeks)

        # Calculate period-level spending by payment method (excluding fixed bills)
        period_debit_spent = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= salary_period.start_date,
                    Expense.date <= salary_period.end_date,
                    Expense.is_fixed_bill == False,
                    Expense.payment_method == "Debit card",
                )
            )
            .scalar()
            or 0
        )

        period_credit_spent = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= salary_period.start_date,
                    Expense.date <= salary_period.end_date,
                    Expense.is_fixed_bill == False,
                    Expense.payment_method == "Credit card",
                )
            )
            .scalar()
            or 0
        )

        # Calculate period income (excluding 'Initial Balance' unless this is first period)
        first_salary_period = (
            SalaryPeriod.query.filter_by(user_id=current_user_id)
            .order_by(SalaryPeriod.start_date.asc())
            .first()
        )
        is_first_period = (
            first_salary_period and first_salary_period.id == salary_period.id
        )

        period_income_query = db.session.query(
            func.coalesce(func.sum(Income.amount), 0)
        ).filter(
            and_(
                Income.user_id == current_user_id,
                Income.deleted_at.is_(None),
                or_(
                    and_(
                        Income.actual_date.isnot(None),
                        Income.actual_date >= salary_period.start_date,
                        Income.actual_date <= salary_period.end_date,
                    ),
                    and_(
                        Income.actual_date.is_(None),
                        Income.scheduled_date >= salary_period.start_date,
                        Income.scheduled_date <= salary_period.end_date,
                    ),
                ),
            )
        )

        # Exclude 'Initial Balance' type unless this is the first period
        if not is_first_period:
            period_income_query = period_income_query.filter(
                Income.type != "Initial Balance"
            )

        period_income = period_income_query.scalar() or 0

        # Calculate all-time spent (total debit expenses for this user, excluding fixed bills)
        all_time_spent = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.payment_method == "Debit card",
                    Expense.is_fixed_bill == False,
                    Expense.deleted_at.is_(None),
                )
            )
            .scalar()
            or 0
        )

        # Get real-time balances using balance service
        real_balances = get_display_balances(salary_period.id, current_user_id)

        # Check if this period contains today (is_current)
        is_current = salary_period.start_date <= today <= salary_period.end_date

        # Find current week within this period (if applicable)
        current_week = None
        if is_current:
            current_week = BudgetPeriod.query.filter(
                and_(
                    BudgetPeriod.salary_period_id == salary_period.id,
                    BudgetPeriod.start_date <= today,
                    BudgetPeriod.end_date >= today,
                )
            ).first()

        # Calculate week_spent for current week
        week_spent = 0
        if current_week:
            week_spent = (
                db.session.query(func.sum(Expense.amount))
                .filter(
                    and_(
                        Expense.user_id == current_user_id,
                        Expense.date >= current_week.start_date,
                        Expense.date <= current_week.end_date,
                        Expense.is_fixed_bill == False,
                    )
                )
                .scalar()
                or 0
            )

        return (
            jsonify(
                {
                    "salary_period": {
                        "id": salary_period.id,
                        "salary_amount": salary_period.salary_amount,
                        "fixed_bills_total": salary_period.fixed_bills_total,
                        "remaining_amount": salary_period.remaining_amount,
                        "weekly_budget": salary_period.weekly_budget,
                        "credit_limit": salary_period.credit_limit,
                        "initial_debit_balance": salary_period.initial_debit_balance,
                        "initial_credit_balance": salary_period.initial_credit_balance,
                        # Add real-time balances (in cents)
                        "display_debit_balance": int(
                            real_balances["debit_balance"] * 100
                        ),
                        "display_credit_available": int(
                            real_balances["credit_available"] * 100
                        ),
                        # Add period-level spending by payment method (in cents)
                        "period_debit_spent": period_debit_spent,
                        "period_credit_spent": period_credit_spent,
                        # Add period income (in cents)
                        "period_income": period_income,
                        # Add all-time spent for this user (in cents)
                        "all_time_spent": all_time_spent,
                        "credit_budget_allowance": salary_period.credit_budget_allowance,
                        "num_sub_periods": salary_period.num_sub_periods,
                        "start_date": salary_period.start_date.isoformat(),
                        "end_date": salary_period.end_date.isoformat(),
                        "is_current": is_current,
                        "weeks": weeks_data,
                    },
                    "current_week": {
                        "id": current_week.id if current_week else None,
                        "week_number": (
                            current_week.week_number if current_week else None
                        ),
                        "budget_amount": (
                            current_week.budget_amount if current_week else None
                        ),
                        "spent": week_spent,
                        "remaining": (
                            (current_week.budget_amount - week_spent)
                            if current_week
                            else 0
                        ),
                        "start_date": (
                            current_week.start_date.isoformat()
                            if current_week
                            else None
                        ),
                        "end_date": (
                            current_week.end_date.isoformat() if current_week else None
                        ),
                    },
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error fetching salary period {id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to retrieve salary period"}), 500


@salary_periods_bp.route("/preview", methods=["POST"])
@jwt_required()
def preview_salary_period():
    """Preview salary period calculation before creating it"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Get balance-based inputs
        debit_balance = data.get("debit_balance")
        credit_balance = data.get("credit_balance", 0)
        credit_allowance = data.get("credit_allowance", 0)
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()

        # Flexible sub-periods support
        end_date_str = data.get("end_date")
        num_sub_periods = data.get("num_sub_periods", 4)

        # Validate credit allowance doesn't exceed available credit
        if credit_allowance > credit_balance:
            return (
                jsonify({"error": "Credit allowance cannot exceed available credit"}),
                400,
            )

        # Auto-detect fixed bills from recurring expenses
        fixed_bills = (
            RecurringExpense.active()
            .filter_by(user_id=current_user_id, is_active=True, is_fixed_bill=True)
            .all()
        )

        # Auto-detect expected income from recurring income
        expected_income_list = RecurringIncome.query.filter_by(
            user_id=current_user_id, is_active=True
        ).all()

        # Allow manual adjustments to fixed bills
        fixed_bill_adjustments = data.get("fixed_bills", [])

        # Allow manual adjustments to expected income
        expected_income_adjustments = data.get("expected_income", [])

        # Calculate fixed bills total - use adjustments if provided, otherwise use auto-detected
        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill["amount"] for bill in fixed_bill_adjustments)
            bills_list = fixed_bill_adjustments
        else:
            fixed_bills_total = sum(bill.amount for bill in fixed_bills)
            bills_list = [
                {
                    "id": bill.id,
                    "name": bill.name,
                    "amount": bill.amount,
                    "category": bill.category,
                }
                for bill in fixed_bills
            ]

        # Calculate expected income total - use adjustments if provided, otherwise use auto-detected
        if expected_income_adjustments:
            expected_income_total = sum(
                inc["amount"] for inc in expected_income_adjustments
            )
            income_list = expected_income_adjustments
        else:
            expected_income_total = sum(inc.amount for inc in expected_income_list)
            income_list = [
                {
                    "id": inc.id,
                    "name": inc.name,
                    "amount": inc.amount,
                    "income_type": inc.income_type,
                }
                for inc in expected_income_list
            ]

        # Calculate budget: debit + credit allowance + expected income - fixed bills
        total_budget = (
            debit_balance + credit_allowance + expected_income_total - fixed_bills_total
        )
        remaining_amount = total_budget
        weekly_budget = remaining_amount // num_sub_periods

        # Calculate debit vs credit portions of weekly budget
        debit_after_bills = debit_balance - fixed_bills_total
        if debit_after_bills >= weekly_budget * num_sub_periods:
            # All budget comes from debit
            weekly_debit_budget = weekly_budget
            weekly_credit_budget = 0
        else:
            # Split between debit and credit
            weekly_debit_budget = max(0, debit_after_bills // num_sub_periods)
            weekly_credit_budget = weekly_budget - weekly_debit_budget

        # Calculate end date (use provided or default to monthly)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        else:
            end_date = start_date + relativedelta(months=1) - timedelta(days=1)

        # Validate date range
        if end_date <= start_date:
            return (
                jsonify({"error": "End date must be after start date"}),
                400,
            )

        # Validate num_sub_periods
        total_days = (end_date - start_date).days + 1
        if num_sub_periods < 1 or num_sub_periods > total_days:
            return (
                jsonify(
                    {"error": f"Number of periods must be between 1 and {total_days}"}
                ),
                400,
            )

        # Calculate sub-period dates (distribute days evenly)
        weeks = []
        current_start = start_date
        days_per_period = total_days // num_sub_periods
        extra_days = total_days % num_sub_periods

        for period_num in range(1, num_sub_periods + 1):
            # Distribute extra days across first periods
            period_days = days_per_period + (1 if period_num <= extra_days else 0)
            week_end = current_start + timedelta(days=period_days - 1)

            # Last period ends exactly on end_date
            if period_num == num_sub_periods:
                week_end = end_date

            weeks.append(
                {
                    "week_number": period_num,
                    "start_date": current_start.isoformat(),
                    "end_date": week_end.isoformat(),
                    "budget_amount": weekly_budget,
                }
            )

            current_start = week_end + timedelta(days=1)

        return (
            jsonify(
                {
                    "debit_balance": debit_balance,
                    "credit_balance": credit_balance,
                    "credit_allowance": credit_allowance,
                    "total_budget": total_budget,
                    "fixed_bills_total": fixed_bills_total,
                    "fixed_bills": bills_list,
                    "expected_income_total": expected_income_total,
                    "expected_income": income_list,
                    "remaining_amount": remaining_amount,
                    "weekly_budget": weekly_budget,
                    "weekly_debit_budget": weekly_debit_budget,
                    "weekly_credit_budget": weekly_credit_budget,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "weeks": weeks,
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error previewing salary period for user {current_user_id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to preview salary period"}), 500
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400


@salary_periods_bp.route("", methods=["POST"])
@jwt_required()
def create_salary_period():
    """Create a new salary period with N budget periods (default 4)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        # Get balance-based inputs
        debit_balance = data["debit_balance"]
        credit_balance = data.get("credit_balance", 0)
        # Default to available if not provided
        credit_limit = data.get("credit_limit", credit_balance)
        credit_allowance = data.get("credit_allowance", 0)
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()

        # Flexible sub-periods support
        end_date_str = data.get("end_date")
        num_sub_periods = data.get("num_sub_periods", 4)

        # Calculate end date first (needed for validation)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        else:
            end_date = start_date + relativedelta(months=1) - timedelta(days=1)

        # Validate date range
        if end_date <= start_date:
            return (
                jsonify({"error": "End date must be after start date"}),
                400,
            )

        # Validate num_sub_periods early (before any division)
        total_days = (end_date - start_date).days + 1
        if num_sub_periods < 1 or num_sub_periods > total_days:
            return (
                jsonify(
                    {"error": f"Number of periods must be between 1 and {total_days}"}
                ),
                400,
            )

        # Validate credit allowance
        if credit_allowance > credit_balance:
            return (
                jsonify({"error": "Credit allowance cannot exceed available credit"}),
                400,
            )

        # Get fixed bills (either auto-detected or manually adjusted)
        fixed_bill_adjustments = data.get("fixed_bills", [])

        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill["amount"] for bill in fixed_bill_adjustments)
        else:
            # Auto-detect from recurring expenses
            fixed_bills = (
                RecurringExpense.active()
                .filter_by(user_id=current_user_id, is_active=True, is_fixed_bill=True)
                .all()
            )
            fixed_bills_total = sum(bill.amount for bill in fixed_bills)

        # Calculate budget: debit + credit allowance - fixed bills
        total_budget = debit_balance + credit_allowance - fixed_bills_total
        remaining_amount = total_budget
        weekly_budget = remaining_amount // num_sub_periods

        # Calculate debit vs credit portions of weekly budget
        debit_after_bills = debit_balance - fixed_bills_total
        if debit_after_bills >= weekly_budget * num_sub_periods:
            weekly_debit_budget = weekly_budget
            weekly_credit_budget = 0
        else:
            weekly_debit_budget = max(0, debit_after_bills // num_sub_periods)
            weekly_credit_budget = weekly_budget - weekly_debit_budget

        # Check for overlapping salary periods
        overlapping = SalaryPeriod.query.filter(
            SalaryPeriod.user_id == current_user_id,
            or_(
                and_(
                    SalaryPeriod.start_date <= start_date,
                    SalaryPeriod.end_date >= start_date,
                ),
                and_(
                    SalaryPeriod.start_date <= end_date,
                    SalaryPeriod.end_date >= end_date,
                ),
                and_(
                    SalaryPeriod.start_date >= start_date,
                    SalaryPeriod.end_date <= end_date,
                ),
            ),
        ).first()

        if overlapping:
            return (
                jsonify(
                    {
                        "error": f"This period overlaps with an existing period ({overlapping.start_date} to {overlapping.end_date}). Please choose different dates."
                    }
                ),
                400,
            )

        # Smart activation logic:
        # - If creating a future period (starts after today), keep it inactive
        # - If creating a current/past period, set it to active
        # NOTE: Multiple periods can be active (past + current). Only future periods
        # start as inactive and get auto-activated when their start date arrives.
        today = datetime.now().date()
        is_future_period = start_date > today

        if is_future_period:
            # Creating a future period - keep it inactive until its start date
            is_active = False
        else:
            # Creating a current/past period - set it to active
            # Don't deactivate other periods - they can coexist
            is_active = True

        # Wrap all operations in a transaction
        try:
            # Create salary period
            salary_period = SalaryPeriod(
                user_id=current_user_id,
                initial_debit_balance=debit_balance,
                initial_credit_balance=credit_balance,
                credit_limit=credit_limit,
                credit_budget_allowance=credit_allowance,
                total_budget_amount=total_budget,
                fixed_bills_total=fixed_bills_total,
                remaining_amount=remaining_amount,
                weekly_budget=weekly_budget,
                weekly_debit_budget=weekly_debit_budget,
                weekly_credit_budget=weekly_credit_budget,
                start_date=start_date,
                end_date=end_date,
                is_active=is_active,
                num_sub_periods=num_sub_periods,
            )

            db.session.add(salary_period)
            db.session.flush()  # Get salary_period.id

            # Create N budget periods (distribute days evenly)
            current_start = start_date
            total_days = (end_date - start_date).days + 1
            days_per_period = total_days // num_sub_periods
            extra_days = total_days % num_sub_periods

            for period_num in range(1, num_sub_periods + 1):
                # Distribute extra days across first periods
                period_days = days_per_period + (1 if period_num <= extra_days else 0)
                week_end = current_start + timedelta(days=period_days - 1)

                # Last period ends exactly on end_date
                if period_num == num_sub_periods:
                    week_end = end_date

                budget_period = BudgetPeriod(
                    user_id=current_user_id,
                    salary_period_id=salary_period.id,
                    week_number=period_num,
                    budget_amount=weekly_budget,
                    start_date=current_start,
                    end_date=week_end,
                    period_type="custom" if num_sub_periods != 4 else "weekly",
                )

                db.session.add(budget_period)
                current_start = week_end + timedelta(days=1)

            # Create initial income entry for the debit balance ONLY for the first salary period
            # This makes the dashboard debit/credit cards show correct available amounts
            # Subsequent salary periods should NOT create new Initial Balance entries
            existing_initial_balance = (
                Income.active()
                .filter_by(user_id=current_user_id, type="Initial Balance")
                .first()
            )

            # Also populate User balance fields (Issue #149 Phase 3)
            # Update user balance anchor if this is the first period OR if creating an earlier period
            user = User.query.get(current_user_id)
            if user:
                is_new_anchor = (
                    user.balance_start_date is None
                    or start_date < user.balance_start_date
                )
                if is_new_anchor:
                    # This period becomes the new balance anchor (earliest period)
                    user.balance_start_date = start_date
                    user.user_initial_debit_balance = debit_balance
                    user.user_initial_credit_limit = credit_limit
                    # Store credit_balance directly (what user entered)
                    user.user_initial_credit_available = credit_balance
                    # Note: balance_mode has a default value in the model, no need to set it here
                    # User can change it via Settings; we don't override their choice

            if not existing_initial_balance and debit_balance > 0:
                initial_income = Income(
                    user_id=current_user_id,
                    type="Initial Balance",
                    amount=debit_balance,
                    scheduled_date=start_date,
                    actual_date=start_date,
                )
                try:
                    db.session.add(initial_income)
                    db.session.flush()  # Check constraint before final commit
                except IntegrityError:
                    # Race condition: another request already created Initial Balance
                    db.session.rollback()
                    # Continue without creating duplicate - the other one will be used

            # Create Pre-existing Credit Card Debt expense if user has existing debt
            # (credit_limit > credit_balance means they owe money)
            pre_existing_debt = credit_limit - credit_balance
            if pre_existing_debt > 0:
                # Check if debt expense already exists for this user
                existing_debt_expense = (
                    Expense.active()
                    .filter_by(
                        user_id=current_user_id,
                        name="Pre-existing Credit Card Debt",
                        category="Debt",
                        subcategory="Credit Card",
                    )
                    .first()
                )

                if not existing_debt_expense:
                    # Create new debt marker (date is day before period starts)
                    debt_expense = Expense(
                        user_id=current_user_id,
                        name="Pre-existing Credit Card Debt",
                        amount=pre_existing_debt,
                        category="Debt",
                        subcategory="Credit Card",
                        payment_method="Credit card",
                        date=start_date - timedelta(days=1),
                        is_fixed_bill=False,
                        notes="Existing credit card balance at budget period start",
                    )
                    db.session.add(debt_expense)

            # Commit all changes together
            db.session.commit()

            return (
                jsonify(
                    {
                        "id": salary_period.id,
                        "message": f"Salary period created successfully with {num_sub_periods} budget periods",
                    }
                ),
                201,
            )
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(
                f"Failed to create salary period for user {current_user_id}: {str(e)}",
                exc_info=True,
            )
            return (
                jsonify({"error": "Failed to create salary period. Please try again."}),
                500,
            )
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400


@salary_periods_bp.route("/<int:id>/week/<int:week_number>/leftover", methods=["GET"])
@jwt_required()
def get_week_leftover(id, week_number):
    """Calculate leftover budget for a specific week"""
    try:
        current_user_id = int(get_jwt_identity())
        today = datetime.now().date()

        # Get salary period
        salary_period = SalaryPeriod.query.filter_by(
            id=id, user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({"error": "Salary period not found"}), 404

        # Get the specific week
        budget_period = BudgetPeriod.query.filter_by(
            salary_period_id=salary_period.id, week_number=week_number
        ).first()

        if not budget_period:
            return jsonify({"error": "Week not found"}), 404

        # Get all weeks up to and including current week for carryover calculation
        weeks_up_to_current = (
            db.session.query(
                BudgetPeriod.id,
                BudgetPeriod.week_number,
                BudgetPeriod.budget_amount,
                BudgetPeriod.start_date,
                BudgetPeriod.end_date,
                func.coalesce(func.sum(Expense.amount), 0).label("total_spent"),
            )
            .outerjoin(
                Expense,
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= BudgetPeriod.start_date,
                    Expense.date <= BudgetPeriod.end_date,
                    Expense.is_fixed_bill == False,
                ),
            )
            .filter(
                and_(
                    BudgetPeriod.salary_period_id == salary_period.id,
                    BudgetPeriod.week_number <= week_number,
                )
            )
            .group_by(
                BudgetPeriod.id,
                BudgetPeriod.week_number,
                BudgetPeriod.budget_amount,
                BudgetPeriod.start_date,
                BudgetPeriod.end_date,
            )
            .order_by(BudgetPeriod.week_number)
            .all()
        )

        # Convert to WeekData and calculate carryover using budget service
        week_data_list = [
            WeekData(
                week_id=row[0],
                week_number=row[1],
                budget_amount=row[2],
                start_date=row[3],
                end_date=row[4],
                spent=row[5],
            )
            for row in weeks_up_to_current
        ]
        calculated_weeks = calculate_weeks_with_carryover(week_data_list, today)

        # Find the current week's calculated data
        current_week_data = next(
            (w for w in calculated_weeks if w.week_number == week_number), None
        )

        if not current_week_data:
            return jsonify({"error": "Week calculation failed"}), 500

        adjusted_budget = current_week_data.adjusted_budget
        cumulative_carryover = current_week_data.carryover
        week_spent = current_week_data.spent
        leftover = current_week_data.remaining

        # Get user's active debts for allocation suggestions
        from backend.models.database import Debt

        active_debts = (
            Debt.active().filter_by(user_id=current_user_id, archived=False).all()
        )

        # Get user's active goals for allocation suggestions
        active_goals = Goal.query.filter_by(
            user_id=current_user_id, is_active=True
        ).all()

        return (
            jsonify(
                {
                    "week_number": week_number,
                    "start_date": budget_period.start_date.isoformat(),
                    "end_date": budget_period.end_date.isoformat(),
                    "budget_amount": budget_period.budget_amount,
                    "adjusted_budget": adjusted_budget,
                    "carryover": cumulative_carryover,
                    "spent": week_spent,
                    "leftover": leftover,
                    "allocation_options": {
                        "debts": [
                            {
                                "id": debt.id,
                                "name": debt.name,
                                "current_balance": debt.current_balance,
                                "monthly_payment": debt.monthly_payment,
                            }
                            for debt in active_debts
                        ],
                        "goals": [
                            {
                                "id": goal.id,
                                "name": goal.name,
                                "target_amount": goal.target_amount,
                                "target_date": (
                                    goal.target_date.isoformat()
                                    if goal.target_date
                                    else None
                                ),
                                "progress": goal.calculate_progress(),
                                "subcategory_name": goal.subcategory_name,
                            }
                            for goal in active_goals
                        ],
                    },
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error getting week leftover for period {id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to calculate week leftover"}), 500


@salary_periods_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_salary_period_full(id):
    """Update salary period with full recalculation (similar to creation)"""
    try:
        current_user_id = int(get_jwt_identity())

        salary_period = SalaryPeriod.query.filter_by(
            id=id, user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({"error": "Salary period not found"}), 404

        data = request.get_json()

        # Get updated balance-based inputs
        debit_balance = data["debit_balance"]
        credit_balance = data.get("credit_balance", 0)
        credit_limit = data.get("credit_limit", credit_balance)
        credit_allowance = data.get("credit_allowance", 0)
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()

        # Flexible sub-periods support
        end_date_str = data.get("end_date")
        num_sub_periods = data.get(
            "num_sub_periods", salary_period.num_sub_periods or 4
        )

        # Validate credit allowance
        if credit_allowance > credit_balance:
            return (
                jsonify({"error": "Credit allowance cannot exceed available credit"}),
                400,
            )

        # Get fixed bills
        fixed_bill_adjustments = data.get("fixed_bills", [])

        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill["amount"] for bill in fixed_bill_adjustments)
        else:
            # Auto-detect from recurring expenses
            fixed_bills = (
                RecurringExpense.active()
                .filter_by(user_id=current_user_id, is_active=True, is_fixed_bill=True)
                .all()
            )
            fixed_bills_total = sum(bill.amount for bill in fixed_bills)

        # Calculate budget: debit + credit allowance - fixed bills
        total_budget = debit_balance + credit_allowance - fixed_bills_total
        remaining_amount = total_budget
        weekly_budget = remaining_amount // num_sub_periods

        # Calculate debit vs credit portions of weekly budget
        debit_after_bills = debit_balance - fixed_bills_total
        if debit_after_bills >= weekly_budget * num_sub_periods:
            weekly_debit_budget = weekly_budget
            weekly_credit_budget = 0
        else:
            weekly_debit_budget = max(0, debit_after_bills // num_sub_periods)
            weekly_credit_budget = weekly_budget - weekly_debit_budget

        # Calculate end date (use provided or default to monthly)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        else:
            end_date = start_date + relativedelta(months=1) - timedelta(days=1)

        # Validate date range
        if end_date <= start_date:
            return (
                jsonify({"error": "End date must be after start date"}),
                400,
            )

        # Validate num_sub_periods
        total_days = (end_date - start_date).days + 1
        if num_sub_periods < 1 or num_sub_periods > total_days:
            return (
                jsonify(
                    {"error": f"Number of periods must be between 1 and {total_days}"}
                ),
                400,
            )

        # Check for overlapping salary periods (excluding current one)
        overlapping = SalaryPeriod.query.filter(
            SalaryPeriod.user_id == current_user_id,
            SalaryPeriod.id != id,
            or_(
                and_(
                    SalaryPeriod.start_date <= start_date,
                    SalaryPeriod.end_date >= start_date,
                ),
                and_(
                    SalaryPeriod.start_date <= end_date,
                    SalaryPeriod.end_date >= end_date,
                ),
                and_(
                    SalaryPeriod.start_date >= start_date,
                    SalaryPeriod.end_date <= end_date,
                ),
            ),
        ).first()

        if overlapping:
            return (
                jsonify(
                    {
                        "error": f"This period overlaps with an existing period ({overlapping.start_date} to {overlapping.end_date}). Please choose different dates."
                    }
                ),
                400,
            )

        # Update salary period fields
        salary_period.initial_debit_balance = debit_balance
        salary_period.initial_credit_balance = credit_balance
        salary_period.credit_limit = credit_limit
        salary_period.credit_budget_allowance = credit_allowance
        salary_period.total_budget_amount = total_budget
        salary_period.fixed_bills_total = fixed_bills_total
        salary_period.remaining_amount = remaining_amount
        salary_period.weekly_budget = weekly_budget
        salary_period.weekly_debit_budget = weekly_debit_budget
        salary_period.weekly_credit_budget = weekly_credit_budget
        salary_period.start_date = start_date
        salary_period.end_date = end_date
        salary_period.num_sub_periods = num_sub_periods

        # Update user's anchor balances if editing the anchor salary period
        # In SYNC mode, display_balance uses user.user_initial_debit_balance,
        # so we need to update it when the anchor period is edited
        user = User.query.get(current_user_id)
        if user and user.balance_start_date:
            # Check if this is the anchor period (starts on or before balance_start_date)
            if (
                salary_period.start_date
                <= user.balance_start_date
                <= salary_period.end_date
            ):
                user.user_initial_debit_balance = debit_balance
                user.user_initial_credit_available = credit_balance
                user.user_initial_credit_limit = credit_limit

        # Delete existing budget periods and recreate with new configuration
        BudgetPeriod.query.filter_by(salary_period_id=salary_period.id).delete()

        # Create N budget periods (distribute days evenly)
        current_start = start_date
        days_per_period = total_days // num_sub_periods
        extra_days = total_days % num_sub_periods

        for period_num in range(1, num_sub_periods + 1):
            # Distribute extra days across first periods
            period_days = days_per_period + (1 if period_num <= extra_days else 0)
            week_end = current_start + timedelta(days=period_days - 1)

            # Last period ends exactly on end_date
            if period_num == num_sub_periods:
                week_end = end_date

            budget_period = BudgetPeriod(
                user_id=current_user_id,
                salary_period_id=salary_period.id,
                week_number=period_num,
                budget_amount=weekly_budget,
                start_date=current_start,
                end_date=week_end,
                period_type="custom" if num_sub_periods != 4 else "weekly",
            )
            db.session.add(budget_period)
            current_start = week_end + timedelta(days=1)

        # Initial Balance handling:
        # The Initial Balance income record represents the user's starting money when they
        # first began using the app. It should ONLY be created once when setting up.
        # EXCEPTION: When editing the ANCHOR salary period (the one that contains
        # balance_start_date), we update both the user's anchor balance AND the
        # Initial Balance income to keep them in sync.
        initial_income = (
            Income.active()
            .filter_by(
                user_id=current_user_id,
                type="Initial Balance",
            )
            .order_by(Income.actual_date)  # Get the FIRST one (earliest)
            .first()
        )

        # Check if this is the anchor period
        is_anchor_period = (
            user
            and user.balance_start_date
            and salary_period.start_date
            <= user.balance_start_date
            <= salary_period.end_date
        )

        if not initial_income and debit_balance > 0:
            # First salary period ever - create the Initial Balance record
            # This only happens once per user (or if they deleted all data)
            initial_income = Income(
                user_id=current_user_id,
                type="Initial Balance",
                amount=debit_balance,
                scheduled_date=start_date,
                actual_date=start_date,
            )
            try:
                db.session.add(initial_income)
                db.session.flush()  # Check constraint before final commit
            except IntegrityError:
                # Race condition: another request already created Initial Balance
                db.session.rollback()
                # Continue - the existing one will be used
        elif initial_income and is_anchor_period:
            # Editing the anchor period - update Initial Balance to stay in sync
            # with user.user_initial_debit_balance
            initial_income.amount = debit_balance

        # Update Pre-existing Credit Card Debt expense if credit changed
        pre_existing_debt = credit_limit - credit_balance
        debt_expense = (
            Expense.active()
            .filter_by(
                user_id=current_user_id,
                name="Pre-existing Credit Card Debt",
                category="Debt",
                subcategory="Credit Card",
            )
            .filter(Expense.date < start_date)
            .order_by(Expense.date.desc())
            .first()
        )

        if pre_existing_debt > 0:
            if debt_expense:
                debt_expense.amount = pre_existing_debt
            else:
                # Create if doesn't exist
                debt_expense = Expense(
                    user_id=current_user_id,
                    name="Pre-existing Credit Card Debt",
                    amount=pre_existing_debt,
                    category="Debt",
                    subcategory="Credit Card",
                    payment_method="Credit card",
                    date=start_date - timedelta(days=1),
                    is_fixed_bill=False,
                    notes="Existing credit card balance at budget period start",
                )
                db.session.add(debt_expense)
        elif debt_expense:
            # If debt is now 0, delete the expense
            db.session.delete(debt_expense)

        # Update future period "Period Salary" income if it exists
        # When creating a future period in SYNC mode, user can choose to create
        # a "Projected Period Salary: <date>" income entry for expected income. If editing, update that income.
        if (
            user
            and user.balance_start_date
            and salary_period.start_date > user.balance_start_date
        ):
            # This is a future period - check for associated Period Salary income
            # The income type is "Projected Period Salary: <start_date>" for concrete matching
            period_salary_type = f"Projected Period Salary: {start_date}"
            future_salary_income = (
                Income.active()
                .filter_by(
                    user_id=current_user_id,
                    type=period_salary_type,
                )
                .first()
            )
            if future_salary_income:
                # Update the salary income to match the new debit balance
                future_salary_income.amount = debit_balance

        db.session.commit()

        return (
            jsonify(
                {
                    "id": salary_period.id,
                    "message": "Salary period updated successfully",
                }
            ),
            200,
        )
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"Database error updating salary period {id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to update salary period"}), 500
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400


@salary_periods_bp.route("/<int:id>/recalculate", methods=["POST"])
@jwt_required()
def recalculate_salary_period(id):
    """
    Recalculate weekly budget after fixed bills change.
    Only affects remaining weeks - preserves spending history.
    Returns updated salary period with new weekly budget amounts.
    """
    try:
        current_user_id = int(get_jwt_identity())
        today = datetime.now().date()

        salary_period = SalaryPeriod.query.filter_by(
            id=id, user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({"error": "Salary period not found"}), 404

        # Calculate new fixed bills total from active recurring expenses
        fixed_bills = (
            RecurringExpense.active()
            .filter_by(user_id=current_user_id, is_active=True, is_fixed_bill=True)
            .all()
        )
        new_fixed_bills_total = sum(bill.amount for bill in fixed_bills)

        # Get number of sub-periods from salary period
        num_sub_periods = salary_period.num_sub_periods or 4

        # Calculate new budget values
        total_budget = (
            salary_period.initial_debit_balance
            + salary_period.credit_budget_allowance
            - new_fixed_bills_total
        )
        remaining_amount = total_budget
        new_weekly_budget = remaining_amount // num_sub_periods

        # Calculate debit vs credit portions
        debit_after_bills = salary_period.initial_debit_balance - new_fixed_bills_total
        if debit_after_bills >= new_weekly_budget * num_sub_periods:
            new_weekly_debit_budget = new_weekly_budget
            new_weekly_credit_budget = 0
        else:
            new_weekly_debit_budget = max(0, debit_after_bills // num_sub_periods)
            new_weekly_credit_budget = new_weekly_budget - new_weekly_debit_budget

        # Store old values for response
        old_weekly_budget = salary_period.weekly_budget
        old_fixed_bills_total = salary_period.fixed_bills_total

        # Update salary period
        salary_period.fixed_bills_total = new_fixed_bills_total
        salary_period.total_budget_amount = total_budget
        salary_period.remaining_amount = remaining_amount
        salary_period.weekly_budget = new_weekly_budget
        salary_period.weekly_debit_budget = new_weekly_debit_budget
        salary_period.weekly_credit_budget = new_weekly_credit_budget

        # Update remaining budget periods (weeks that haven't ended yet)
        updated_weeks = 0
        for budget_period in salary_period.budget_periods:
            if budget_period.end_date >= today:
                budget_period.budget_amount = new_weekly_budget
                updated_weeks += 1

        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Budget recalculated successfully",
                    "salary_period_id": salary_period.id,
                    "old_values": {
                        "weekly_budget": old_weekly_budget,
                        "fixed_bills_total": old_fixed_bills_total,
                    },
                    "new_values": {
                        "weekly_budget": new_weekly_budget,
                        "fixed_bills_total": new_fixed_bills_total,
                        "weekly_debit_budget": new_weekly_debit_budget,
                        "weekly_credit_budget": new_weekly_credit_budget,
                    },
                    "weeks_updated": updated_weeks,
                    "fixed_bills": [
                        {"id": bill.id, "name": bill.name, "amount": bill.amount}
                        for bill in fixed_bills
                    ],
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"Database error recalculating salary period {id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to recalculate salary period"}), 500


@salary_periods_bp.route("/<int:id>/budget-impact", methods=["GET"])
@jwt_required()
def get_budget_impact(id):
    """
    Calculate the budget impact if fixed bills were recalculated now.
    Does not modify anything - just returns the projected impact.
    """
    try:
        current_user_id = int(get_jwt_identity())

        salary_period = SalaryPeriod.query.filter_by(
            id=id, user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({"error": "Salary period not found"}), 404

        # Calculate current fixed bills total
        fixed_bills = (
            RecurringExpense.active()
            .filter_by(user_id=current_user_id, is_active=True, is_fixed_bill=True)
            .all()
        )
        projected_fixed_bills_total = sum(bill.amount for bill in fixed_bills)

        # Calculate projected budget values
        projected_total_budget = (
            salary_period.initial_debit_balance
            + salary_period.credit_budget_allowance
            - projected_fixed_bills_total
        )
        projected_weekly_budget = projected_total_budget // 4

        # Calculate difference
        fixed_bills_difference = (
            projected_fixed_bills_total - salary_period.fixed_bills_total
        )
        weekly_budget_difference = projected_weekly_budget - salary_period.weekly_budget

        # Determine if recalculation is needed
        needs_recalculation = fixed_bills_difference != 0

        return (
            jsonify(
                {
                    "salary_period_id": salary_period.id,
                    "needs_recalculation": needs_recalculation,
                    "current": {
                        "fixed_bills_total": salary_period.fixed_bills_total,
                        "weekly_budget": salary_period.weekly_budget,
                    },
                    "projected": {
                        "fixed_bills_total": projected_fixed_bills_total,
                        "weekly_budget": projected_weekly_budget,
                    },
                    "difference": {
                        "fixed_bills_total": fixed_bills_difference,
                        "weekly_budget": weekly_budget_difference,
                    },
                    "fixed_bills": [
                        {"id": bill.id, "name": bill.name, "amount": bill.amount}
                        for bill in fixed_bills
                    ],
                }
            ),
            200,
        )

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error calculating budget impact for period {id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to calculate budget impact"}), 500


@salary_periods_bp.route("/<int:id>", methods=["PATCH"])
@jwt_required()
def update_salary_period_partial(id):
    """Partially update salary period (e.g., deactivate it)"""
    try:
        current_user_id = int(get_jwt_identity())

        salary_period = SalaryPeriod.query.filter_by(
            id=id, user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({"error": "Salary period not found"}), 404

        data = request.get_json()

        if "is_active" in data:
            salary_period.is_active = data["is_active"]

        db.session.commit()

        return jsonify({"message": "Salary period updated successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"Database error updating salary period {id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to update salary period"}), 500


@salary_periods_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_salary_period(id):
    """Delete a salary period and all its weekly budget periods"""
    try:
        current_user_id = int(get_jwt_identity())

        salary_period = SalaryPeriod.query.filter_by(
            id=id, user_id=current_user_id
        ).first()

        if not salary_period:
            return jsonify({"error": "Salary period not found"}), 404

        # Check if any of the weekly budget periods have transactions
        # Use date ranges instead of budget_period_id
        has_transactions = False
        for budget_period in salary_period.budget_periods:
            expense_count = (
                Expense.active()
                .filter(
                    Expense.user_id == current_user_id,
                    Expense.date >= budget_period.start_date,
                    Expense.date <= budget_period.end_date,
                )
                .count()
            )
            income_count = (
                Income.active()
                .filter(
                    Income.user_id == current_user_id,
                    Income.actual_date >= budget_period.start_date,
                    Income.actual_date <= budget_period.end_date,
                )
                .count()
            )
            if expense_count > 0 or income_count > 0:
                has_transactions = True
                break

        if has_transactions:
            return (
                jsonify(
                    {
                        "error": "Cannot delete salary period that contains transactions. Please delete all expenses and income first."
                    }
                ),
                400,
            )

        # Delete all weekly budget periods (cascade should handle this, but being explicit)
        for budget_period in salary_period.budget_periods:
            db.session.delete(budget_period)

        # Delete the salary period
        db.session.delete(salary_period)
        db.session.commit()

        return jsonify({"message": "Salary period deleted successfully"}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(
            f"Database error deleting salary period {id}: {e}",
            exc_info=True,
        )
        return jsonify({"error": "Failed to delete salary period"}), 500

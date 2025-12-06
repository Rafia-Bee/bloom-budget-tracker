"""
Bloom - Salary Periods Routes

Endpoints for managing salary periods and weekly budgeting.
Handles salary period creation, weekly budget tracking, and leftover allocation.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import (
    db,
    SalaryPeriod,
    BudgetPeriod,
    RecurringExpense,
    Expense,
    Income,
)
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, or_, func

salary_periods_bp = Blueprint("salary_periods", __name__)


@salary_periods_bp.route("", methods=["GET"])
@jwt_required()
def get_salary_periods():
    """Get all salary periods for the current user"""
    try:
        current_user_id = int(get_jwt_identity())
        active_only = request.args.get(
            "active_only", "false").lower() == "true"

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
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@salary_periods_bp.route("/current", methods=["GET"])
@jwt_required()
def get_current_salary_period():
    """Get the currently active salary period with current week info"""
    try:
        current_user_id = int(get_jwt_identity())
        today = datetime.now().date()

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

        # Get all weeks with their spending and carryover
        all_weeks = (
            BudgetPeriod.query.filter_by(salary_period_id=salary_period.id)
            .order_by(BudgetPeriod.week_number)
            .all()
        )

        weeks_data = []
        cumulative_carryover = 0  # Track carryover from previous weeks

        for week in all_weeks:
            # Use date range instead of budget_period_id
            week_expenses = (
                db.session.query(func.sum(Expense.amount))
                .filter(
                    and_(
                        Expense.user_id == current_user_id,
                        Expense.date >= week.start_date,
                        Expense.date <= week.end_date,
                        Expense.is_fixed_bill == False,
                    )
                )
                .scalar()
                or 0
            )

            # Add carryover from previous weeks to this week's budget
            adjusted_budget = week.budget_amount + cumulative_carryover
            remaining = adjusted_budget - week_expenses

            weeks_data.append(
                {
                    "id": week.id,
                    "week_number": week.week_number,
                    "budget_amount": week.budget_amount,  # Original budget
                    "adjusted_budget": adjusted_budget,  # Budget + carryover
                    "carryover": cumulative_carryover,  # Carryover from previous weeks
                    "spent": week_expenses,
                    "remaining": remaining,
                    "start_date": week.start_date.isoformat(),
                    "end_date": week.end_date.isoformat(),
                }
            )

            # Update cumulative carryover for next week (if week is in the past)
            week_end = week.end_date
            if week_end < today:
                cumulative_carryover = remaining

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
                        "start_date": salary_period.start_date.isoformat(),
                        "end_date": salary_period.end_date.isoformat(),
                        "weeks": weeks_data,
                    },
                    "current_week": {
                        "id": current_week.id if current_week else None,
                        "week_number": current_week.week_number
                        if current_week
                        else None,
                        "budget_amount": current_week.budget_amount
                        if current_week
                        else None,
                        "spent": week_spent,
                        "remaining": (current_week.budget_amount - week_spent)
                        if current_week
                        else 0,
                        "start_date": current_week.start_date.isoformat()
                        if current_week
                        else None,
                        "end_date": current_week.end_date.isoformat()
                        if current_week
                        else None,
                    },
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

        # Validate credit allowance doesn't exceed available credit
        if credit_allowance > credit_balance:
            return (
                jsonify(
                    {"error": "Credit allowance cannot exceed available credit"}),
                400,
            )

        # Auto-detect fixed bills from recurring expenses
        fixed_bills = RecurringExpense.query.filter_by(
            user_id=current_user_id, is_active=True, is_fixed_bill=True
        ).all()

        # Allow manual adjustments to fixed bills
        fixed_bill_adjustments = data.get("fixed_bills", [])

        # Calculate total - use adjustments if provided, otherwise use auto-detected
        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill["amount"]
                                    for bill in fixed_bill_adjustments)
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

        # Calculate budget: debit + credit allowance - fixed bills
        total_budget = debit_balance + credit_allowance - fixed_bills_total
        remaining_amount = total_budget
        weekly_budget = remaining_amount // 4

        # Calculate debit vs credit portions of weekly budget
        debit_after_bills = debit_balance - fixed_bills_total
        if debit_after_bills >= weekly_budget * 4:
            # All budget comes from debit
            weekly_debit_budget = weekly_budget
            weekly_credit_budget = 0
        else:
            # Split between debit and credit
            weekly_debit_budget = max(0, debit_after_bills // 4)
            weekly_credit_budget = weekly_budget - weekly_debit_budget

        # Calculate end date (day before next salary, assuming monthly)
        end_date = start_date + relativedelta(months=1) - timedelta(days=1)

        # Calculate 4 week dates
        weeks = []
        current_start = start_date
        for week_num in range(1, 5):
            # Calculate week duration (7 days, except last week takes remaining days)
            if week_num < 4:
                week_end = current_start + timedelta(days=6)
            else:
                week_end = end_date

            weeks.append(
                {
                    "week_number": week_num,
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@salary_periods_bp.route("", methods=["POST"])
@jwt_required()
def create_salary_period():
    """Create a new salary period with 4 weekly budget periods"""
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

        # Validate credit allowance
        if credit_allowance > credit_balance:
            return (
                jsonify(
                    {"error": "Credit allowance cannot exceed available credit"}),
                400,
            )

        # Get fixed bills (either auto-detected or manually adjusted)
        fixed_bill_adjustments = data.get("fixed_bills", [])

        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill["amount"]
                                    for bill in fixed_bill_adjustments)
        else:
            # Auto-detect from recurring expenses
            fixed_bills = RecurringExpense.query.filter_by(
                user_id=current_user_id, is_active=True, is_fixed_bill=True
            ).all()
            fixed_bills_total = sum(bill.amount for bill in fixed_bills)

        # Calculate budget: debit + credit allowance - fixed bills
        total_budget = debit_balance + credit_allowance - fixed_bills_total
        remaining_amount = total_budget
        weekly_budget = remaining_amount // 4

        # Calculate debit vs credit portions of weekly budget
        debit_after_bills = debit_balance - fixed_bills_total
        if debit_after_bills >= weekly_budget * 4:
            weekly_debit_budget = weekly_budget
            weekly_credit_budget = 0
        else:
            weekly_debit_budget = max(0, debit_after_bills // 4)
            weekly_credit_budget = weekly_budget - weekly_debit_budget

        end_date = start_date + relativedelta(months=1) - timedelta(days=1)

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

        # Deactivate any existing active salary periods
        SalaryPeriod.query.filter_by(user_id=current_user_id, is_active=True).update(
            {"is_active": False}
        )

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
            is_active=True,
        )

        db.session.add(salary_period)
        db.session.flush()  # Get salary_period.id

        # Create 4 weekly budget periods
        current_start = start_date
        for week_num in range(1, 5):
            if week_num < 4:
                week_end = current_start + timedelta(days=6)
            else:
                week_end = end_date

            budget_period = BudgetPeriod(
                user_id=current_user_id,
                salary_period_id=salary_period.id,
                week_number=week_num,
                budget_amount=weekly_budget,
                start_date=current_start,
                end_date=week_end,
                period_type="weekly",
            )

            db.session.add(budget_period)
            current_start = week_end + timedelta(days=1)

        # Create initial income entry for the debit balance
        # This makes the dashboard debit/credit cards show correct available amounts
        if debit_balance > 0:
            initial_income = Income(
                user_id=current_user_id,
                type="Initial Balance",
                amount=debit_balance,
                scheduled_date=start_date,
                actual_date=start_date,
            )
            db.session.add(initial_income)

        # Create pre-existing credit debt expense (if any)
        pre_existing_debt = credit_limit - credit_balance
        if pre_existing_debt > 0:
            debt_expense = Expense(
                user_id=current_user_id,
                name="Pre-existing Credit Card Debt",
                amount=pre_existing_debt,
                category="Debt",
                subcategory="Credit Card",
                payment_method="Credit card",
                # Date it before the period starts
                date=start_date - timedelta(days=1),
                is_fixed_bill=False,
                notes="Existing credit card balance at budget period start",
            )
            db.session.add(debt_expense)

        db.session.commit()

        return (
            jsonify(
                {
                    "id": salary_period.id,
                    "message": "Salary period created successfully with 4 weekly budgets",
                }
            ),
            201,
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


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

        # Calculate carryover from previous weeks
        cumulative_carryover = 0
        previous_weeks = (
            BudgetPeriod.query.filter(
                and_(
                    BudgetPeriod.salary_period_id == salary_period.id,
                    BudgetPeriod.week_number < week_number,
                )
            )
            .order_by(BudgetPeriod.week_number)
            .all()
        )

        for prev_week in previous_weeks:
            # Use date range instead of budget_period_id
            prev_spent = (
                db.session.query(func.sum(Expense.amount))
                .filter(
                    and_(
                        Expense.user_id == current_user_id,
                        Expense.date >= prev_week.start_date,
                        Expense.date <= prev_week.end_date,
                        Expense.is_fixed_bill == False,
                    )
                )
                .scalar()
                or 0
            )

            # Add carryover from previous weeks
            prev_adjusted_budget = prev_week.budget_amount + cumulative_carryover
            prev_remaining = prev_adjusted_budget - prev_spent

            # Only carry over if week is in the past
            if prev_week.end_date < today:
                cumulative_carryover = prev_remaining

        # Calculate spending for this week (excluding fixed bills)
        # Use date range instead of budget_period_id
        week_spent = (
            db.session.query(func.sum(Expense.amount))
            .filter(
                and_(
                    Expense.user_id == current_user_id,
                    Expense.date >= budget_period.start_date,
                    Expense.date <= budget_period.end_date,
                    Expense.is_fixed_bill == False,
                )
            )
            .scalar()
            or 0
        )

        # Calculate adjusted budget and leftover
        adjusted_budget = budget_period.budget_amount + cumulative_carryover
        leftover = adjusted_budget - week_spent

        # Get user's active debts for allocation suggestions
        from backend.models.database import Debt

        active_debts = Debt.query.filter_by(
            user_id=current_user_id, archived=False
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
                        ]
                    },
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

        # Validate credit allowance
        if credit_allowance > credit_balance:
            return (
                jsonify(
                    {"error": "Credit allowance cannot exceed available credit"}),
                400,
            )

        # Get fixed bills
        fixed_bill_adjustments = data.get("fixed_bills", [])

        if fixed_bill_adjustments:
            fixed_bills_total = sum(bill["amount"]
                                    for bill in fixed_bill_adjustments)
        else:
            # Auto-detect from recurring expenses
            fixed_bills = RecurringExpense.query.filter_by(
                user_id=current_user_id, is_active=True, is_fixed_bill=True
            ).all()
            fixed_bills_total = sum(bill.amount for bill in fixed_bills)

        # Calculate budget: debit + credit allowance - fixed bills
        total_budget = debit_balance + credit_allowance - fixed_bills_total
        remaining_amount = total_budget
        weekly_budget = remaining_amount // 4

        # Calculate debit vs credit portions of weekly budget
        debit_after_bills = debit_balance - fixed_bills_total
        if debit_after_bills >= weekly_budget * 4:
            weekly_debit_budget = weekly_budget
            weekly_credit_budget = 0
        else:
            weekly_debit_budget = max(0, debit_after_bills // 4)
            weekly_credit_budget = weekly_budget - weekly_debit_budget

        end_date = start_date + relativedelta(months=1) - timedelta(days=1)

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

        # Update weekly budget periods
        current_start = start_date
        for week_num in range(1, 5):
            if week_num < 4:
                week_end = current_start + timedelta(days=6)
            else:
                week_end = end_date

            budget_period = BudgetPeriod.query.filter_by(
                salary_period_id=salary_period.id, week_number=week_num
            ).first()

            if budget_period:
                budget_period.budget_amount = weekly_budget
                budget_period.start_date = current_start
                budget_period.end_date = week_end
            else:
                # Create if doesn't exist
                budget_period = BudgetPeriod(
                    user_id=current_user_id,
                    salary_period_id=salary_period.id,
                    week_number=week_num,
                    budget_amount=weekly_budget,
                    start_date=current_start,
                    end_date=week_end,
                    period_type="weekly",
                )
                db.session.add(budget_period)

            current_start = week_end + timedelta(days=1)

        # Update Initial Balance income entry if it exists
        # Search for ANY Initial Balance entry for this user (not just by date)
        # to avoid creating duplicates when start_date changes
        initial_income = (
            Income.query.filter_by(
                user_id=current_user_id,
                type="Initial Balance",
            )
            .order_by(Income.id.desc())
            .first()
        )

        if initial_income:
            initial_income.amount = debit_balance
            initial_income.actual_date = start_date
            initial_income.scheduled_date = start_date
        elif debit_balance > 0:
            # Create if doesn't exist
            initial_income = Income(
                user_id=current_user_id,
                type="Initial Balance",
                amount=debit_balance,
                scheduled_date=start_date,
                actual_date=start_date,
            )
            db.session.add(initial_income)

        # Update Pre-existing Credit Card Debt expense if credit changed
        pre_existing_debt = credit_limit - credit_balance
        debt_expense = (
            Expense.query.filter_by(
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
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


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
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


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
            expense_count = Expense.query.filter(
                Expense.user_id == current_user_id,
                Expense.date >= budget_period.start_date,
                Expense.date <= budget_period.end_date,
            ).count()
            income_count = Income.query.filter(
                Income.user_id == current_user_id,
                Income.actual_date >= budget_period.start_date,
                Income.actual_date <= budget_period.end_date,
            ).count()
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
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

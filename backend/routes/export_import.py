"""
Bloom - Export/Import Routes

Handles exporting and importing user data (debts, recurring expenses, goals).
Includes weekly budget breakdown generation for enhanced financial transparency.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import (
    db,
    Debt,
    RecurringExpense,
    SalaryPeriod,
    BudgetPeriod,
    Income,
    Expense,
    ExpenseNameMapping,
    Goal,
    Subcategory,
)
from datetime import datetime, timedelta
from sqlalchemy import and_
from sqlalchemy.exc import SQLAlchemyError
import re

export_import_bp = Blueprint("export_import", __name__, url_prefix="/data")


def generate_weekly_budget_breakdown(user_id):
    """
    Generate weekly budget breakdown for all salary periods.
    Shows carryover logic, fixed vs flexible spending, and expense details.
    Reuses carryover calculation logic from GET /salary-periods/current endpoint.
    """
    salary_periods = (
        SalaryPeriod.query.filter_by(user_id=user_id, is_active=True)
        .order_by(SalaryPeriod.start_date.desc())
        .all()
    )

    breakdown = []

    for salary_period in salary_periods:
        # Get all weeks for this salary period
        weeks = (
            BudgetPeriod.query.filter_by(salary_period_id=salary_period.id)
            .order_by(BudgetPeriod.week_number)
            .all()
        )

        weeks_data = []
        cumulative_carryover = 0

        # Calculate spending and carryover for each week
        for week in weeks:
            # Get all expenses for this week using date range
            week_expenses = Expense.query.filter(
                and_(
                    Expense.user_id == user_id,
                    Expense.date >= week.start_date,
                    Expense.date <= week.end_date,
                )
            ).all()

            # Separate fixed and flexible expenses
            flexible_expenses = [e for e in week_expenses if not e.is_fixed_bill]
            fixed_expenses = [e for e in week_expenses if e.is_fixed_bill]

            flexible_total = sum(e.amount for e in flexible_expenses)
            fixed_total = sum(e.amount for e in fixed_expenses)

            # Calculate adjusted budget with carryover
            adjusted_budget = week.budget_amount + cumulative_carryover
            remaining = adjusted_budget - flexible_total

            # Build expense breakdown
            expense_breakdown = {
                "flexible": [
                    {
                        "name": e.name,
                        "amount": e.amount,
                        "category": e.category,
                        "subcategory": e.subcategory,
                        "payment_method": e.payment_method,
                        "date": e.date.isoformat(),
                    }
                    for e in flexible_expenses
                ],
                "fixed": [
                    {
                        "name": e.name,
                        "amount": e.amount,
                        "category": e.category,
                        "subcategory": e.subcategory,
                        "payment_method": e.payment_method,
                        "date": e.date.isoformat(),
                    }
                    for e in fixed_expenses
                ],
            }

            week_data = {
                "week_number": week.week_number,
                "date_range": f"{week.start_date.isoformat()} to {week.end_date.isoformat()}",
                "base_budget": week.budget_amount,
                "carryover": cumulative_carryover,
                "adjusted_budget": adjusted_budget,
                "spent": {
                    "flexible_expenses": flexible_total,
                    "fixed_expenses": fixed_total,
                    "total": flexible_total + fixed_total,
                },
                "remaining": remaining,
                "expense_breakdown": expense_breakdown,
            }

            weeks_data.append(week_data)

            # Update cumulative carryover for next week
            cumulative_carryover = remaining

        # Calculate period summary
        summary = {
            "total_budget_allocated": sum(w["base_budget"] for w in weeks_data),
            "total_flexible_spent": sum(
                w["spent"]["flexible_expenses"] for w in weeks_data
            ),
            "total_fixed_spent": sum(w["spent"]["fixed_expenses"] for w in weeks_data),
            "final_remaining": weeks_data[-1]["remaining"] if weeks_data else 0,
        }

        breakdown.append(
            {
                "salary_period_id": salary_period.id,
                "salary_period_dates": f"{salary_period.start_date.isoformat()} to {salary_period.end_date.isoformat()}",
                "weeks": weeks_data,
                "summary": summary,
            }
        )

    return breakdown


@export_import_bp.route("/export", methods=["POST"])
@jwt_required()
def export_data():
    """Export selected data types as JSON."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        export_types = data.get("types", [])
        if not export_types:
            return jsonify({"error": "No data types selected for export"}), 400

        export_data = {
            "version": "2.0",
            "exported_at": datetime.now().isoformat(),
            "data": {},
        }

        # Export Debts
        if "debts" in export_types:
            debts = Debt.query.filter_by(user_id=current_user_id, archived=False).all()
            export_data["data"]["debts"] = [
                {
                    "name": d.name,
                    "original_amount": d.original_amount,
                    "current_balance": d.current_balance,
                    "monthly_payment": d.monthly_payment,
                    "created_at": d.created_at.isoformat(),
                }
                for d in debts
            ]

        # Export Recurring Expenses
        if "recurring_expenses" in export_types:
            recurring = RecurringExpense.query.filter_by(
                user_id=current_user_id, is_active=True
            ).all()
            export_data["data"]["recurring_expenses"] = [
                {
                    "name": r.name,
                    "amount": r.amount,
                    "category": r.category,
                    "subcategory": r.subcategory,
                    "payment_method": r.payment_method,
                    "frequency": r.frequency,
                    "frequency_value": r.frequency_value,
                    "day_of_month": r.day_of_month,
                    "day_of_week": r.day_of_week,
                    "start_date": r.start_date.isoformat(),
                    "end_date": r.end_date.isoformat() if r.end_date else None,
                    "is_fixed_bill": r.is_fixed_bill,
                    "notes": r.notes,
                }
                for r in recurring
            ]

        # Export Salary Periods
        if "salary_periods" in export_types:
            salary_periods = (
                SalaryPeriod.query.filter_by(user_id=current_user_id)
                .order_by(SalaryPeriod.start_date)
                .all()
            )
            export_data["data"]["salary_periods"] = []

            for sp in salary_periods:
                period_data = {
                    "initial_debit_balance": sp.initial_debit_balance,
                    "initial_credit_balance": sp.initial_credit_balance,
                    "credit_limit": sp.credit_limit,
                    "credit_budget_allowance": sp.credit_budget_allowance,
                    "salary_amount": sp.salary_amount,
                    "total_budget_amount": sp.total_budget_amount,
                    "fixed_bills_total": sp.fixed_bills_total,
                    "remaining_amount": sp.remaining_amount,
                    "weekly_budget": sp.weekly_budget,
                    "weekly_debit_budget": sp.weekly_debit_budget,
                    "weekly_credit_budget": sp.weekly_credit_budget,
                    "start_date": sp.start_date.isoformat(),
                    "end_date": sp.end_date.isoformat(),
                }

                # Add weekly breakdown
                budget_periods = (
                    BudgetPeriod.query.filter_by(salary_period_id=sp.id)
                    .order_by(BudgetPeriod.week_number)
                    .all()
                )

                if budget_periods:
                    period_data["weekly_breakdown"] = []

                    for bp in budget_periods:
                        # Calculate actual spending for this week
                        week_expenses = Expense.query.filter(
                            Expense.user_id == current_user_id,
                            Expense.date >= bp.start_date,
                            Expense.date <= bp.end_date,
                        ).all()

                        debit_spent = sum(
                            e.amount
                            for e in week_expenses
                            if e.payment_method == "Debit card"
                        )
                        credit_spent = sum(
                            e.amount
                            for e in week_expenses
                            if e.payment_method == "Credit card"
                        )

                        # Credit card payments to debit
                        credit_payments = sum(
                            e.amount
                            for e in week_expenses
                            if e.category == "Debt Payments"
                            and e.subcategory == "Credit Card"
                            and e.payment_method == "Debit card"
                        )

                        week_data = {
                            "week_number": bp.week_number,
                            "start_date": bp.start_date.isoformat(),
                            "end_date": bp.end_date.isoformat(),
                            "budget_amount": bp.budget_amount,
                            "debit_spent": debit_spent,
                            "credit_spent": credit_spent,
                            "credit_payments": credit_payments,
                            "total_spent": debit_spent + credit_spent,
                            "remaining_budget": bp.budget_amount - debit_spent
                            if bp.budget_amount
                            else 0,
                        }

                        period_data["weekly_breakdown"].append(week_data)

                export_data["data"]["salary_periods"].append(period_data)

        # Export Expenses
        if "expenses" in export_types:
            expenses = Expense.query.filter_by(user_id=current_user_id).all()
            export_data["data"]["expenses"] = [
                {
                    "name": e.name,
                    "amount": e.amount,
                    "category": e.category,
                    "subcategory": e.subcategory,
                    "payment_method": e.payment_method,
                    "date": e.date.isoformat(),
                    "is_fixed_bill": e.is_fixed_bill,
                    "notes": e.notes,
                    "recurring_template_id": e.recurring_template_id,
                }
                for e in expenses
            ]

        # Export Income
        if "income" in export_types:
            incomes = Income.query.filter_by(user_id=current_user_id).all()
            export_data["data"]["income"] = [
                {
                    "type": i.type,
                    "amount": i.amount,
                    "scheduled_date": i.scheduled_date.isoformat(),
                    "actual_date": i.actual_date.isoformat() if i.actual_date else None,
                }
                for i in incomes
            ]

        # Export Goals
        if "goals" in export_types:
            goals = Goal.query.filter_by(user_id=current_user_id).all()
            export_data["data"]["goals"] = [
                {
                    "name": g.name,
                    "description": g.description,
                    "target_amount": g.target_amount,
                    "initial_amount": g.initial_amount,
                    "target_date": g.target_date.isoformat() if g.target_date else None,
                    "subcategory_name": g.subcategory_name,
                    "is_active": g.is_active,
                }
                for g in goals
            ]

        # Add Weekly Budget Breakdown if salary_periods are exported
        if "salary_periods" in export_types:
            export_data["data"][
                "weekly_budget_breakdown"
            ] = generate_weekly_budget_breakdown(current_user_id)

        return jsonify(export_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@export_import_bp.route("/import", methods=["POST"])
@jwt_required()
def import_data():
    """Import data from JSON file."""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or "data" not in data:
            return jsonify({"error": "Invalid import file format"}), 400

        imported_counts = {
            "debts": 0,
            "recurring_expenses": 0,
            "salary_periods": 0,
            "expenses": 0,
            "income": 0,
            "goals": 0,
        }
        skipped_counts = {
            "debts": 0,
            "recurring_expenses": 0,
            "salary_periods": 0,
            "expenses": 0,
            "income": 0,
            "goals": 0,
        }
        skipped_items = {
            "expenses": [],
            "income": [],
        }

        # Wrap entire import operation in a single transaction
        # This ensures all-or-nothing behavior for data integrity
        try:
            # Import Debts
            if "debts" in data["data"]:
                for debt_data in data["data"]["debts"]:
                    # Check for duplicate: same name and original_amount
                    existing_debt = Debt.query.filter_by(
                        user_id=current_user_id,
                        name=debt_data["name"],
                        original_amount=debt_data["original_amount"],
                        archived=False,
                    ).first()

                    if existing_debt:
                        skipped_counts["debts"] += 1
                        continue

                    debt = Debt(
                        user_id=current_user_id,
                        name=debt_data["name"],
                        original_amount=debt_data["original_amount"],
                        current_balance=debt_data["current_balance"],
                        monthly_payment=debt_data["monthly_payment"],
                        archived=False,
                    )
                    db.session.add(debt)
                    imported_counts["debts"] += 1

            # Import Recurring Expenses FIRST (before expenses, so we can link them)
            # Create a map to link imported expenses to new recurring template IDs
            # Maps: (name, amount, category) -> new RecurringExpense object
            recurring_template_map = {}

            if "recurring_expenses" in data["data"]:
                for idx, recurring_data in enumerate(
                    data["data"]["recurring_expenses"]
                ):
                    start_date = datetime.fromisoformat(
                        recurring_data["start_date"].replace("Z", "+00:00")
                    )
                    end_date = (
                        datetime.fromisoformat(
                            recurring_data["end_date"].replace("Z", "+00:00")
                        )
                        if recurring_data.get("end_date")
                        else None
                    )

                    # Check for duplicate: same name, amount, and category
                    existing_recurring = RecurringExpense.query.filter_by(
                        user_id=current_user_id,
                        name=recurring_data["name"],
                        amount=recurring_data["amount"],
                        category=recurring_data["category"],
                        is_active=True,
                    ).first()

                    if existing_recurring:
                        skipped_counts["recurring_expenses"] += 1
                        continue

                    # Calculate next_due_date intelligently
                    # Look through imported expenses to find the most recent one from this template
                    most_recent_expense_date = None
                    if "expenses" in data["data"]:
                        for exp_data in data["data"]["expenses"]:
                            # Match by name, amount, and category (since recurring_template_id won't match yet)
                            if (
                                exp_data["name"] == recurring_data["name"]
                                and exp_data["amount"] == recurring_data["amount"]
                                and exp_data["category"] == recurring_data["category"]
                                and exp_data.get("recurring_template_id") is not None
                            ):
                                exp_date = datetime.fromisoformat(
                                    exp_data["date"].replace("Z", "+00:00")
                                ).date()
                                if (
                                    most_recent_expense_date is None
                                    or exp_date > most_recent_expense_date
                                ):
                                    most_recent_expense_date = exp_date

                    # Calculate next due date based on frequency
                    if most_recent_expense_date:
                        # Start from the most recent expense and calculate next occurrence
                        next_due = most_recent_expense_date
                        if recurring_data["frequency"] == "monthly":
                            # Add one month
                            next_month = next_due.month + 1
                            next_year = next_due.year
                            if next_month > 12:
                                next_month = 1
                                next_year += 1
                            day = recurring_data.get("day_of_month", next_due.day)
                            try:
                                next_due = datetime(next_year, next_month, day).date()
                            except ValueError:
                                # Handle invalid day (e.g., Feb 30)
                                next_due = datetime(next_year, next_month, 28).date()
                        elif recurring_data["frequency"] == "weekly":
                            next_due = next_due + timedelta(days=7)
                        elif recurring_data["frequency"] == "biweekly":
                            next_due = next_due + timedelta(days=14)
                        elif recurring_data["frequency"] == "custom":
                            next_due = next_due + timedelta(
                                days=recurring_data.get("frequency_value", 1)
                            )
                    else:
                        # No expenses found, calculate from start_date
                        next_due = start_date.date()
                        today = datetime.now().date()

                        # If start date is in the past, calculate the next occurrence after today
                        if next_due < today:
                            if recurring_data["frequency"] == "monthly":
                                day_of_month = recurring_data.get(
                                    "day_of_month", start_date.day
                                )
                                # Find next occurrence of this day
                                if today.day < day_of_month:
                                    # This month
                                    try:
                                        next_due = datetime(
                                            today.year, today.month, day_of_month
                                        ).date()
                                    except ValueError:
                                        next_due = datetime(
                                            today.year, today.month, 28
                                        ).date()
                                else:
                                    # Next month
                                    next_month = today.month + 1
                                    next_year = today.year
                                    if next_month > 12:
                                        next_month = 1
                                        next_year += 1
                                    try:
                                        next_due = datetime(
                                            next_year, next_month, day_of_month
                                        ).date()
                                    except ValueError:
                                        next_due = datetime(
                                            next_year, next_month, 28
                                        ).date()
                            elif recurring_data["frequency"] == "weekly":
                                # Calculate next weekly occurrence
                                days_diff = (today - next_due).days
                                weeks_passed = days_diff // 7
                                next_due = next_due + timedelta(
                                    days=(weeks_passed + 1) * 7
                                )
                            elif recurring_data["frequency"] == "biweekly":
                                days_diff = (today - next_due).days
                                periods_passed = days_diff // 14
                                next_due = next_due + timedelta(
                                    days=(periods_passed + 1) * 14
                                )
                            elif recurring_data["frequency"] == "custom":
                                days_diff = (today - next_due).days
                                freq_value = recurring_data.get("frequency_value", 1)
                                periods_passed = days_diff // freq_value
                                next_due = next_due + timedelta(
                                    days=(periods_passed + 1) * freq_value
                                )

                    recurring = RecurringExpense(
                        user_id=current_user_id,
                        name=recurring_data["name"],
                        amount=recurring_data["amount"],
                        category=recurring_data["category"],
                        subcategory=recurring_data.get("subcategory", ""),
                        payment_method=recurring_data["payment_method"],
                        frequency=recurring_data["frequency"],
                        frequency_value=recurring_data.get("frequency_value", 1),
                        day_of_month=recurring_data.get("day_of_month"),
                        day_of_week=recurring_data.get("day_of_week"),
                        start_date=start_date,
                        end_date=end_date,
                        next_due_date=next_due,
                        is_active=True,
                        is_fixed_bill=recurring_data.get("is_fixed_bill", False),
                        notes=recurring_data.get("notes", ""),
                    )
                    db.session.add(recurring)
                    db.session.flush()  # Flush to get the ID assigned

                    # Store mapping for linking expenses later
                    template_key = (
                        recurring_data["name"],
                        recurring_data["amount"],
                        recurring_data["category"],
                    )
                    recurring_template_map[template_key] = recurring

                    imported_counts["recurring_expenses"] += 1

            # Import Salary Periods
            if "salary_periods" in data["data"]:
                for sp_data in data["data"]["salary_periods"]:
                    start_date = datetime.fromisoformat(
                        sp_data["start_date"].replace("Z", "+00:00")
                    ).date()
                    end_date = datetime.fromisoformat(
                        sp_data["end_date"].replace("Z", "+00:00")
                    ).date()

                    # Check for overlapping date ranges (not just exact match)
                    overlapping_period = SalaryPeriod.query.filter(
                        and_(
                            SalaryPeriod.user_id == current_user_id,
                            SalaryPeriod.start_date <= end_date,
                            SalaryPeriod.end_date >= start_date,
                        )
                    ).first()

                    if overlapping_period:
                        skipped_counts["salary_periods"] += 1
                        continue

                    salary_period = SalaryPeriod(
                        user_id=current_user_id,
                        initial_debit_balance=sp_data["initial_debit_balance"],
                        initial_credit_balance=sp_data["initial_credit_balance"],
                        credit_limit=sp_data["credit_limit"],
                        credit_budget_allowance=sp_data["credit_budget_allowance"],
                        salary_amount=sp_data.get("salary_amount"),
                        total_budget_amount=sp_data["total_budget_amount"],
                        fixed_bills_total=sp_data["fixed_bills_total"],
                        remaining_amount=sp_data["remaining_amount"],
                        weekly_budget=sp_data["weekly_budget"],
                        weekly_debit_budget=sp_data["weekly_debit_budget"],
                        weekly_credit_budget=sp_data["weekly_credit_budget"],
                        start_date=start_date,
                        end_date=end_date,
                        is_active=True,
                    )
                    db.session.add(salary_period)
                    db.session.flush()  # Get salary_period.id for creating weekly periods

                    # Create 4 weekly budget periods for this salary period
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
                            budget_amount=sp_data["weekly_budget"],
                            start_date=current_start,
                            end_date=week_end,
                            period_type="weekly",
                        )
                        db.session.add(budget_period)
                        current_start = week_end + timedelta(days=1)

                    # Create initial income entry for the debit balance
                    # This makes the dashboard debit/credit cards show correct available amounts
                    if sp_data["initial_debit_balance"] > 0:
                        initial_income = Income(
                            user_id=current_user_id,
                            type="Initial Balance",
                            amount=sp_data["initial_debit_balance"],
                            scheduled_date=start_date,
                            actual_date=start_date,
                        )
                        db.session.add(initial_income)

                    # Create pre-existing credit debt expense (if any)
                    pre_existing_debt = (
                        sp_data["credit_limit"] - sp_data["initial_credit_balance"]
                    )
                    if pre_existing_debt > 0:
                        debt_date = start_date - timedelta(days=1)
                        debt_expense = Expense(
                            user_id=current_user_id,
                            name="Pre-existing Credit Card Debt",
                            amount=pre_existing_debt,
                            category="Debt",
                            subcategory="Credit Card",
                            payment_method="Credit card",
                            # Date it before the period starts
                            date=debt_date,
                            is_fixed_bill=False,
                            notes="Existing credit card balance at budget period start",
                        )
                        db.session.add(debt_expense)

                    imported_counts["salary_periods"] += 1

            # Import Expenses
            if "expenses" in data["data"]:
                for exp_data in data["data"]["expenses"]:
                    expense_date = datetime.fromisoformat(
                        exp_data["date"].replace("Z", "+00:00")
                    ).date()

                    # Check for duplicate: same date, name, and amount
                    existing_expense = Expense.query.filter_by(
                        user_id=current_user_id,
                        name=exp_data["name"],
                        amount=exp_data["amount"],
                        date=expense_date,
                    ).first()

                    if existing_expense:
                        skipped_detail = f"{exp_data['name']} (€{exp_data['amount']/100:.2f} on {expense_date})"
                        print(
                            f"[IMPORT] SKIPPED EXPENSE: '{exp_data['name']}' €{exp_data['amount']/100:.2f} on {expense_date} (already exists with ID {existing_expense.id})"
                        )
                        skipped_items["expenses"].append(skipped_detail)
                        skipped_counts["expenses"] += 1
                        continue

                    # Link to new recurring template if this expense was generated from one
                    new_recurring_template_id = None
                    if exp_data.get("recurring_template_id") is not None:
                        # Try to find the new template by matching name, amount, and category
                        template_key = (
                            exp_data["name"],
                            exp_data["amount"],
                            exp_data["category"],
                        )
                        if template_key in recurring_template_map:
                            new_recurring_template_id = recurring_template_map[
                                template_key
                            ].id

                    expense = Expense(
                        user_id=current_user_id,
                        name=exp_data["name"],
                        amount=exp_data["amount"],
                        category=exp_data["category"],
                        subcategory=exp_data["subcategory"],
                        payment_method=exp_data["payment_method"],
                        date=expense_date,
                        is_fixed_bill=exp_data.get("is_fixed_bill", False),
                        notes=exp_data.get("notes", ""),
                        recurring_template_id=new_recurring_template_id,
                    )
                    db.session.add(expense)
                    imported_counts["expenses"] += 1

            # Import Income
            if "income" in data["data"]:
                for income_data in data["data"]["income"]:
                    scheduled_date = datetime.fromisoformat(
                        income_data["scheduled_date"].replace("Z", "+00:00")
                    ).date()
                    actual_date = None
                    if income_data.get("actual_date"):
                        actual_date = datetime.fromisoformat(
                            income_data["actual_date"].replace("Z", "+00:00")
                        ).date()

                    # Check for duplicate: same scheduled_date, type, and amount
                    existing_income = Income.query.filter_by(
                        user_id=current_user_id,
                        type=income_data["type"],
                        amount=income_data["amount"],
                        scheduled_date=scheduled_date,
                    ).first()

                    if existing_income:
                        skipped_detail = f"{income_data['type']} (€{income_data['amount']/100:.2f} on {scheduled_date})"
                        print(
                            f"[IMPORT] SKIPPED INCOME: '{income_data['type']}' €{income_data['amount']/100:.2f} scheduled {scheduled_date} (already exists with ID {existing_income.id})"
                        )
                        skipped_items["income"].append(skipped_detail)
                        skipped_counts["income"] += 1
                        continue

                    income = Income(
                        user_id=current_user_id,
                        type=income_data["type"],
                        amount=income_data["amount"],
                        scheduled_date=scheduled_date,
                        actual_date=actual_date,
                    )
                    db.session.add(income)
                    imported_counts["income"] += 1

            # Import Goals
            if "goals" in data["data"]:
                for goal_data in data["data"]["goals"]:
                    # Check for duplicate by name
                    existing_goal = Goal.query.filter_by(
                        user_id=current_user_id,
                        name=goal_data["name"],
                    ).first()

                    if existing_goal:
                        skipped_counts["goals"] += 1
                        continue

                    # Ensure subcategory exists for goal transactions
                    subcategory_name = goal_data.get("subcategory_name")
                    if subcategory_name:
                        existing_subcat = Subcategory.query.filter_by(
                            user_id=current_user_id,
                            name=subcategory_name,
                            category="Savings Goals",
                        ).first()
                        if not existing_subcat:
                            # Create the subcategory
                            new_subcat = Subcategory(
                                user_id=current_user_id,
                                name=subcategory_name,
                                category="Savings Goals",
                                is_system=False,
                            )
                            db.session.add(new_subcat)

                    target_date = None
                    if goal_data.get("target_date"):
                        target_date = datetime.fromisoformat(
                            goal_data["target_date"]
                        ).date()

                    goal = Goal(
                        user_id=current_user_id,
                        name=goal_data["name"],
                        description=goal_data.get("description"),
                        target_amount=goal_data["target_amount"],
                        initial_amount=goal_data.get("initial_amount", 0),
                        target_date=target_date,
                        subcategory_name=subcategory_name,
                        is_active=goal_data.get("is_active", True),
                    )
                    db.session.add(goal)
                    imported_counts["goals"] += 1

            # Commit all changes together for atomicity
            db.session.commit()

        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(
                f"Failed to import data for user {current_user_id}: {str(e)}",
                exc_info=True,
            )
            return (
                jsonify({"error": "Failed to import data. Please try again."}),
                500,
            )

        # Build response message
        message_parts = []
        if any(count > 0 for count in imported_counts.values()):
            message_parts.append("Data imported successfully")

        skipped_total = sum(skipped_counts.values())
        if skipped_total > 0:
            skipped_details = []
            if skipped_counts["debts"] > 0:
                skipped_details.append(f"{skipped_counts['debts']} debt(s)")
            if skipped_counts["recurring_expenses"] > 0:
                skipped_details.append(
                    f"{skipped_counts['recurring_expenses']} recurring expense(s)"
                )
            if skipped_counts["salary_periods"] > 0:
                skipped_details.append(
                    f"{skipped_counts['salary_periods']} salary period(s)"
                )
            if skipped_counts["expenses"] > 0:
                skipped_details.append(f"{skipped_counts['expenses']} expense(s)")
            if skipped_counts["income"] > 0:
                skipped_details.append(f"{skipped_counts['income']} income(s)")
            if skipped_counts["goals"] > 0:
                skipped_details.append(f"{skipped_counts['goals']} goal(s)")
            message_parts.append(
                f"Skipped {', '.join(skipped_details)} (already exists)"
            )

            # Add details of what was skipped
            if skipped_items["expenses"]:
                message_parts.append(
                    f"Skipped expenses: {', '.join(skipped_items['expenses'])}"
                )
            if skipped_items["income"]:
                message_parts.append(
                    f"Skipped income: {', '.join(skipped_items['income'])}"
                )

        return (
            jsonify(
                {
                    "message": ". ".join(message_parts)
                    if message_parts
                    else "No new data to import",
                    "imported": imported_counts,
                    "skipped": skipped_counts,
                    "skipped_items": skipped_items,
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(
            f"Unexpected error importing data for user {current_user_id}: {str(e)}",
            exc_info=True,
        )
        return jsonify({"error": f"Import failed: {str(e)}"}), 500


def parse_bank_transactions(
    transactions_text, payment_method, current_user_id, check_duplicates=True
):
    """
    Helper function to parse bank transaction text and return parsed data.

    Args:
        transactions_text: Raw transaction data as string
        payment_method: Payment method ('Debit card' or 'Credit card')
        current_user_id: User ID for duplicate checking
        check_duplicates: Whether to check for existing duplicates

    Returns:
        dict with parsed_transactions, errors, and skipped_count
    """
    # Parse the transaction text (split by newlines)
    lines = [
        line.strip() for line in transactions_text.strip().split("\n") if line.strip()
    ]

    if len(lines) < 2:
        raise ValueError(
            "No transaction data found. Please paste at least one transaction."
        )

    # Skip header line
    header = lines[0].lower()
    if (
        "transaction date" not in header
        or "amount" not in header
        or "name" not in header
    ):
        raise ValueError(
            "Invalid format. Expected columns: Transaction Date, Amount, Name"
        )

    transaction_lines = lines[1:]

    parsed_transactions = []
    errors = []
    skipped_count = 0

    for line_num, line in enumerate(transaction_lines, start=2):
        try:
            # Split by tab or multiple spaces
            parts = [p.strip() for p in line.split("\t") if p.strip()]
            if len(parts) < 3:
                # Try splitting by multiple spaces instead
                parts = [p.strip() for p in re.split(r"\s{2,}", line) if p.strip()]

            if len(parts) < 3:
                errors.append(f"Line {line_num}: Invalid format (expected 3 columns)")
                skipped_count += 1
                continue

            date_str, amount_str, merchant_name = parts[0], parts[1], parts[2]

            # Parse date (YYYY/MM/DD format)
            try:
                date_obj = datetime.strptime(date_str, "%Y/%m/%d").date()
            except ValueError:
                try:
                    # Try YYYY-MM-DD format
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    errors.append(
                        f"Line {line_num}: Invalid date format '{date_str}' (expected YYYY/MM/DD)"
                    )
                    skipped_count += 1
                    continue

            # Parse amount (handle comma decimal separator and negative sign)
            try:
                amount_str = amount_str.replace(",", ".")
                amount_float = float(amount_str)
                amount_cents = abs(int(amount_float * 100))

                # Skip zero or positive amounts (we only import expenses)
                if amount_float >= 0:
                    errors.append(
                        f"Line {line_num}: Skipped income transaction (amount: {amount_float})"
                    )
                    skipped_count += 1
                    continue
            except ValueError:
                errors.append(f"Line {line_num}: Invalid amount '{amount_str}'")
                skipped_count += 1
                continue

            # Clean merchant name
            merchant_name = merchant_name.strip()

            # Try to find matching expense name mapping for smart categorization
            mapping = ExpenseNameMapping.query.filter(
                ExpenseNameMapping.expense_name.ilike(f"%{merchant_name.lower()}%")
            ).first()

            if mapping:
                category = "Flexible Expenses"  # Most mapped items are flexible
                subcategory = mapping.subcategory
            else:
                # Default categorization
                merchant_lower = merchant_name.lower()

                # Smart categorization based on merchant name patterns
                if any(
                    keyword in merchant_lower for keyword in ["uber", "bolt", "taxi"]
                ):
                    category = "Flexible Expenses"
                    subcategory = "Transportation"
                elif any(
                    keyword in merchant_lower
                    for keyword in ["wolt", "foodora", "uber eats"]
                ):
                    category = "Flexible Expenses"
                    subcategory = "Food"
                elif any(
                    keyword in merchant_lower
                    for keyword in ["netflix", "spotify", "disney", "hbo"]
                ):
                    category = "Fixed Expenses"
                    subcategory = "Subscriptions"
                elif any(
                    keyword in merchant_lower
                    for keyword in ["paypal", "wise", "revolut", "nordea"]
                ):
                    category = "Flexible Expenses"
                    subcategory = "Shopping"
                else:
                    # Default to flexible expenses - shopping
                    category = "Flexible Expenses"
                    subcategory = "Shopping"

            # Check for duplicate (same date, amount, and merchant name)
            is_duplicate = False
            if check_duplicates:
                existing = Expense.query.filter_by(
                    user_id=current_user_id,
                    name=merchant_name,
                    amount=amount_cents,
                    date=date_obj,
                ).first()

                if existing:
                    is_duplicate = True
                    skipped_count += 1
                    continue

            # Find the budget period for this date
            budget_period = BudgetPeriod.query.filter(
                BudgetPeriod.user_id == current_user_id,
                BudgetPeriod.start_date <= date_obj,
                BudgetPeriod.end_date >= date_obj,
            ).first()

            parsed_transactions.append(
                {
                    "name": merchant_name,
                    "amount": amount_cents / 100,
                    "amount_cents": amount_cents,
                    "date": date_obj.isoformat(),
                    "date_obj": date_obj,
                    "category": category,
                    "subcategory": subcategory,
                    "payment_method": payment_method,
                    "budget_period_id": budget_period.id if budget_period else None,
                    "is_duplicate": is_duplicate,
                }
            )

        except Exception as e:
            errors.append(f"Line {line_num}: {str(e)}")
            skipped_count += 1
            continue

    return {
        "parsed_transactions": parsed_transactions,
        "errors": errors,
        "skipped_count": skipped_count,
    }


@export_import_bp.route("/preview-bank-transactions", methods=["POST"])
@jwt_required()
def preview_bank_transactions():
    """
    Preview bank transactions without importing them.
    Returns parsed transactions for user review.
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or "transactions" not in data or "payment_method" not in data:
            return (
                jsonify({"error": "transactions and payment_method are required"}),
                400,
            )

        result = parse_bank_transactions(
            data["transactions"],
            data["payment_method"],
            current_user_id,
            check_duplicates=True,
        )

        return (
            jsonify(
                {
                    "transactions": result["parsed_transactions"],
                    "errors": result["errors"],
                    "skipped_count": result["skipped_count"],
                    "total_count": len(result["parsed_transactions"]),
                }
            ),
            200,
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Preview failed: {str(e)}"}), 500


@export_import_bp.route("/import-bank-transactions", methods=["POST"])
@jwt_required()
def import_bank_transactions():
    """
    Import bank transactions from pasted CSV/TSV data.

    Expected format:
    Transaction Date\tAmount\tName
    2025/11/22\t-42,33\tWise Europe SA

    Returns created expenses and any errors/warnings.
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()

        if not data or "transactions" not in data or "payment_method" not in data:
            return (
                jsonify({"error": "transactions and payment_method are required"}),
                400,
            )

        # Parse transactions
        result = parse_bank_transactions(
            data["transactions"],
            data["payment_method"],
            current_user_id,
            check_duplicates=True,
        )

        # Create expenses from parsed transactions
        imported_count = 0
        created_expenses = []
        mark_as_fixed_bills = data.get("mark_as_fixed_bills", False)

        for txn in result["parsed_transactions"]:
            expense = Expense(
                user_id=current_user_id,
                name=txn["name"],
                amount=txn["amount_cents"],
                category=txn["category"],
                subcategory=txn["subcategory"],
                date=txn["date_obj"],
                payment_method=txn["payment_method"],
                is_fixed_bill=mark_as_fixed_bills,
                notes=f'Imported from bank on {datetime.now().strftime("%Y-%m-%d")}',
            )
            db.session.add(expense)
            imported_count += 1

            created_expenses.append(
                {
                    "name": txn["name"],
                    "amount": txn["amount"],
                    "date": txn["date"],
                    "category": txn["category"],
                    "subcategory": txn["subcategory"],
                }
            )

        # Commit all expenses
        if imported_count > 0:
            db.session.commit()

        return (
            jsonify(
                {
                    "message": f"Successfully imported {imported_count} transaction(s)"
                    + (
                        f', skipped {result["skipped_count"]}'
                        if result["skipped_count"] > 0
                        else ""
                    ),
                    "imported_count": imported_count,
                    "skipped_count": result["skipped_count"],
                    "created_expenses": created_expenses,
                    "errors": result["errors"],
                }
            ),
            200,
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Import failed: {str(e)}"}), 500

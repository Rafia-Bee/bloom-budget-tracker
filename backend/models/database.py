"""
Bloom - Database Models

This module defines the SQLAlchemy models for the Bloom budget tracking application.

Models:
- User: User authentication and profile
- SalaryPeriod: Monthly salary periods with weekly budget calculations
- BudgetPeriod: Budget periods (weekly, monthly, custom)
- Expense: Individual expense transactions
- Income: Income records (salary, etc.)
- Debt: Debt tracking with balances
- RecurringExpense: Recurring expense templates
- ExpenseNameMapping: AI subcategorization mappings
- UserDefaults: User's default expense values
- CreditCardSettings: Credit card configuration
- PeriodSuggestion: End-of-period recommendations
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    budget_periods = db.relationship(
        "BudgetPeriod", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    salary_periods = db.relationship(
        "SalaryPeriod", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    expenses = db.relationship(
        "Expense", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    income = db.relationship(
        "Income", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    debts = db.relationship(
        "Debt", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_locked(self):
        """Check if account is currently locked"""
        if self.locked_until is None:
            return False
        return datetime.utcnow() < self.locked_until

    def reset_failed_attempts(self):
        """Reset failed login attempts counter"""
        self.failed_login_attempts = 0
        self.locked_until = None


class SalaryPeriod(db.Model):
    __tablename__ = "salary_periods"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Balance-based budgeting fields
    # Starting debit balance in cents
    initial_debit_balance = db.Column(db.Integer, nullable=False)
    # Available credit remaining (limit - debt)
    initial_credit_balance = db.Column(db.Integer, nullable=False)
    # Total credit card limit in cents
    credit_limit = db.Column(db.Integer, nullable=False, default=150000)
    # Credit limit to use this period
    credit_budget_allowance = db.Column(db.Integer, nullable=False, default=0)

    # Legacy salary field (kept for backwards compatibility)
    # Total salary in cents (deprecated)
    salary_amount = db.Column(db.Integer, nullable=True)

    # Budget calculation fields
    # debit + credit_allowance - fixed_bills
    total_budget_amount = db.Column(db.Integer, nullable=False)
    # Total fixed bills in cents
    fixed_bills_total = db.Column(db.Integer, nullable=False, default=0)
    # total_budget - fixed_bills
    remaining_amount = db.Column(db.Integer, nullable=False)
    weekly_budget = db.Column(db.Integer, nullable=False)  # remaining / 4
    # Debit portion of weekly budget
    weekly_debit_budget = db.Column(db.Integer, nullable=False)
    # Credit portion of weekly budget
    weekly_credit_budget = db.Column(db.Integer, nullable=False, default=0)

    start_date = db.Column(db.Date, nullable=False)  # Period start date
    end_date = db.Column(db.Date, nullable=False)  # Period end date
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    budget_periods = db.relationship(
        "BudgetPeriod", backref="salary_period", lazy=True, cascade="all, delete-orphan"
    )


class BudgetPeriod(db.Model):
    __tablename__ = "budget_periods"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    salary_period_id = db.Column(
        db.Integer, db.ForeignKey("salary_periods.id"), nullable=True
    )
    # 1-4 for weekly budgets
    week_number = db.Column(db.Integer, nullable=True)
    # Weekly budget allocation
    budget_amount = db.Column(db.Integer, nullable=True)
    start_date = db.Column(db.Date, nullable=False, index=True)
    end_date = db.Column(db.Date, nullable=False, index=True)
    period_type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Composite index for active period queries
    __table_args__ = (
        db.Index("idx_budget_period_active", "user_id", "start_date", "end_date"),
    )


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    recurring_template_id = db.Column(
        db.Integer, db.ForeignKey("recurring_expenses.id"), nullable=True
    )
    name = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), nullable=False, index=True)
    subcategory = db.Column(db.String(100), nullable=True)
    date = db.Column(db.Date, nullable=False, index=True)
    due_date = db.Column(db.String(50), nullable=True, default="N/A")
    payment_method = db.Column(
        db.String(20), nullable=False, default="credit", index=True
    )
    notes = db.Column(db.Text, nullable=True)
    receipt_url = db.Column(db.String(500), nullable=True)
    # True for fixed bills that don't count against weekly budget
    is_fixed_bill = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Composite index for common query pattern: user + date range + ordering
    __table_args__ = (
        db.Index("idx_expense_user_date", "user_id", "date"),
        db.Index("idx_expense_user_category", "user_id", "category"),
        db.Index("idx_expense_user_payment", "user_id", "payment_method"),
    )


class Income(db.Model):
    __tablename__ = "income"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    scheduled_date = db.Column(db.Date, nullable=True, index=True)
    actual_date = db.Column(db.Date, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Composite index for common query pattern: user + date filtering
    __table_args__ = (
        db.Index("idx_income_user_scheduled", "user_id", "scheduled_date"),
        db.Index("idx_income_user_actual", "user_id", "actual_date"),
    )


class Debt(db.Model):
    __tablename__ = "debts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    original_amount = db.Column(db.Integer, nullable=False)
    current_balance = db.Column(db.Integer, nullable=False)
    monthly_payment = db.Column(db.Integer, nullable=False)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class RecurringExpense(db.Model):
    __tablename__ = "recurring_expenses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    subcategory = db.Column(db.String(100), nullable=True)
    payment_method = db.Column(db.String(20), nullable=False, default="credit")
    # 'weekly', 'biweekly', 'monthly', 'custom'
    frequency = db.Column(db.String(20), nullable=False)
    # For custom frequency (days)
    frequency_value = db.Column(db.Integer, nullable=True)
    day_of_month = db.Column(db.Integer, nullable=True)  # For monthly (1-31)
    # For weekly (0=Monday, 6=Sunday)
    day_of_week = db.Column(db.Integer, nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)  # Optional end date
    next_due_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    # True if this counts as a fixed bill for weekly budgeting
    is_fixed_bill = db.Column(db.Boolean, default=False, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationship to generated expenses
    generated_expenses = db.relationship(
        "Expense",
        backref="recurring_template",
        lazy=True,
        foreign_keys="Expense.recurring_template_id",
    )


class ExpenseNameMapping(db.Model):
    __tablename__ = "expense_name_mappings"

    id = db.Column(db.Integer, primary_key=True)
    expense_name = db.Column(db.String(200), unique=True, nullable=False)
    subcategory = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, default=1.0)
    last_updated = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class UserDefaults(db.Model):
    __tablename__ = "user_defaults"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True
    )
    default_expense_name = db.Column(db.String(200), default="Wolt")
    default_category = db.Column(db.String(100), default="Flexible Expenses")
    default_subcategory = db.Column(db.String(100), default="Food")
    default_payment_method = db.Column(db.String(20), default="credit")


class CreditCardSettings(db.Model):
    __tablename__ = "credit_card_settings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True
    )
    credit_limit = db.Column(db.Integer, default=150000)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PeriodSuggestion(db.Model):
    __tablename__ = "period_suggestions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    suggestion_type = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="password_reset_tokens")

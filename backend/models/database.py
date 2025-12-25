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
    recurring_lookahead_days = db.Column(db.Integer, default=14, nullable=False)
    # User's preferred base currency for display (ISO 4217 code)
    default_currency = db.Column(db.String(3), default="EUR", nullable=False)

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

    __table_args__ = (
        db.CheckConstraint("email LIKE '%@%'", name="check_user_email_format"),
        db.CheckConstraint(
            "failed_login_attempts >= 0", name="check_user_failed_attempts"
        ),
        db.CheckConstraint(
            "recurring_lookahead_days >= 7 AND recurring_lookahead_days <= 90",
            name="check_user_lookahead_range",
        ),
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
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

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

    __table_args__ = (
        db.CheckConstraint(
            "start_date < end_date", name="check_salary_period_date_range"
        ),
        db.CheckConstraint(
            "weekly_budget > 0", name="check_salary_period_positive_weekly_budget"
        ),
        db.CheckConstraint(
            "initial_debit_balance >= 0", name="check_salary_period_debit_balance"
        ),
        db.CheckConstraint(
            "credit_limit > 0", name="check_salary_period_positive_credit_limit"
        ),
        db.CheckConstraint(
            "credit_budget_allowance >= 0", name="check_salary_period_credit_allowance"
        ),
        db.CheckConstraint(
            "total_budget_amount >= 0", name="check_salary_period_total_budget"
        ),
        db.CheckConstraint(
            "fixed_bills_total >= 0", name="check_salary_period_fixed_bills"
        ),
        db.CheckConstraint(
            "remaining_amount >= 0", name="check_salary_period_remaining"
        ),
        db.CheckConstraint(
            "weekly_debit_budget >= 0", name="check_salary_period_weekly_debit"
        ),
        db.CheckConstraint(
            "weekly_credit_budget >= 0", name="check_salary_period_weekly_credit"
        ),
    )


class BudgetPeriod(db.Model):
    __tablename__ = "budget_periods"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    salary_period_id = db.Column(
        db.Integer,
        db.ForeignKey("salary_periods.id", ondelete="CASCADE"),
        nullable=True,
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
        db.CheckConstraint(
            "start_date < end_date", name="check_budget_period_date_range"
        ),
        db.CheckConstraint(
            "week_number IS NULL OR (week_number BETWEEN 1 AND 4)",
            name="check_budget_period_week_number",
        ),
        db.CheckConstraint(
            "budget_amount IS NULL OR budget_amount > 0",
            name="check_budget_period_positive_amount",
        ),
    )


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recurring_template_id = db.Column(
        db.Integer,
        db.ForeignKey("recurring_expenses.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    # Currency of the transaction (ISO 4217 code)
    currency = db.Column(db.String(3), default="EUR", nullable=False)
    # Original amount before conversion (in cents, same currency as 'currency' field)
    original_amount = db.Column(db.Integer, nullable=True)
    # Exchange rate used at time of creation (for historical accuracy)
    # Stored as the rate to convert FROM transaction currency TO EUR (base)
    # e.g., if currency=USD, rate=0.95 means 1 USD = 0.95 EUR at creation time
    exchange_rate_used = db.Column(db.Float, nullable=True)
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
        db.Index("idx_expense_user_date_fixed", "user_id", "date", "is_fixed_bill"),
        db.Index("idx_expense_user_category", "user_id", "category"),
        db.Index("idx_expense_user_payment", "user_id", "payment_method"),
        db.CheckConstraint("amount > 0", name="check_expense_positive_amount"),
    )


class Income(db.Model):
    __tablename__ = "income"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    # Currency of the income (ISO 4217 code)
    currency = db.Column(db.String(3), default="EUR", nullable=False)
    # Original amount before conversion (in cents, same currency as 'currency' field)
    original_amount = db.Column(db.Integer, nullable=True)
    # Exchange rate used at time of creation (for historical accuracy)
    exchange_rate_used = db.Column(db.Float, nullable=True)
    scheduled_date = db.Column(db.Date, nullable=True, index=True)
    actual_date = db.Column(db.Date, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Composite index for common query pattern: user + date filtering
    __table_args__ = (
        db.Index("idx_income_user_scheduled", "user_id", "scheduled_date"),
        db.Index("idx_income_user_actual", "user_id", "actual_date"),
        db.CheckConstraint("amount > 0", name="check_income_positive_amount"),
    )


class Debt(db.Model):
    __tablename__ = "debts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
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
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
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

    __table_args__ = (
        db.CheckConstraint(
            "amount > 0", name="check_recurring_expense_positive_amount"
        ),
        db.CheckConstraint(
            "end_date IS NULL OR start_date < end_date",
            name="check_recurring_expense_date_range",
        ),
        db.CheckConstraint(
            "day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)",
            name="check_recurring_expense_day_of_month",
        ),
        db.CheckConstraint(
            "day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)",
            name="check_recurring_expense_day_of_week",
        ),
        db.CheckConstraint(
            "frequency_value IS NULL OR frequency_value > 0",
            name="check_recurring_expense_frequency_value",
        ),
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
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    default_expense_name = db.Column(db.String(200), default="Wolt")
    default_category = db.Column(db.String(100), default="Flexible Expenses")
    default_subcategory = db.Column(db.String(100), default="Food")
    default_payment_method = db.Column(db.String(20), default="credit")


class CreditCardSettings(db.Model):
    __tablename__ = "credit_card_settings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    credit_limit = db.Column(db.Integer, default=150000)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        db.CheckConstraint("credit_limit > 0", name="check_credit_card_positive_limit"),
    )


class PeriodSuggestion(db.Model):
    __tablename__ = "period_suggestions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    suggestion_type = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.CheckConstraint(
            "amount > 0", name="check_period_suggestion_positive_amount"
        ),
    )


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="password_reset_tokens")


class Subcategory(db.Model):
    __tablename__ = "subcategories"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,  # NULL for system subcategories
        index=True,
    )
    category = db.Column(db.String(100), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    is_system = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user = db.relationship("User", backref="subcategories")

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "name": self.name,
            "is_system": self.is_system,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Goal(db.Model):
    """
    Goal model for tracking savings goals and financial targets.

    Goals are linked to subcategories in the 'Savings & Investments' category.
    Progress is tracked through expense entries in the linked subcategory.
    """

    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    target_amount = db.Column(db.Integer, nullable=False)  # Amount in cents
    initial_amount = db.Column(
        db.Integer, nullable=False, default=0
    )  # Pre-existing savings in cents
    target_date = db.Column(db.Date, nullable=True)
    subcategory_name = db.Column(db.String(100), nullable=False)  # Links to subcategory
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = db.relationship("User", backref="goals")

    # Indexes for performance
    __table_args__ = (
        db.Index("idx_goal_user_active", "user_id", "is_active"),
        db.Index("idx_goal_user_subcategory", "user_id", "subcategory_name"),
        db.CheckConstraint("target_amount > 0", name="check_goal_positive_amount"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "target_amount": self.target_amount,
            "initial_amount": self.initial_amount,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "subcategory_name": self.subcategory_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def calculate_progress(self):
        """Calculate progress towards goal based on initial amount plus expenses in linked subcategory."""
        from backend.models.database import Expense  # Avoid circular import
        from datetime import date

        today = date.today()

        total_contributions = (
            db.session.query(db.func.sum(Expense.amount))
            .filter(
                Expense.user_id == self.user_id,
                Expense.category == "Savings & Investments",
                Expense.subcategory == self.subcategory_name,
                Expense.amount > 0,  # Only positive contributions count
                Expense.date <= today,  # Only count expenses that have occurred
            )
            .scalar()
            or 0
        )

        # Include initial_amount in current progress
        current_amount = self.initial_amount + total_contributions

        return {
            "current_amount": current_amount,
            "initial_amount": self.initial_amount,
            "contributions_amount": total_contributions,
            "target_amount": self.target_amount,
            "percentage": (current_amount / self.target_amount * 100)
            if self.target_amount > 0
            else 0,
            "remaining": max(0, self.target_amount - current_amount),
        }


class ExchangeRate(db.Model):
    """
    Cached exchange rates from frankfurter.app API.

    Rates are cached daily to minimize API calls and support offline functionality.
    Historical rates are stored for accurate conversion of past transactions.
    """

    __tablename__ = "exchange_rates"

    id = db.Column(db.Integer, primary_key=True)
    base_currency = db.Column(db.String(3), nullable=False, index=True)
    target_currency = db.Column(db.String(3), nullable=False, index=True)
    rate = db.Column(db.Float, nullable=False)  # 1 base = X target
    rate_date = db.Column(db.Date, nullable=False, index=True)  # Date rate is valid for
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint(
            "base_currency", "target_currency", "rate_date", name="uq_exchange_rate"
        ),
        db.Index(
            "idx_exchange_rate_lookup", "base_currency", "target_currency", "rate_date"
        ),
        db.CheckConstraint("rate > 0", name="check_exchange_rate_positive"),
    )

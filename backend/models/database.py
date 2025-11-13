"""
Bloom - Database Models

This module defines the SQLAlchemy models for the Bloom budget tracking application.

Models:
- User: User authentication and profile
- BudgetPeriod: Budget periods (weekly, monthly, custom)
- Expense: Individual expense transactions
- Income: Income records (salary, etc.)
- Debt: Debt tracking with balances
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
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    budget_periods = db.relationship('BudgetPeriod', backref='user', lazy=True, cascade='all, delete-orphan')
    expenses = db.relationship('Expense', backref='user', lazy=True, cascade='all, delete-orphan')
    income = db.relationship('Income', backref='user', lazy=True, cascade='all, delete-orphan')
    debts = db.relationship('Debt', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class BudgetPeriod(db.Model):
    __tablename__ = 'budget_periods'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    period_type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    expenses = db.relationship('Expense', backref='budget_period', lazy=True)
    income = db.relationship('Income', backref='budget_period', lazy=True)


class Expense(db.Model):
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    budget_period_id = db.Column(db.Integer, db.ForeignKey('budget_periods.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    subcategory = db.Column(db.String(100), nullable=True)
    date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.String(50), nullable=True, default='N/A')
    payment_method = db.Column(db.String(20), nullable=False, default='credit')
    notes = db.Column(db.Text, nullable=True)
    receipt_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Income(db.Model):
    __tablename__ = 'income'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    budget_period_id = db.Column(db.Integer, db.ForeignKey('budget_periods.id'), nullable=True)
    type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    scheduled_date = db.Column(db.Date, nullable=True)
    actual_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Debt(db.Model):
    __tablename__ = 'debts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    original_amount = db.Column(db.Integer, nullable=False)
    current_balance = db.Column(db.Integer, nullable=False)
    monthly_payment = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExpenseNameMapping(db.Model):
    __tablename__ = 'expense_name_mappings'

    id = db.Column(db.Integer, primary_key=True)
    expense_name = db.Column(db.String(200), unique=True, nullable=False)
    subcategory = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, default=1.0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserDefaults(db.Model):
    __tablename__ = 'user_defaults'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    default_expense_name = db.Column(db.String(200), default='Wolt')
    default_category = db.Column(db.String(100), default='Flexible Expenses')
    default_subcategory = db.Column(db.String(100), default='Food')
    default_payment_method = db.Column(db.String(20), default='credit')


class CreditCardSettings(db.Model):
    __tablename__ = 'credit_card_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    credit_limit = db.Column(db.Integer, default=150000)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PeriodSuggestion(db.Model):
    __tablename__ = 'period_suggestions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    budget_period_id = db.Column(db.Integer, db.ForeignKey('budget_periods.id'), nullable=False)
    suggestion_type = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

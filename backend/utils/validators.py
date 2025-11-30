"""
Bloom - Input Validation Utilities

Validates and sanitizes user inputs to prevent injection attacks
and ensure data integrity.
"""

import re
from datetime import datetime


def validate_expense_name(name):
    """Validate expense name (max 200 chars, no special chars that could cause issues)."""
    if not name or len(name) > 200:
        return False, "Expense name must be 1-200 characters"
    # Allow letters, numbers, spaces, and common punctuation
    if not re.match(r"^[\w\s\-\.\,\&\(\)]+$", name, re.UNICODE):
        return False, "Expense name contains invalid characters"
    return True, None


def validate_amount(amount):
    """Validate monetary amount (must be positive integer in cents)."""
    try:
        amount = int(amount)
        if amount <= 0:
            return False, "Amount must be positive"
        if amount > 100000000:  # €1 million max
            return False, "Amount exceeds maximum allowed value"
        return True, None
    except (ValueError, TypeError):
        return False, "Invalid amount format"


def validate_category(category, allowed_categories):
    """Validate category against allowed list."""
    if category not in allowed_categories:
        return (
            False,
            f"Invalid category. Must be one of: {', '.join(allowed_categories)}",
        )
    return True, None


def validate_payment_method(method):
    """Validate payment method."""
    allowed = ["credit", "debit", "cash"]
    if method not in allowed:
        return False, f"Invalid payment method. Must be one of: {', '.join(allowed)}"
    return True, None


def validate_date_string(date_str):
    """Validate and parse date string."""
    if not date_str:
        return True, None  # Optional field

    try:
        # Try ISO format (YYYY-MM-DD)
        datetime.strptime(date_str, "%Y-%m-%d")
        return True, None
    except ValueError:
        try:
            # Try display format (dd MMM, YYYY)
            datetime.strptime(date_str, "%d %b, %Y")
            return True, None
        except ValueError:
            return False, "Invalid date format. Use YYYY-MM-DD"


def validate_notes(notes):
    """Validate notes field (max 1000 chars)."""
    if notes and len(notes) > 1000:
        return False, "Notes must be less than 1000 characters"
    return True, None


def sanitize_string(value):
    """Remove potentially dangerous characters from string inputs."""
    if not value:
        return value
    # Strip leading/trailing whitespace
    value = value.strip()
    # Remove null bytes
    value = value.replace("\x00", "")
    return value


# Allowed categories for expenses
ALLOWED_CATEGORIES = [
    "Fixed Expenses",
    "Flexible Expenses",
    "Leisure",
    "Debt Payments",
    "Savings",
]

ALLOWED_INCOME_TYPES = ["salary", "freelance", "investment", "gift", "other"]

ALLOWED_PERIOD_TYPES = ["monthly", "weekly", "custom"]

ALLOWED_RECURRING_FREQUENCIES = ["weekly", "biweekly", "monthly", "custom"]


def validate_email(email):
    """Validate email address format."""
    if not email or len(email) > 120:
        return False
    # Basic email regex pattern
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(email_pattern, email) is not None

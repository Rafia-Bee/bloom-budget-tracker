"""
Bloom - Validator Tests

Comprehensive unit tests for input validation utilities.
Tests all validation functions in backend/utils/validators.py.
"""

import pytest
from backend.utils.validators import (
    validate_expense_name,
    validate_amount,
    validate_category,
    validate_payment_method,
    validate_date_string,
    validate_notes,
    sanitize_string,
    validate_email,
    ALLOWED_CATEGORIES,
    ALLOWED_INCOME_TYPES,
    ALLOWED_PERIOD_TYPES,
    ALLOWED_RECURRING_FREQUENCIES,
)


class TestValidateExpenseName:
    """Tests for validate_expense_name function."""

    def test_valid_simple_name(self):
        """Test valid simple expense name."""
        valid, error = validate_expense_name("Groceries")
        assert valid is True
        assert error is None

    def test_valid_name_with_spaces(self):
        """Test valid name with spaces."""
        valid, error = validate_expense_name("Weekly Groceries Shopping")
        assert valid is True
        assert error is None

    def test_valid_name_with_numbers(self):
        """Test valid name with numbers."""
        valid, error = validate_expense_name("Gas Station 123")
        assert valid is True
        assert error is None

    def test_valid_name_with_punctuation(self):
        """Test valid name with allowed punctuation."""
        valid, error = validate_expense_name("Coffee & Tea (Morning)")
        assert valid is True
        assert error is None

    def test_valid_name_with_hyphen(self):
        """Test valid name with hyphen."""
        valid, error = validate_expense_name("Co-op Store")
        assert valid is True
        assert error is None

    def test_valid_name_with_comma(self):
        """Test valid name with comma."""
        valid, error = validate_expense_name("Food, Drinks")
        assert valid is True
        assert error is None

    def test_valid_name_with_period(self):
        """Test valid name with period."""
        valid, error = validate_expense_name("Dr. Smith")
        assert valid is True
        assert error is None

    def test_empty_name_invalid(self):
        """Test empty name is invalid."""
        valid, error = validate_expense_name("")
        assert valid is False
        assert "must be 1-200 characters" in error

    def test_none_name_invalid(self):
        """Test None name is invalid."""
        valid, error = validate_expense_name(None)
        assert valid is False
        assert "must be 1-200 characters" in error

    def test_name_too_long(self):
        """Test name over 200 characters is invalid."""
        long_name = "A" * 201
        valid, error = validate_expense_name(long_name)
        assert valid is False
        assert "must be 1-200 characters" in error

    def test_name_exactly_200_chars(self):
        """Test name exactly 200 characters is valid."""
        exact_name = "A" * 200
        valid, error = validate_expense_name(exact_name)
        assert valid is True
        assert error is None

    def test_name_with_special_chars_invalid(self):
        """Test name with invalid special characters."""
        valid, error = validate_expense_name("Test<script>alert('xss')</script>")
        assert valid is False
        assert "invalid characters" in error

    def test_name_with_quotes_invalid(self):
        """Test name with quotes is invalid."""
        valid, error = validate_expense_name('Test "quoted"')
        assert valid is False
        assert "invalid characters" in error

    def test_name_with_unicode_letters(self):
        """Test name with unicode letters (e.g., accented characters)."""
        valid, error = validate_expense_name("Café Müller")
        assert valid is True
        assert error is None


class TestValidateAmount:
    """Tests for validate_amount function."""

    def test_valid_positive_amount(self):
        """Test valid positive amount."""
        valid, error = validate_amount(1500)
        assert valid is True
        assert error is None

    def test_valid_small_amount(self):
        """Test valid small amount (1 cent)."""
        valid, error = validate_amount(1)
        assert valid is True
        assert error is None

    def test_valid_large_amount(self):
        """Test valid large amount near max."""
        valid, error = validate_amount(100000000)
        assert valid is True
        assert error is None

    def test_valid_string_amount(self):
        """Test valid amount as string."""
        valid, error = validate_amount("1500")
        assert valid is True
        assert error is None

    def test_zero_amount_invalid(self):
        """Test zero amount is invalid."""
        valid, error = validate_amount(0)
        assert valid is False
        assert "must be positive" in error

    def test_negative_amount_invalid(self):
        """Test negative amount is invalid."""
        valid, error = validate_amount(-1000)
        assert valid is False
        assert "must be positive" in error

    def test_amount_exceeds_max(self):
        """Test amount exceeding maximum."""
        valid, error = validate_amount(100000001)
        assert valid is False
        assert "exceeds maximum" in error

    def test_non_numeric_string_invalid(self):
        """Test non-numeric string is invalid."""
        valid, error = validate_amount("abc")
        assert valid is False
        assert "Invalid amount format" in error

    def test_none_amount_invalid(self):
        """Test None amount is invalid."""
        valid, error = validate_amount(None)
        assert valid is False
        assert "Invalid amount format" in error

    def test_float_amount_truncates(self):
        """Test float amount is converted to int."""
        valid, error = validate_amount(15.99)
        assert valid is True
        assert error is None

    def test_empty_string_invalid(self):
        """Test empty string is invalid."""
        valid, error = validate_amount("")
        assert valid is False
        assert "Invalid amount format" in error


class TestValidateCategory:
    """Tests for validate_category function."""

    def test_valid_category(self):
        """Test valid category from allowed list."""
        valid, error = validate_category("Fixed Expenses", ALLOWED_CATEGORIES)
        assert valid is True
        assert error is None

    def test_all_allowed_categories(self):
        """Test all allowed categories pass validation."""
        for category in ALLOWED_CATEGORIES:
            valid, error = validate_category(category, ALLOWED_CATEGORIES)
            assert valid is True, f"Category '{category}' should be valid"
            assert error is None

    def test_invalid_category(self):
        """Test invalid category fails validation."""
        valid, error = validate_category("Invalid Category", ALLOWED_CATEGORIES)
        assert valid is False
        assert "Invalid category" in error
        assert "Must be one of" in error

    def test_empty_category_invalid(self):
        """Test empty category is invalid."""
        valid, error = validate_category("", ALLOWED_CATEGORIES)
        assert valid is False
        assert "Invalid category" in error

    def test_none_category_invalid(self):
        """Test None category is invalid."""
        valid, error = validate_category(None, ALLOWED_CATEGORIES)
        assert valid is False
        assert "Invalid category" in error

    def test_case_sensitive_category(self):
        """Test category validation is case sensitive."""
        valid, error = validate_category("fixed expenses", ALLOWED_CATEGORIES)
        assert valid is False
        assert "Invalid category" in error


class TestValidatePaymentMethod:
    """Tests for validate_payment_method function."""

    def test_valid_credit(self):
        """Test 'credit' payment method is valid."""
        valid, error = validate_payment_method("credit")
        assert valid is True
        assert error is None

    def test_valid_debit(self):
        """Test 'debit' payment method is valid."""
        valid, error = validate_payment_method("debit")
        assert valid is True
        assert error is None

    def test_valid_cash(self):
        """Test 'cash' payment method is valid."""
        valid, error = validate_payment_method("cash")
        assert valid is True
        assert error is None

    def test_invalid_payment_method(self):
        """Test invalid payment method."""
        valid, error = validate_payment_method("bitcoin")
        assert valid is False
        assert "Invalid payment method" in error
        assert "Must be one of" in error

    def test_uppercase_invalid(self):
        """Test uppercase payment method is invalid (case sensitive)."""
        valid, error = validate_payment_method("Credit")
        assert valid is False
        assert "Invalid payment method" in error

    def test_empty_payment_method(self):
        """Test empty payment method is invalid."""
        valid, error = validate_payment_method("")
        assert valid is False
        assert "Invalid payment method" in error

    def test_none_payment_method(self):
        """Test None payment method is invalid."""
        valid, error = validate_payment_method(None)
        assert valid is False
        assert "Invalid payment method" in error


class TestValidateDateString:
    """Tests for validate_date_string function."""

    def test_valid_iso_format(self):
        """Test valid ISO date format (YYYY-MM-DD)."""
        valid, error = validate_date_string("2025-12-25")
        assert valid is True
        assert error is None

    def test_valid_display_format(self):
        """Test valid display date format (dd MMM, YYYY)."""
        valid, error = validate_date_string("25 Dec, 2025")
        assert valid is True
        assert error is None

    def test_empty_string_valid(self):
        """Test empty string is valid (optional field)."""
        valid, error = validate_date_string("")
        assert valid is True
        assert error is None

    def test_none_valid(self):
        """Test None is valid (optional field)."""
        valid, error = validate_date_string(None)
        assert valid is True
        assert error is None

    def test_invalid_format(self):
        """Test invalid date format."""
        valid, error = validate_date_string("25/12/2025")
        assert valid is False
        assert "Invalid date format" in error

    def test_invalid_date_string(self):
        """Test invalid date string."""
        valid, error = validate_date_string("not-a-date")
        assert valid is False
        assert "Invalid date format" in error

    def test_partial_date_invalid(self):
        """Test partial date is invalid."""
        valid, error = validate_date_string("2025-12")
        assert valid is False
        assert "Invalid date format" in error

    def test_european_format_invalid(self):
        """Test European DD/MM/YYYY format is invalid."""
        valid, error = validate_date_string("25/12/2025")
        assert valid is False
        assert "Invalid date format" in error


class TestValidateNotes:
    """Tests for validate_notes function."""

    def test_valid_notes(self):
        """Test valid notes string."""
        valid, error = validate_notes("This is a note about the expense.")
        assert valid is True
        assert error is None

    def test_empty_notes_valid(self):
        """Test empty notes is valid."""
        valid, error = validate_notes("")
        assert valid is True
        assert error is None

    def test_none_notes_valid(self):
        """Test None notes is valid."""
        valid, error = validate_notes(None)
        assert valid is True
        assert error is None

    def test_notes_exactly_1000_chars(self):
        """Test notes exactly 1000 characters is valid."""
        notes = "A" * 1000
        valid, error = validate_notes(notes)
        assert valid is True
        assert error is None

    def test_notes_too_long(self):
        """Test notes over 1000 characters is invalid."""
        notes = "A" * 1001
        valid, error = validate_notes(notes)
        assert valid is False
        assert "less than 1000 characters" in error


class TestSanitizeString:
    """Tests for sanitize_string function."""

    def test_strips_whitespace(self):
        """Test whitespace is stripped."""
        result = sanitize_string("  hello world  ")
        assert result == "hello world"

    def test_removes_null_bytes(self):
        """Test null bytes are removed."""
        result = sanitize_string("hello\x00world")
        assert result == "helloworld"
        assert "\x00" not in result

    def test_none_returns_none(self):
        """Test None input returns None."""
        result = sanitize_string(None)
        assert result is None

    def test_empty_string_returns_empty(self):
        """Test empty string returns empty."""
        result = sanitize_string("")
        assert result == ""

    def test_normal_string_unchanged(self):
        """Test normal string is unchanged except whitespace."""
        result = sanitize_string("Normal text")
        assert result == "Normal text"

    def test_multiple_null_bytes(self):
        """Test multiple null bytes are removed."""
        result = sanitize_string("\x00test\x00string\x00")
        assert result == "teststring"

    def test_only_whitespace(self):
        """Test string with only whitespace returns empty."""
        result = sanitize_string("   ")
        assert result == ""

    def test_preserves_internal_spaces(self):
        """Test internal spaces are preserved."""
        result = sanitize_string("  hello   world  ")
        assert result == "hello   world"


class TestValidateEmail:
    """Tests for validate_email function."""

    def test_valid_simple_email(self):
        """Test valid simple email."""
        assert validate_email("test@example.com") is True

    def test_valid_email_with_subdomain(self):
        """Test valid email with subdomain."""
        assert validate_email("user@mail.example.com") is True

    def test_valid_email_with_plus(self):
        """Test valid email with plus sign."""
        assert validate_email("user+tag@example.com") is True

    def test_valid_email_with_dots(self):
        """Test valid email with dots in local part."""
        assert validate_email("first.last@example.com") is True

    def test_valid_email_with_numbers(self):
        """Test valid email with numbers."""
        assert validate_email("user123@example.com") is True

    def test_invalid_email_no_at(self):
        """Test email without @ is invalid."""
        assert validate_email("testexample.com") is False

    def test_invalid_email_no_domain(self):
        """Test email without domain is invalid."""
        assert validate_email("test@") is False

    def test_invalid_email_no_tld(self):
        """Test email without TLD is invalid."""
        assert validate_email("test@example") is False

    def test_invalid_email_empty(self):
        """Test empty email is invalid."""
        assert validate_email("") is False

    def test_invalid_email_none(self):
        """Test None email is invalid."""
        assert validate_email(None) is False

    def test_invalid_email_too_long(self):
        """Test email over 120 characters is invalid."""
        long_email = "a" * 110 + "@example.com"
        assert validate_email(long_email) is False

    def test_invalid_email_spaces(self):
        """Test email with spaces is invalid."""
        assert validate_email("test user@example.com") is False

    def test_valid_email_exactly_120_chars(self):
        """Test email exactly 120 characters is valid."""
        # Create email that's exactly 120 chars: local@domain.com
        # @example.com = 12 chars, need local part of 108 chars
        local_part = "a" * 108
        email = f"{local_part}@example.com"  # exactly 120
        assert len(email) == 120
        assert validate_email(email) is True


class TestAllowedConstants:
    """Tests for allowed constant lists."""

    def test_allowed_categories_not_empty(self):
        """Test ALLOWED_CATEGORIES is not empty."""
        assert len(ALLOWED_CATEGORIES) > 0

    def test_allowed_categories_contains_expected(self):
        """Test ALLOWED_CATEGORIES contains expected values."""
        expected = [
            "Fixed Expenses",
            "Flexible Expenses",
            "Savings & Investments",
            "Debt Payments",
        ]
        for cat in expected:
            assert cat in ALLOWED_CATEGORIES

    def test_allowed_income_types_not_empty(self):
        """Test ALLOWED_INCOME_TYPES is not empty."""
        assert len(ALLOWED_INCOME_TYPES) > 0

    def test_allowed_income_types_contains_expected(self):
        """Test ALLOWED_INCOME_TYPES contains expected values."""
        expected = ["salary", "freelance", "investment", "gift", "other"]
        for income_type in expected:
            assert income_type in ALLOWED_INCOME_TYPES

    def test_allowed_period_types_not_empty(self):
        """Test ALLOWED_PERIOD_TYPES is not empty."""
        assert len(ALLOWED_PERIOD_TYPES) > 0

    def test_allowed_period_types_contains_expected(self):
        """Test ALLOWED_PERIOD_TYPES contains expected values."""
        expected = ["monthly", "weekly", "custom"]
        for period_type in expected:
            assert period_type in ALLOWED_PERIOD_TYPES

    def test_allowed_recurring_frequencies_not_empty(self):
        """Test ALLOWED_RECURRING_FREQUENCIES is not empty."""
        assert len(ALLOWED_RECURRING_FREQUENCIES) > 0

    def test_allowed_recurring_frequencies_contains_expected(self):
        """Test ALLOWED_RECURRING_FREQUENCIES contains expected values."""
        expected = ["weekly", "biweekly", "monthly", "custom"]
        for freq in expected:
            assert freq in ALLOWED_RECURRING_FREQUENCIES

"""
Bloom - Recurring Generation Routes Tests

Tests for the recurring expense generation API endpoints.
Covers /generate, /generate/all, and /preview routes.
"""

import pytest
from datetime import date, timedelta
from backend.models.database import db, RecurringExpense, Expense, User


def create_recurring_template(user_id, **kwargs):
    """Helper to create a RecurringExpense template with defaults."""
    today = date.today()
    defaults = {
        "user_id": user_id,
        "name": "Test Recurring",
        "amount": 5000,  # €50
        "category": "Bills",
        "frequency": "weekly",  # Use weekly to avoid day_of_month issues
        "start_date": today,
        "next_due_date": today,
        "is_active": True,
        "is_fixed_bill": False,
    }
    defaults.update(kwargs)
    template = RecurringExpense(**defaults)
    db.session.add(template)
    db.session.commit()
    return template


@pytest.fixture(scope="function")
def user_id(client, auth_headers):
    """Get the logged-in user's ID"""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200, f"Failed to get user: {response.json}"
    return response.json["id"]


class TestGenerateEndpoint:
    """Tests for POST /api/v1/recurring-generation/generate"""

    def test_generate_requires_auth(self, client):
        """Should require authentication"""
        response = client.post("/api/v1/recurring-generation/generate")
        assert response.status_code == 401

    def test_generate_dry_run(self, client, auth_headers, user_id):
        """Dry run should preview without creating expenses"""
        # Create a template due today
        create_recurring_template(user_id, next_due_date=date.today())

        response = client.post(
            "/api/v1/recurring-generation/generate?dry_run=true",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True
        assert "Would generate" in data["message"]

        # Verify no expenses were actually created
        expenses = Expense.query.filter_by(user_id=user_id).all()
        assert len(expenses) == 0

    def test_generate_creates_expenses(self, client, auth_headers, user_id):
        """Should generate actual expenses when not dry run"""
        # Create a template due today
        template = create_recurring_template(
            user_id,
            name="Monthly Bill",
            amount=10000,
            next_due_date=date.today(),
        )

        response = client.post(
            "/api/v1/recurring-generation/generate",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True
        assert "Generated" in data["message"]
        assert data["data"]["generated_count"] >= 1

        # Verify expense was created
        expenses = Expense.query.filter_by(user_id=user_id).all()
        assert len(expenses) >= 1
        assert any(e.name == "Monthly Bill" for e in expenses)

    def test_generate_uses_user_lookahead_setting(self, client, auth_headers, user_id):
        """Should use user's recurring_lookahead_days setting by default"""
        # Set user's lookahead to 7 days
        user = db.session.get(User, user_id)
        user.recurring_lookahead_days = 7
        db.session.commit()

        # Create template due in 5 days (within 7 day lookahead)
        create_recurring_template(
            user_id,
            next_due_date=date.today() + timedelta(days=5),
        )

        response = client.post(
            "/api/v1/recurring-generation/generate",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["using_user_setting"] is True
        assert data["days_ahead"] == 7

    def test_generate_with_custom_days_ahead(self, client, auth_headers, user_id):
        """Should allow overriding lookahead with days_ahead param"""
        user = db.session.get(User, user_id)
        user.recurring_lookahead_days = 7
        db.session.commit()

        response = client.post(
            "/api/v1/recurring-generation/generate?days_ahead=30",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["using_user_setting"] is False
        assert data["days_ahead"] == 30

    def test_generate_handles_no_templates(self, client, auth_headers):
        """Should handle case with no recurring templates gracefully"""
        response = client.post(
            "/api/v1/recurring-generation/generate",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True
        assert data["data"]["generated_count"] == 0


class TestGenerateAllEndpoint:
    """Tests for POST /api/v1/recurring-generation/generate/all"""

    def test_generate_all_requires_auth(self, client):
        """Should require authentication"""
        response = client.post("/api/v1/recurring-generation/generate/all")
        assert response.status_code == 401

    def test_generate_all_dry_run(self, client, auth_headers, user_id):
        """Dry run should preview without creating expenses"""
        create_recurring_template(user_id, next_due_date=date.today())

        response = client.post(
            "/api/v1/recurring-generation/generate/all?dry_run=true",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True
        assert "Would generate" in data["message"]

    def test_generate_all_with_days_ahead(self, client, auth_headers):
        """Should accept days_ahead parameter"""
        response = client.post(
            "/api/v1/recurring-generation/generate/all?days_ahead=90",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True


class TestPreviewEndpoint:
    """Tests for GET /api/v1/recurring-generation/preview"""

    def test_preview_requires_auth(self, client):
        """Should require authentication"""
        response = client.get("/api/v1/recurring-generation/preview")
        assert response.status_code == 401

    def test_preview_returns_upcoming(self, client, auth_headers, user_id):
        """Should return upcoming recurring expenses"""
        # Create template due in 5 days
        create_recurring_template(
            user_id,
            name="Upcoming Bill",
            next_due_date=date.today() + timedelta(days=5),
        )

        response = client.get(
            "/api/v1/recurring-generation/preview",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True
        assert "upcoming" in data
        # The upcoming list should contain our template
        assert len(data["upcoming"]) >= 1

    def test_preview_uses_user_lookahead(self, client, auth_headers, user_id):
        """Should use user's lookahead setting by default"""
        user = db.session.get(User, user_id)
        user.recurring_lookahead_days = 14
        db.session.commit()

        response = client.get(
            "/api/v1/recurring-generation/preview",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["using_user_setting"] is True
        assert data["days"] == 14

    def test_preview_with_custom_days(self, client, auth_headers):
        """Should allow overriding lookahead with days param"""
        response = client.get(
            "/api/v1/recurring-generation/preview?days=30",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["using_user_setting"] is False
        assert data["days"] == 30

    def test_preview_empty_when_no_upcoming(self, client, auth_headers, user_id):
        """Should return empty list when no templates are due soon"""
        # Create template due far in the future (beyond lookahead)
        create_recurring_template(
            user_id,
            next_due_date=date.today() + timedelta(days=100),
        )

        response = client.get(
            "/api/v1/recurring-generation/preview?days=7",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        assert data["success"] is True
        # Upcoming should be empty since template is beyond 7-day window
        assert len(data["upcoming"]) == 0

    def test_preview_filters_inactive_templates(self, client, auth_headers, user_id):
        """Should not include inactive templates in preview"""
        # Create inactive template
        create_recurring_template(
            user_id,
            name="Inactive Bill",
            next_due_date=date.today() + timedelta(days=1),
            is_active=False,
        )

        response = client.get(
            "/api/v1/recurring-generation/preview",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json
        # Inactive template should not appear
        assert all(
            item.get("name") != "Inactive Bill" for item in data.get("upcoming", [])
        )


class TestUserNotFound:
    """Edge case: user not found in database"""

    def test_generate_user_not_found(self, client, app):
        """Should return 404 if user not found"""
        # Create a token for a non-existent user
        from flask_jwt_extended import create_access_token

        with app.app_context():
            # User ID 99999 doesn't exist
            token = create_access_token(identity="99999")
            # Set cookie directly
            client.set_cookie("access_token_cookie", token)

        response = client.post("/api/v1/recurring-generation/generate")

        assert response.status_code == 404
        assert "User not found" in response.json["error"]

    def test_preview_user_not_found(self, client, app):
        """Should return 404 if user not found"""
        from flask_jwt_extended import create_access_token

        with app.app_context():
            token = create_access_token(identity="99999")
            client.set_cookie("access_token_cookie", token)

        response = client.get("/api/v1/recurring-generation/preview")

        assert response.status_code == 404
        assert "User not found" in response.json["error"]

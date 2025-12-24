"""
Bloom - Goals API Tests

Test savings goal CRUD operations and progress tracking.
"""

import pytest
from datetime import date, timedelta


class TestGoalsCRUD:
    """Test goal CRUD operations"""

    def test_create_goal_success(self, client, auth_headers):
        """Should create goal with valid data"""
        future_date = (date.today() + timedelta(days=90)).isoformat()

        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Emergency Fund",
                "target_amount": 100000,  # €1000
                "target_date": future_date,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["goal"]["name"] == "Emergency Fund"
        assert response.json["goal"]["target_amount"] == 100000
        # Goals are linked to subcategories via name, not ID
        assert "subcategory_name" in response.json["goal"]

    def test_create_goal_without_target_date(self, client, auth_headers):
        """Should create goal without target date"""
        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Vacation Fund",
                "target_amount": 50000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["goal"]["target_date"] is None

    def test_create_goal_missing_name(self, client, auth_headers):
        """Should reject goal without name"""
        response = client.post(
            "/api/v1/goals",
            json={
                "target_amount": 10000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "name" in response.json["error"].lower()

    def test_create_goal_missing_amount(self, client, auth_headers):
        """Should reject goal without target amount"""
        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Test Goal",
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "target_amount" in response.json["error"].lower()

    def test_create_goal_invalid_amount(self, client, auth_headers):
        """Should reject goal with zero or negative amount"""
        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Test Goal",
                "target_amount": 0,
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "amount" in response.json["error"].lower()

    def test_create_goal_past_target_date(self, client, auth_headers):
        """Should reject goal with past target date"""
        past_date = (date.today() - timedelta(days=30)).isoformat()

        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Test Goal",
                "target_amount": 10000,
                "target_date": past_date,
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "future" in response.json["error"].lower()

    def test_get_all_goals(self, client, auth_headers):
        """Should retrieve all user goals"""
        # Create multiple goals
        client.post(
            "/api/v1/goals",
            json={"name": "Goal 1", "target_amount": 10000},
            headers=auth_headers,
        )
        client.post(
            "/api/v1/goals",
            json={"name": "Goal 2", "target_amount": 20000},
            headers=auth_headers,
        )

        response = client.get("/api/v1/goals", headers=auth_headers)

        assert response.status_code == 200
        assert response.json["count"] >= 2
        assert len(response.json["goals"]) >= 2

    def test_get_single_goal_progress(self, client, auth_headers):
        """Should retrieve specific goal with progress via progress endpoint"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Test Goal", "target_amount": 10000},
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Use the progress endpoint (single goal endpoint is /goals/<id>/progress)
        response = client.get(f"/api/v1/goals/{goal_id}/progress", headers=auth_headers)

        assert response.status_code == 200
        assert response.json["goal"]["name"] == "Test Goal"
        assert "progress" in response.json

    def test_update_goal(self, client, auth_headers):
        """Should update goal successfully"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Original Name", "target_amount": 10000},
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Update goal
        response = client.put(
            f"/api/v1/goals/{goal_id}",
            json={"name": "Updated Name", "target_amount": 20000},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["goal"]["name"] == "Updated Name"
        assert response.json["goal"]["target_amount"] == 20000

    def test_delete_goal(self, client, auth_headers):
        """Should soft delete goal"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "To Delete", "target_amount": 10000},
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Delete goal
        response = client.delete(f"/api/v1/goals/{goal_id}", headers=auth_headers)

        assert response.status_code == 200

        # Verify goal no longer appears in list
        list_response = client.get("/api/v1/goals", headers=auth_headers)
        goal_ids = [g["id"] for g in list_response.json["goals"]]
        assert goal_id not in goal_ids


class TestGoalProgress:
    """Test goal progress tracking"""

    def test_goal_progress_with_contribution(self, client, auth_headers, salary_period):
        """Should track progress when expenses added to goal subcategory"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Savings Goal", "target_amount": 10000},
            headers=auth_headers,
        )
        goal = create_response.json["goal"]
        subcategory_id = goal.get("subcategory_id")

        # Get the subcategory name
        subcat_response = client.get("/api/v1/subcategories", headers=auth_headers)
        savings_subcats = subcat_response.json["subcategories"].get(
            "Savings & Investments", []
        )

        # Find our goal's subcategory
        goal_subcat = next(
            (s for s in savings_subcats if s["id"] == subcategory_id), None
        )

        if goal_subcat:
            # Add contribution to goal
            client.post(
                "/api/v1/expenses",
                json={
                    "name": "Savings contribution",
                    "amount": 5000,
                    "category": "Savings & Investments",
                    "subcategory": goal_subcat["name"],
                    "payment_method": "Debit card",
                    "date": "2025-11-25",
                },
                headers=auth_headers,
            )

            # Check progress
            response = client.get(f"/api/v1/goals/{goal['id']}", headers=auth_headers)

            assert response.status_code == 200
            progress = response.json["goal"]["progress"]
            assert progress["current_amount"] >= 5000
            assert progress["percentage"] >= 50

    def test_goal_progress_calculation(self, client, auth_headers):
        """Should calculate percentage correctly"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Test Progress", "target_amount": 10000},
            headers=auth_headers,
        )
        goal = create_response.json["goal"]

        # Initial progress should be 0 - check via progress endpoint
        response = client.get(
            f"/api/v1/goals/{goal['id']}/progress", headers=auth_headers
        )
        progress = response.json["progress"]

        assert progress["current_amount"] == 0
        assert progress["percentage"] == 0
        assert progress["remaining"] == 10000

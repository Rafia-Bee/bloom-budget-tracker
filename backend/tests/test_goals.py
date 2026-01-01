"""
Bloom - Goals API Tests

Test savings goal CRUD operations and progress tracking.
"""

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

    def test_create_goal_with_initial_amount(self, client, auth_headers):
        """Should create goal with pre-existing initial amount"""
        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Emergency Fund with Initial",
                "target_amount": 100000,
                "initial_amount": 25000,  # €250 already saved
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["goal"]["initial_amount"] == 25000
        # Progress should include initial amount
        assert response.json["goal"]["progress"]["current_amount"] == 25000
        assert response.json["goal"]["progress"]["percentage"] == 25.0

    def test_create_goal_initial_amount_exceeds_target(self, client, auth_headers):
        """Should reject goal with initial amount greater than target"""
        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Invalid Goal",
                "target_amount": 10000,
                "initial_amount": 20000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "initial amount" in response.json["error"].lower()

    def test_create_goal_negative_initial_amount(self, client, auth_headers):
        """Should reject goal with negative initial amount"""
        response = client.post(
            "/api/v1/goals",
            json={
                "name": "Invalid Goal",
                "target_amount": 10000,
                "initial_amount": -5000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "negative" in response.json["error"].lower()

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

    def test_update_goal_initial_amount(self, client, auth_headers):
        """Should update goal initial amount"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Update Initial Test", "target_amount": 10000},
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Update initial amount
        response = client.put(
            f"/api/v1/goals/{goal_id}",
            json={"initial_amount": 5000},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["goal"]["initial_amount"] == 5000
        assert response.json["goal"]["progress"]["current_amount"] == 5000

    def test_update_goal_initial_amount_exceeds_target(self, client, auth_headers):
        """Should reject update if initial amount exceeds target"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Update Initial Test", "target_amount": 10000},
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Try to update initial amount beyond target
        response = client.put(
            f"/api/v1/goals/{goal_id}",
            json={"initial_amount": 15000},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "exceed" in response.json["error"].lower()

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

    def test_goal_progress_with_initial_amount(self, client, auth_headers):
        """Should include initial amount in progress calculation"""
        # Create goal with initial amount
        create_response = client.post(
            "/api/v1/goals",
            json={
                "name": "Initial Amount Progress",
                "target_amount": 10000,
                "initial_amount": 3000,
            },
            headers=auth_headers,
        )
        goal = create_response.json["goal"]

        # Check progress includes initial amount
        response = client.get(
            f"/api/v1/goals/{goal['id']}/progress", headers=auth_headers
        )
        progress = response.json["progress"]

        assert progress["initial_amount"] == 3000
        assert progress["current_amount"] == 3000
        assert progress["percentage"] == 30.0
        assert progress["remaining"] == 7000


class TestGoalTransactions:
    """Test goal transaction history endpoint"""

    def test_get_goal_transactions_empty(self, client, auth_headers):
        """Should return empty transactions for new goal"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Empty Transactions Goal", "target_amount": 10000},
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Get transactions
        response = client.get(
            f"/api/v1/goals/{goal_id}/transactions", headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json["transactions"] == []
        assert response.json["pagination"]["total_count"] == 0
        assert response.json["summary"]["total_contributions"] == 0

    def test_get_goal_transactions_with_initial_amount(self, client, auth_headers):
        """Should include initial amount in transaction summary"""
        # Create goal with initial amount
        create_response = client.post(
            "/api/v1/goals",
            json={
                "name": "Initial Amount Transactions",
                "target_amount": 10000,
                "initial_amount": 2500,
            },
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Get transactions
        response = client.get(
            f"/api/v1/goals/{goal_id}/transactions", headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json["summary"]["initial_amount"] == 2500
        assert response.json["summary"]["current_amount"] == 2500

    def test_get_goal_transactions_pagination(self, client, auth_headers):
        """Should support pagination parameters"""
        # Create goal
        create_response = client.post(
            "/api/v1/goals",
            json={"name": "Pagination Test Goal", "target_amount": 100000},
            headers=auth_headers,
        )
        goal_id = create_response.json["goal"]["id"]

        # Get transactions with custom pagination
        response = client.get(
            f"/api/v1/goals/{goal_id}/transactions?page=1&per_page=5",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["pagination"]["page"] == 1
        assert response.json["pagination"]["per_page"] == 5


class TestGoalSoftDelete:
    """Tests for goal soft delete, restore, and deleted listing"""

    def test_delete_goal_soft_deletes(self, client, auth_headers):
        """DELETE should soft delete (set deleted_at) rather than hard delete"""
        from backend.models.database import db, Goal

        # Create goal
        create_resp = client.post(
            "/api/v1/goals",
            json={"name": "Soft Delete Test Goal", "target_amount": 100000},
            headers=auth_headers,
        )
        goal_id = create_resp.json["goal"]["id"]

        # Delete goal
        response = client.delete(f"/api/v1/goals/{goal_id}", headers=auth_headers)
        assert response.status_code == 200

        # Verify record still exists in DB but has deleted_at set
        goal = db.session.get(Goal, goal_id)
        assert goal is not None
        assert goal.deleted_at is not None
        assert goal.is_deleted is True

        # Verify not returned by active() query
        assert Goal.active().filter_by(id=goal_id).first() is None

    def test_get_deleted_goals(self, client, auth_headers):
        """GET /goals/deleted should return soft-deleted goals"""
        # Create and delete two goals
        for name in ["Deleted Goal 1", "Deleted Goal 2"]:
            create_resp = client.post(
                "/api/v1/goals",
                json={"name": name, "target_amount": 50000},
                headers=auth_headers,
            )
            client.delete(
                f"/api/v1/goals/{create_resp.json['goal']['id']}", headers=auth_headers
            )

        # Create one active goal
        client.post(
            "/api/v1/goals",
            json={"name": "Active Goal", "target_amount": 75000},
            headers=auth_headers,
        )

        # Get deleted goals
        response = client.get("/api/v1/goals/deleted", headers=auth_headers)
        assert response.status_code == 200
        deleted = response.json
        assert len(deleted) == 2
        assert all(g["deleted_at"] is not None for g in deleted)
        assert any(g["name"] == "Deleted Goal 1" for g in deleted)
        assert any(g["name"] == "Deleted Goal 2" for g in deleted)

    def test_restore_goal(self, client, auth_headers):
        """POST /goals/:id/restore should restore soft-deleted goal"""
        from backend.models.database import db, Goal

        # Create and delete goal
        create_resp = client.post(
            "/api/v1/goals",
            json={"name": "Restore Test Goal", "target_amount": 25000},
            headers=auth_headers,
        )
        goal_id = create_resp.json["goal"]["id"]
        client.delete(f"/api/v1/goals/{goal_id}", headers=auth_headers)

        # Verify it's not in active goals
        assert Goal.active().filter_by(id=goal_id).first() is None

        # Restore it
        restore_resp = client.post(
            f"/api/v1/goals/{goal_id}/restore", headers=auth_headers
        )
        assert restore_resp.status_code == 200
        assert "restored" in restore_resp.json["message"]

        # Verify deleted_at is cleared in DB
        goal = db.session.get(Goal, goal_id)
        assert goal.deleted_at is None
        assert goal.is_deleted is False

        # Verify it appears in GET /goals list
        list_resp = client.get("/api/v1/goals", headers=auth_headers)
        assert any(g["name"] == "Restore Test Goal" for g in list_resp.json["goals"])

    def test_restore_nonexistent_goal_returns_404(self, client, auth_headers):
        """POST /goals/:id/restore should return 404 for non-existent ID"""
        response = client.post("/api/v1/goals/99999/restore", headers=auth_headers)
        assert response.status_code == 404

    def test_restore_active_goal_returns_404(self, client, auth_headers):
        """POST /goals/:id/restore should return 404 for non-deleted goal"""
        # Create active goal (not deleted)
        create_resp = client.post(
            "/api/v1/goals",
            json={"name": "Active Goal", "target_amount": 10000},
            headers=auth_headers,
        )
        goal_id = create_resp.json["goal"]["id"]

        # Try to restore active goal
        response = client.post(f"/api/v1/goals/{goal_id}/restore", headers=auth_headers)
        assert response.status_code == 404

    def test_get_deleted_requires_auth(self, client):
        """GET /goals/deleted requires authentication"""
        response = client.get("/api/v1/goals/deleted")
        assert response.status_code == 401

    def test_restore_requires_auth(self, client):
        """POST /goals/:id/restore requires authentication"""
        response = client.post("/api/v1/goals/1/restore")
        assert response.status_code == 401

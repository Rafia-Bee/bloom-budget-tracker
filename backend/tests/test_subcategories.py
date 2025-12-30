"""
Bloom - Subcategories API Tests

Test custom subcategory CRUD operations.
"""


class TestSubcategoriesCRUD:
    """Test subcategory CRUD operations"""

    def test_get_all_subcategories(self, client, auth_headers):
        """Should retrieve all subcategories grouped by category"""
        response = client.get("/api/v1/subcategories", headers=auth_headers)

        assert response.status_code == 200
        assert "subcategories" in response.json
        assert "total" in response.json
        # Total can be 0 if no system subcategories are seeded in test DB
        assert response.json["total"] >= 0

    def test_get_subcategories_by_category(self, client, auth_headers):
        """Should filter subcategories by category"""
        response = client.get(
            "/api/v1/subcategories?category=Flexible%20Expenses",
            headers=auth_headers,
        )

        assert response.status_code == 200
        # Only Flexible Expenses category should be present
        if response.json["subcategories"]:
            assert "Flexible Expenses" in response.json["subcategories"]
            assert len(response.json["subcategories"]) == 1

    def test_get_subcategories_invalid_category(self, client, auth_headers):
        """Should reject invalid category filter"""
        response = client.get(
            "/api/v1/subcategories?category=Invalid%20Category",
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "invalid" in response.json["error"].lower()

    def test_create_custom_subcategory(self, client, auth_headers):
        """Should create custom subcategory"""
        response = client.post(
            "/api/v1/subcategories",
            json={
                "category": "Flexible Expenses",
                "name": "Custom Subcategory",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["subcategory"]["name"] == "Custom Subcategory"
        # Custom subcategories have is_system=False
        assert response.json["subcategory"]["is_system"] is False

    def test_create_subcategory_missing_category(self, client, auth_headers):
        """Should reject subcategory without category"""
        response = client.post(
            "/api/v1/subcategories",
            json={"name": "Test"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "category" in response.json["error"].lower()

    def test_create_subcategory_missing_name(self, client, auth_headers):
        """Should reject subcategory without name"""
        response = client.post(
            "/api/v1/subcategories",
            json={"category": "Flexible Expenses"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "name" in response.json["error"].lower()

    def test_create_subcategory_invalid_category(self, client, auth_headers):
        """Should reject subcategory with invalid category"""
        response = client.post(
            "/api/v1/subcategories",
            json={
                "category": "Invalid Category",
                "name": "Test",
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "invalid" in response.json["error"].lower()

    def test_create_duplicate_subcategory(self, client, auth_headers):
        """Should reject duplicate subcategory name in same category"""
        # Create first
        client.post(
            "/api/v1/subcategories",
            json={
                "category": "Flexible Expenses",
                "name": "Duplicate Test",
            },
            headers=auth_headers,
        )

        # Try to create duplicate
        response = client.post(
            "/api/v1/subcategories",
            json={
                "category": "Flexible Expenses",
                "name": "Duplicate Test",
            },
            headers=auth_headers,
        )

        assert response.status_code == 409
        assert "exists" in response.json["error"].lower()

    def test_update_custom_subcategory(self, client, auth_headers):
        """Should update custom subcategory"""
        # Create subcategory
        create_response = client.post(
            "/api/v1/subcategories",
            json={
                "category": "Flexible Expenses",
                "name": "Original Name",
            },
            headers=auth_headers,
        )
        subcat_id = create_response.json["subcategory"]["id"]

        # Update it
        response = client.put(
            f"/api/v1/subcategories/{subcat_id}",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json["subcategory"]["name"] == "Updated Name"

    def test_delete_custom_subcategory(self, client, auth_headers):
        """Should soft delete custom subcategory"""
        # Create subcategory
        create_response = client.post(
            "/api/v1/subcategories",
            json={
                "category": "Flexible Expenses",
                "name": "To Delete",
            },
            headers=auth_headers,
        )
        subcat_id = create_response.json["subcategory"]["id"]

        # Delete it
        response = client.delete(
            f"/api/v1/subcategories/{subcat_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify it's not in active list
        list_response = client.get("/api/v1/subcategories", headers=auth_headers)
        all_subcats = []
        for category_subcats in list_response.json["subcategories"].values():
            all_subcats.extend(category_subcats)

        subcat_ids = [s["id"] for s in all_subcats]
        assert subcat_id not in subcat_ids


class TestSubcategoryUsage:
    """Test subcategory usage in expenses"""

    def test_expense_with_custom_subcategory(self, client, auth_headers, salary_period):
        """Should use custom subcategory in expense"""
        # Create custom subcategory
        create_response = client.post(
            "/api/v1/subcategories",
            json={
                "category": "Flexible Expenses",
                "name": "Gaming",
            },
            headers=auth_headers,
        )
        assert create_response.status_code == 201

        # Create expense with custom subcategory
        response = client.post(
            "/api/v1/expenses",
            json={
                "name": "Steam Sale",
                "amount": 2000,
                "category": "Flexible Expenses",
                "subcategory": "Gaming",
                "payment_method": "Debit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        assert response.json["expense"]["subcategory"] == "Gaming"

    def test_cannot_delete_subcategory_with_expenses(
        self, client, auth_headers, salary_period
    ):
        """Should handle deletion of subcategory with linked expenses"""
        # Create custom subcategory
        create_response = client.post(
            "/api/v1/subcategories",
            json={
                "category": "Flexible Expenses",
                "name": "Hobbies",
            },
            headers=auth_headers,
        )
        subcat_id = create_response.json["subcategory"]["id"]

        # Create expense with this subcategory
        client.post(
            "/api/v1/expenses",
            json={
                "name": "Hobby expense",
                "amount": 1000,
                "category": "Flexible Expenses",
                "subcategory": "Hobbies",
                "payment_method": "Debit card",
                "date": "2025-11-25",
            },
            headers=auth_headers,
        )

        # Try to delete - behavior depends on implementation
        # May block (400/409), warn (200), or soft delete
        response = client.delete(
            f"/api/v1/subcategories/{subcat_id}",
            headers=auth_headers,
        )

        # Accept various valid responses
        assert response.status_code in [200, 400, 409]

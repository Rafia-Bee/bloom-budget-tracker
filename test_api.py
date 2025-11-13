"""
Simple script to test Bloom API endpoints.
Tests authentication and expense CRUD operations.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_root():
    """Test root endpoint."""
    print("\n=== Testing Root Endpoint ===")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 200

def test_register():
    """Test user registration."""
    print("\n=== Testing User Registration ===")
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 201

def test_login():
    """Test user login and get access token."""
    print("\n=== Testing User Login ===")
    data = {
        "email": "test@example.com",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")

    if response.status_code == 200:
        return result.get("access_token")
    return None

def test_me(token):
    """Test getting current user info."""
    print("\n=== Testing Get Current User ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_create_expense(token):
    """Test creating an expense."""
    print("\n=== Testing Create Expense ===")
    data = {
        "name": "Wolt",
        "amount": 1550,  # €15.50
        "category": "Flexible Expenses",
        "subcategory": "Food",
        "payment_method": "Credit card"
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/expenses", json=data, headers=headers)
    print(f"Status: {response.status_code}")

    if response.status_code != 201:
        print(f"Error: {response.text}")
        return None

    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")

    if response.status_code == 201:
        return result.get("expense", {}).get("id")
    return None

def test_get_expenses(token):
    """Test getting all expenses."""
    print("\n=== Testing Get All Expenses ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/expenses", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_update_expense(token, expense_id):
    """Test updating an expense."""
    print("\n=== Testing Update Expense ===")
    data = {
        "amount": 2000,  # Update to €20.00
        "notes": "Updated amount"
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(f"{BASE_URL}/expenses/{expense_id}", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_delete_expense(token, expense_id):
    """Test deleting an expense."""
    print("\n=== Testing Delete Expense ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(f"{BASE_URL}/expenses/{expense_id}", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def main():
    """Run all tests."""
    print("=" * 50)
    print("BLOOM API TESTS")
    print("=" * 50)

    results = []

    # Test root endpoint
    results.append(("Root endpoint", test_root()))

    # Test registration
    results.append(("User registration", test_register()))

    # Test login
    token = test_login()
    if token:
        results.append(("User login", True))

        # Test authenticated endpoints
        results.append(("Get current user", test_me(token)))

        expense_id = test_create_expense(token)
        if expense_id:
            results.append(("Create expense", True))
            results.append(("Get expenses", test_get_expenses(token)))
            results.append(("Update expense", test_update_expense(token, expense_id)))
            results.append(("Delete expense", test_delete_expense(token, expense_id)))
        else:
            results.append(("Create expense", False))
    else:
        results.append(("User login", False))

    # Print summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {test_name}")

    passed = sum(1 for _, p in results if p)
    total = len(results)
    print(f"\nPassed: {passed}/{total}")

if __name__ == "__main__":
    main()

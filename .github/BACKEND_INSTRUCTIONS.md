# Backend Development Instructions

Guidelines for working with the Bloom Budget Tracker Flask backend.

---

## 🏗️ Architecture Overview

```
backend/
├── app.py              # Flask app factory
├── config.py           # Environment configurations
├── models/
│   └── database.py     # SQLAlchemy models (all in one file)
├── routes/             # API endpoint handlers
├── services/           # Business logic
├── utils/              # Rate limiter, validators
└── tests/              # pytest test suite
```

### Technology Stack

-   **Framework:** Flask with Blueprints
-   **ORM:** SQLAlchemy with Flask-SQLAlchemy
-   **Auth:** Flask-JWT-Extended (HttpOnly cookies)
-   **Testing:** pytest with coverage

---

## 💰 Money Handling

**CRITICAL: All amounts are stored as INTEGER CENTS, not floats.**

```python
# Correct: Store €15.00 as 1500
expense.amount = 1500

# Wrong: Never use floats
expense.amount = 15.00  # ❌ NEVER DO THIS
```

### Conversion Helpers

```python
# Convert user input (euros) to cents for storage
cents = int(float(user_input) * 100)

# Convert cents to euros for display (rarely needed in backend)
euros = amount / 100
```

---

## 📁 File Organization

### Routes Structure

Each route file handles one domain:

| File                      | Purpose                      | Prefix               |
| ------------------------- | ---------------------------- | -------------------- |
| `auth.py`                 | Login, register, tokens      | `/auth`              |
| `expenses.py`             | Expense CRUD, soft delete    | `/expenses`          |
| `income.py`               | Income CRUD                  | `/income`            |
| `salary_periods.py`       | Salary period management     | `/salary-periods`    |
| `budget_periods.py`       | Budget period queries        | `/budget-periods`    |
| `recurring_expenses.py`   | Recurring templates          | `/recurring`         |
| `recurring_generation.py` | Generate recurring instances | `/recurring`         |
| `debts.py`                | Debt tracking                | `/debts`             |
| `goals.py`                | Savings goals                | `/goals`             |
| `export_import.py`        | Data export/import           | `/export`, `/import` |

### Services

Services contain business logic that:

-   Is reused across multiple routes
-   Involves complex calculations
-   Requires database transactions

```python
# services/budget_service.py - Balance calculations
# services/balance_service.py - Period balance queries
# services/email_service.py - SendGrid email sending
```

---

## 🗄️ Database Models

All models are defined in `backend/models/database.py`.

### Key Models

```python
class User          # Authentication, preferences
class SalaryPeriod  # 4-week parent period
class BudgetPeriod  # Weekly child period (auto-created)
class Expense       # Transactions (linked to BudgetPeriod)
class Income        # Income entries (linked to BudgetPeriod)
class Debt          # Debt tracking
class Goal          # Savings goals
class RecurringExpense  # Expense templates
class Subcategory   # User-defined categories
```

### Period Relationships

```
SalaryPeriod (1) ──< BudgetPeriod (4)
     │                    │
     └── user_id          ├── expenses
                          └── income
```

**NEVER create BudgetPeriods manually** - they are auto-created when a SalaryPeriod is created.

---

## 🔐 Authentication

### JWT Cookie-Based Auth

```python
from flask_jwt_extended import jwt_required, get_jwt_identity

@bp.route('/protected')
@jwt_required()
def protected_route():
    user_id = get_jwt_identity()
    # user_id is an integer
```

### User Ownership

**Always filter by user_id** to prevent data leaks:

```python
# Correct: Filter by current user
expenses = Expense.query.filter_by(
    user_id=user_id,
    is_deleted=False
).all()

# Wrong: No user filter (exposes all users' data!)
expenses = Expense.query.all()  # ❌ NEVER DO THIS
```

---

## 📝 Creating New Routes

### Blueprint Pattern

```python
# routes/my_feature.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models.database import db, MyModel

bp = Blueprint('my_feature', __name__, url_prefix='/my-feature')

@bp.route('', methods=['GET'])
@jwt_required()
def get_all():
    user_id = get_jwt_identity()
    items = MyModel.query.filter_by(user_id=user_id).all()
    return jsonify([item.to_dict() for item in items])

@bp.route('', methods=['POST'])
@jwt_required()
def create():
    user_id = get_jwt_identity()
    data = request.get_json()

    # Validate input
    if not data.get('name'):
        return jsonify({'error': 'Name required'}), 400

    item = MyModel(
        user_id=user_id,
        name=data['name'],
        amount=int(data.get('amount', 0))  # Always convert to cents
    )
    db.session.add(item)
    db.session.commit()

    return jsonify(item.to_dict()), 201
```

### Register Blueprint

```python
# In app.py create_app()
from backend.routes import my_feature
app.register_blueprint(my_feature.bp, url_prefix='/api/v1/my-feature')
```

---

## ✅ Testing

### Running Tests

```powershell
# Quick command (from project root)
btest b

# Or manually:
.\.venv\Scripts\Activate.ps1
pytest backend/tests/ -v
```

### Test Structure

```python
# backend/tests/test_my_feature.py
import pytest

class TestMyFeature:
    def test_create_success(self, client, auth_headers):
        response = client.post(
            '/api/v1/my-feature',
            json={'name': 'Test', 'amount': 1500},
            headers=auth_headers
        )
        assert response.status_code == 201
        assert response.json['amount'] == 1500

    def test_requires_auth(self, client):
        response = client.post('/api/v1/my-feature', json={})
        assert response.status_code == 401
```

### Key Fixtures (from conftest.py)

-   `app` - Flask test app (uses in-memory SQLite)
-   `client` - Test client for API calls
-   `auth_headers` - Headers with valid JWT for authenticated requests
-   `salary_period` - Pre-created salary period

---

## 🚨 Common Pitfalls

### 1. Forgetting User Filtering

```python
# ❌ Wrong: Returns all users' data
Expense.query.filter_by(is_deleted=False).all()

# ✅ Correct: Filter by user
Expense.query.filter_by(user_id=user_id, is_deleted=False).all()
```

### 2. Float Money Values

```python
# ❌ Wrong: Float precision errors
amount = 15.99

# ✅ Correct: Integer cents
amount = 1599
```

### 3. Manual BudgetPeriod Creation

```python
# ❌ Wrong: Creating BudgetPeriod directly
budget_period = BudgetPeriod(...)

# ✅ Correct: Create SalaryPeriod, periods auto-generate
salary_period = SalaryPeriod(...)  # Creates 4 BudgetPeriods
```

### 4. Missing Commit

```python
# ❌ Wrong: Forgot commit
db.session.add(item)
return jsonify(item.to_dict())  # item.id is None!

# ✅ Correct: Commit before response
db.session.add(item)
db.session.commit()
return jsonify(item.to_dict())
```

---

## 🔄 API Response Patterns

### Success Responses

```python
# Single item
return jsonify(item.to_dict()), 200  # GET
return jsonify(item.to_dict()), 201  # POST (created)

# List
return jsonify([item.to_dict() for item in items])

# Message
return jsonify({'message': 'Deleted successfully'})
```

### Error Responses

```python
# Validation error
return jsonify({'error': 'Name is required'}), 400

# Not found
return jsonify({'error': 'Item not found'}), 404

# Unauthorized
return jsonify({'error': 'Access denied'}), 403
```

---

## 📊 Balance Calculation Reference

### Mode: Sync (Cumulative)

Carryover accumulates across weeks within a salary period.

```python
# Week 1: Budget €100, Spent €80 → Remaining €20
# Week 2: Budget €100 + €20 carryover = €120 available
```

### Mode: Budget (Isolated)

Each week is independent, no carryover.

```python
# Week 1: Budget €100, Spent €80 → Remaining €20 (not carried)
# Week 2: Budget €100 (fresh start)
```

See `services/budget_service.py` for implementation.

---

## 📚 Related Documentation

-   [API.md](../docs/API.md) - Full API endpoint reference
-   [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
-   [TESTING.md](../docs/TESTING.md) - Testing guide
-   [SECURITY.md](../docs/SECURITY.md) - Security guidelines

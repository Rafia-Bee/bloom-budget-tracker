# Bloom API Documentation

**Base URL:** `https://bloom-backend-b44r.onrender.com/api/v1`

**Version:** v1

All endpoints require JWT authentication unless otherwise specified.

---

## Table of Contents

- [Authentication](#authentication)
- [Expenses](#expenses)
- [Income](#income)
- [Debts](#debts)
- [Budget Periods](#budget-periods)
- [Salary Periods](#salary-periods)
- [Recurring Expenses](#recurring-expenses)
- [Import/Export](#importexport)
- [Error Responses](#error-responses)

---

## Authentication

### Register

Create a new user account.

**Endpoint:** `POST /auth/register`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "message": "User created successfully",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Login

Authenticate and receive JWT tokens.

**Endpoint:** `POST /auth/login`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### Refresh Token

Get a new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Authentication:** Refresh token required

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User

Get information about the authenticated user.

**Endpoint:** `GET /auth/me`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2025-12-02T12:00:00"
}
```

### Password Reset

Request a password reset email.

**Endpoint:** `POST /auth/password-reset/request`

**Authentication:** None required

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Reset Password:**

**Endpoint:** `POST /auth/password-reset/reset`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "newsecurepassword123"
}
```

---

## Expenses

### Get All Expenses

Retrieve expenses with optional filtering and pagination.

**Endpoint:** `GET /expenses`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 50) - Items per page
- `budget_period_id` (integer) - Filter by budget period
- `category` (string) - Filter by category
- `subcategory` (string) - Filter by subcategory
- `payment_method` (string) - "debit" or "credit"
- `start_date` (string) - YYYY-MM-DD format
- `end_date` (string) - YYYY-MM-DD format
- `min_amount` (number) - Minimum amount in cents
- `max_amount` (number) - Maximum amount in cents
- `search` (string) - Search in name/notes

**Response:** `200 OK`
```json
{
  "expenses": [
    {
      "id": 1,
      "name": "Groceries",
      "amount": 5000,
      "category": "Flexible Expenses",
      "subcategory": "Food",
      "payment_method": "debit",
      "date": "2025-12-02",
      "notes": "Weekly shopping",
      "budget_period_id": 1,
      "recurring_expense_id": null,
      "is_debt_payment": false,
      "debt_id": null,
      "created_at": "2025-12-02T12:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

### Create Expense

Create a new expense.

**Endpoint:** `POST /expenses`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Groceries",
  "amount": 5000,
  "category": "Flexible Expenses",
  "subcategory": "Food",
  "payment_method": "debit",
  "date": "2025-12-02",
  "notes": "Weekly shopping",
  "budget_period_id": 1,
  "is_debt_payment": false,
  "debt_id": null
}
```

**Response:** `201 Created`
```json
{
  "message": "Expense created successfully",
  "expense": { /* expense object */ }
}
```

### Update Expense

Update an existing expense.

**Endpoint:** `PUT /expenses/<id>`

**Authentication:** Required

**Request Body:** Same as Create Expense

**Response:** `200 OK`
```json
{
  "message": "Expense updated successfully",
  "expense": { /* updated expense object */ }
}
```

### Delete Expense

Delete an expense.

**Endpoint:** `DELETE /expenses/<id>`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Expense deleted successfully"
}
```

---

## Income

### Get All Income

Retrieve all income transactions.

**Endpoint:** `GET /income`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `type` (string) - "Salary", "Side Hustle", "Gift", "Other"
- `start_date` (string) - YYYY-MM-DD
- `end_date` (string) - YYYY-MM-DD

**Response:** `200 OK`
```json
{
  "income": [
    {
      "id": 1,
      "source": "Monthly Salary",
      "amount": 250000,
      "type": "Salary",
      "date": "2025-12-20",
      "notes": "",
      "created_at": "2025-12-02T12:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "pages": 1
  }
}
```

### Create Income

**Endpoint:** `POST /income`

**Authentication:** Required

**Request Body:**
```json
{
  "source": "Monthly Salary",
  "amount": 250000,
  "type": "Salary",
  "date": "2025-12-20",
  "notes": ""
}
```

**Response:** `201 Created`

### Update Income

**Endpoint:** `PUT /income/<id>`

**Authentication:** Required

### Delete Income

**Endpoint:** `DELETE /income/<id>`

**Authentication:** Required

---

## Debts

### Get All Debts

Retrieve all debts including archived.

**Endpoint:** `GET /debts`

**Authentication:** Required

**Query Parameters:**
- `active_only` (boolean, default: false) - Show only active debts

**Response:** `200 OK`
```json
{
  "debts": [
    {
      "id": 1,
      "name": "Student Loan",
      "total_amount": 1000000,
      "remaining_balance": 500000,
      "monthly_payment": 25000,
      "interest_rate": 5.5,
      "due_date": 15,
      "priority": 1,
      "is_archived": false,
      "created_at": "2025-01-01T00:00:00"
    }
  ]
}
```

### Create Debt

**Endpoint:** `POST /debts`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Student Loan",
  "total_amount": 1000000,
  "remaining_balance": 1000000,
  "monthly_payment": 25000,
  "interest_rate": 5.5,
  "due_date": 15,
  "priority": 1,
  "notes": "Federal student loan"
}
```

**Response:** `201 Created`

### Update Debt

**Endpoint:** `PUT /debts/<id>`

**Authentication:** Required

### Delete Debt

**Endpoint:** `DELETE /debts/<id>`

**Authentication:** Required

### Record Debt Payment

**Endpoint:** `POST /debts/<id>/payment`

**Authentication:** Required

**Request Body:**
```json
{
  "amount": 25000,
  "payment_method": "debit",
  "date": "2025-12-02"
}
```

**Response:** `201 Created`

---

## Budget Periods

### Get All Budget Periods

Retrieve all weekly/custom budget periods.

**Endpoint:** `GET /budget-periods`

**Authentication:** Required

**Query Parameters:**
- `salary_period_id` (integer) - Filter by salary period
- `active_only` (boolean) - Current period only

**Response:** `200 OK`
```json
{
  "periods": [
    {
      "id": 1,
      "period_type": "weekly",
      "start_date": "2025-12-02",
      "end_date": "2025-12-08",
      "budget_amount": 15000,
      "week_number": 1,
      "salary_period_id": 1,
      "created_at": "2025-12-02T00:00:00"
    }
  ]
}
```

### Create Budget Period

**Endpoint:** `POST /budget-periods`

**Authentication:** Required

**Request Body:**
```json
{
  "period_type": "weekly",
  "start_date": "2025-12-02",
  "end_date": "2025-12-08",
  "budget_amount": 15000,
  "salary_period_id": 1
}
```

**Response:** `201 Created`

---

## Salary Periods

### Get All Salary Periods

Retrieve all monthly salary periods with 4-week budgets.

**Endpoint:** `GET /salary-periods`

**Authentication:** Required

**Query Parameters:**
- `active_only` (boolean) - Current period only

**Response:** `200 OK`
```json
{
  "salary_periods": [
    {
      "period_id": 1,
      "start_date": "2025-11-20",
      "end_date": "2025-12-19",
      "starting_debit_balance": 100000,
      "starting_credit_balance": 50000,
      "credit_budget_allowance": 150000,
      "total_budget_amount": 250000,
      "weekly_budget": 62500,
      "weekly_debit_budget": 25000,
      "weekly_credit_budget": 37500,
      "is_active": true,
      "weeks": [
        {
          "id": 1,
          "week_number": 1,
          "start_date": "2025-11-20",
          "end_date": "2025-11-26",
          "budget_amount": 62500
        }
      ]
    }
  ]
}
```

### Get Current Salary Period

Get the currently active salary period with spending details.

**Endpoint:** `GET /salary-periods/current`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "salary_period": { /* full salary period object */ },
  "current_week": {
    "id": 1,
    "week_number": 1,
    "budget_amount": 62500,
    "spent": 15000,
    "remaining": 47500
  },
  "weeks": [ /* all weeks with spending */ ]
}
```

### Create Salary Period

**Endpoint:** `POST /salary-periods`

**Authentication:** Required

**Request Body:**
```json
{
  "start_date": "2025-12-20",
  "end_date": "2026-01-19",
  "starting_debit_balance": 100000,
  "starting_credit_balance": 50000,
  "credit_limit": 150000,
  "total_budget_amount": 250000
}
```

**Response:** `201 Created`

### Preview Salary Period

Preview 4-week budget breakdown before creation.

**Endpoint:** `POST /salary-periods/preview`

**Authentication:** Required

**Request Body:** Same as Create Salary Period

**Response:** `200 OK`
```json
{
  "preview": {
    "total_budget": 250000,
    "weekly_budget": 62500,
    "weeks": [
      {
        "week": 1,
        "start_date": "2025-12-20",
        "end_date": "2025-12-26",
        "budget": 62500
      }
    ]
  }
}
```

---

## Recurring Expenses

### Get All Recurring Expenses

**Endpoint:** `GET /recurring-expenses`

**Authentication:** Required

**Query Parameters:**
- `active_only` (boolean) - Exclude paused templates

**Response:** `200 OK`
```json
{
  "recurring_expenses": [
    {
      "id": 1,
      "name": "Netflix",
      "amount": 1999,
      "category": "Fixed Expenses",
      "subcategory": "Entertainment",
      "payment_method": "credit",
      "frequency": "monthly",
      "interval": 1,
      "start_date": "2025-01-01",
      "end_date": null,
      "day_of_month": 1,
      "day_of_week": null,
      "is_paused": false,
      "notes": "Streaming subscription"
    }
  ]
}
```

### Create Recurring Expense

**Endpoint:** `POST /recurring-expenses`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Netflix",
  "amount": 1999,
  "category": "Fixed Expenses",
  "subcategory": "Entertainment",
  "payment_method": "credit",
  "frequency": "monthly",
  "interval": 1,
  "start_date": "2025-01-01",
  "day_of_month": 1,
  "notes": "Streaming subscription"
}
```

**Frequency Options:**
- `weekly` - Requires `day_of_week` (0-6, Monday=0)
- `biweekly` - Requires `day_of_week`
- `monthly` - Requires `day_of_month` (1-31)
- `custom` - Requires `interval` (number of days)

**Response:** `201 Created`

### Generate Recurring Expenses

Generate expenses from recurring templates for next 60 days.

**Endpoint:** `POST /recurring-generation/generate`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Recurring expenses generated successfully",
  "generated_count": 12,
  "period": "Next 60 days"
}
```

---

## Import/Export

### Export Data

Export all user data in JSON format.

**Endpoint:** `GET /export`

**Authentication:** Required

**Query Parameters:**
- `include_expenses` (boolean, default: true)
- `include_income` (boolean, default: true)
- `include_debts` (boolean, default: true)
- `include_recurring` (boolean, default: true)

**Response:** `200 OK`
```json
{
  "user": {
    "email": "user@example.com",
    "export_date": "2025-12-02T12:00:00"
  },
  "expenses": [ /* all expenses */ ],
  "income": [ /* all income */ ],
  "debts": [ /* all debts */ ],
  "recurring_expenses": [ /* all templates */ ]
}
```

### Import Data

Import data from JSON file.

**Endpoint:** `POST /import`

**Authentication:** Required

**Request Body:**
```json
{
  "expenses": [ /* expense objects */ ],
  "income": [ /* income objects */ ],
  "debts": [ /* debt objects */ ],
  "recurring_expenses": [ /* template objects */ ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Import successful",
  "imported": {
    "expenses": 50,
    "income": 12,
    "debts": 3,
    "recurring_expenses": 8
  },
  "skipped": {
    "duplicates": 2
  }
}
```

### Import Bank CSV

Import transactions from bank CSV file.

**Endpoint:** `POST /import/bank-csv`

**Authentication:** Required

**Request:** `multipart/form-data`
- `file` - CSV file
- `bank` - "nordea", "op", or "generic"
- `default_category` - Category for imported items

**Response:** `200 OK`
```json
{
  "message": "Import successful",
  "imported": 45,
  "duplicates_skipped": 3,
  "transactions": [ /* imported expense objects */ ]
}
```

---

## Error Responses

All endpoints return consistent error responses.

### 400 Bad Request
```json
{
  "error": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Resource already exists"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "An error occurred. Please try again."
}
```

---

## Rate Limiting

Rate limits are enforced on authentication endpoints:

- **Register:** 3 requests per hour
- **Login:** 5 requests per minute
- **Password Reset:** 3 requests per hour

---

## Amount Format

All monetary amounts are stored and returned in **cents** (integers).

**Examples:**
- €50.00 = `5000`
- €1,234.56 = `123456`
- €0.99 = `99`

---

## Date Format

All dates use **ISO 8601** format: `YYYY-MM-DD`

**Examples:**
- `2025-12-02`
- `2025-01-15`

---

## Authentication Headers

Include JWT access token in all authenticated requests:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Token Expiration:**
- Access tokens: 24 hours
- Refresh tokens: 30 days

---

## Pagination

Paginated endpoints return:

```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

## Versioning

Current API version: **v1**

All endpoints are prefixed with `/api/v1/`

Legacy endpoints (without version prefix) are deprecated and will be removed in v2.0.

---

## Support

For API questions or issues:
- Email: support@bloom-tracker.app
- GitHub: [bloom-budget-tracker](https://github.com/Rafia-Bee/bloom-budget-tracker)

---

**Last Updated:** December 2, 2025

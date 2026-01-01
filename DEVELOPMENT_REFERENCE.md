# Bloom Budget Tracker - Development Reference

**Last Updated:** December 24, 2025

Internal reference for AI assistants and developers. For user-facing documentation, see [README.md](README.md).

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Security](#security)
7. [Deployment](#deployment)
8. [Development Workflow](#development-workflow)
9. [Feature Notes](#feature-notes)

---

## Project Overview

**Bloom Budget Tracker** - Balance-based budget tracker with configurable sub-period planning.

### Core Concepts

-   **Balance-Based Budgeting**: Enter current balances (not income) for realistic planning
-   **Flexible Sub-Periods**: Divide budget into 1 to N periods (default 4 weekly periods)
-   **Smart Carryover**: Overspend Period 1 → Period 2's budget adjusts
-   **On-Demand Recurring**: Preview and confirm scheduled expenses (user-controlled)

### Live Deployment

| Component | URL                                     | Platform         |
| --------- | --------------------------------------- | ---------------- |
| Frontend  | https://bloom-tracker.app               | Cloudflare Pages |
| Backend   | https://bloom-backend-b44r.onrender.com | Render           |
| Database  | Neon PostgreSQL                         | AWS EU-Central-1 |

---

## Architecture

### High-Level Overview

```
Frontend (React + Vite)  ←→  Backend (Flask)  ←→  Database (PostgreSQL)
        ↓                          ↓
   Cloudflare Pages            Render
```

### Two-Tier Period System (Critical)

```
SalaryPeriod (configurable parent)
├── initial_debit_balance
├── initial_credit_balance
├── credit_limit
├── num_sub_periods (default: 4)
├── weekly_budget (calculated: total / num_sub_periods)
└── BudgetPeriod × N (auto-created based on num_sub_periods)
    ├── Period 1
    ├── Period 2
    ├── ...
    └── Period N
```

-   **SalaryPeriod**: User-facing, created via wizard
-   **BudgetPeriod**: Internal implementation, never created manually
-   **num_sub_periods**: Configurable 1 to total_days (experimental feature flag)
-   Expenses/income assigned to periods by date

### Money Convention

**All amounts stored as integer cents:**

-   Database: `1500` = €15.00
-   Frontend: `formatCurrency(1500)` → "€15.00"
-   API: Always cents, never euros

---

## Database Schema

### Core Models

```python
# User
id, email, password_hash, failed_login_attempts, locked_until, recurring_lookahead_days

# SalaryPeriod (4-week parent)
id, user_id, initial_debit_balance, initial_credit_balance, credit_limit,
credit_budget_allowance, weekly_budget, start_date, end_date, is_active

# BudgetPeriod (week)
id, user_id, salary_period_id, week_number (1-4), budget_amount, start_date, end_date

# Expense
id, user_id, budget_period_id, recurring_template_id, name, amount,
category, subcategory, date, payment_method, is_fixed_bill

# Income
id, user_id, budget_period_id, type, amount, scheduled_date, actual_date

# Debt
id, user_id, name, original_amount, current_balance, monthly_payment, archived

# RecurringExpense (template)
id, user_id, name, amount, category, frequency, next_due_date, is_active, is_fixed_bill

# Goal
id, user_id, name, target_amount, current_amount, target_date, category, subcategory

# Subcategory (custom user categories)
id, user_id, parent_category, name, is_active, is_default
```

### Key Indexes

-   `idx_budget_period_active` on (user_id, start_date, end_date)
-   `idx_expense_user_date_fixed` on (user_id, date, is_fixed_bill)
-   `idx_expense_user_category` on (user_id, category)

---

## Backend

### Project Structure

```
backend/
├── app.py              # Flask app factory
├── config.py           # Environment configs
├── models/
│   └── database.py     # All SQLAlchemy models
├── routes/
│   ├── auth.py         # Login, register, refresh
│   ├── expenses.py     # Expense CRUD
│   ├── income.py       # Income CRUD
│   ├── salary_periods.py   # Period management + carryover
│   ├── debts.py        # Debt tracking
│   ├── recurring_expenses.py  # Templates
│   ├── goals.py        # Savings goals
│   ├── subcategories.py    # Custom categories
│   ├── user_data.py    # Settings, lookahead config
│   └── export_import.py    # Data export/import
├── services/
│   ├── balance_service.py  # Balance calculations
│   └── email_service.py    # SendGrid wrapper
└── utils/
    ├── rate_limiter.py
    └── recurring_generator.py
```

### Key Patterns

**Auth**: JWT in HttpOnly cookies (24-hour expiry for offline PWA)

**Rate Limiting**:

```python
RATE_LIMITS = {
    'auth.login': (50, 300),      # 50 per 5 min
    'auth.register': (10, 3600),  # 10 per hour
    'password_reset': (3, 3600),  # 3 per hour
}
```

**API Versioning**: All routes at `/api/v1/*`

---

## Frontend

### Project Structure

```
frontend/src/
├── App.jsx             # Router + auth wrapper
├── api.js              # Axios instance + API calls
├── pages/
│   ├── Dashboard.jsx   # Main budget view
│   ├── Debts.jsx       # Debt management
│   ├── Goals.jsx       # Savings goals
│   ├── Settings.jsx    # Subcategories, preferences, export
│   ├── RecurringExpenses.jsx  # Templates
│   └── Login.jsx, Register.jsx, ResetPassword.jsx
├── components/
│   ├── SalaryPeriodWizard.jsx  # 3-step budget setup
│   ├── WeeklyBudgetCard.jsx    # Week display + carryover
│   ├── Add*Modal.jsx   # Expense, Income, Debt, Goal
│   ├── Edit*Modal.jsx  # Edit versions
│   ├── BankImportModal.jsx     # Paste bank transactions
│   ├── ExportImportModal.jsx   # JSON/CSV export
│   └── DraggableFloatingButton.jsx  # Mobile FAB
└── contexts/
    ├── ThemeContext.jsx    # Dark mode
    └── FeatureFlagContext.jsx
```

### Key Patterns

**Date → Period Assignment**:

```javascript
const matchingPeriod = allPeriods.find((period) => {
    const expenseDate = new Date(expenseData.date);
    return (
        expenseDate >= new Date(period.start_date) &&
        expenseDate <= new Date(period.end_date)
    );
});
```

Always match date to period boundaries, never assume current period.

**Component Refresh**:

```jsx
const WeeklyBudgetCard = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({ refresh: loadWeeklyData }));
});
// Parent: weeklyBudgetCardRef.current?.refresh()
```

**Dark Mode**: Tailwind `class` strategy with warm plum palette

```javascript
colors: {
  'dark-base': '#19171A',
  'dark-surface': '#221F24',
  'dark-elevated': '#2B272F',
  'dark-pink': '#FF8EA9',
}
```

---

## Security

### Current Posture: Good (for personal app)

✅ **Implemented:**

-   HttpOnly cookie JWT (XSS-safe, #80)
-   Werkzeug password hashing
-   Account lockout after failed logins (#34)
-   Rate limiting on auth endpoints
-   CORS restricted to frontend domain
-   CSP headers
-   SQL injection protection via ORM
-   Input validation with maxLength

⚠️ **Known Limitations:**

-   In-memory rate limiting (resets on restart)
-   No email verification
-   No 2FA

### Auth Flow

1. User logs in → Backend validates, creates JWT
2. JWT stored in HttpOnly cookie (not localStorage)
3. Axios automatically sends cookies with requests
4. Backend validates JWT on protected endpoints
5. On 401 → Frontend redirects to login

---

## Deployment

### Cloudflare Pages (Frontend)

-   **Build**: `cd frontend && npm install && npm run build`
-   **Output**: `frontend/dist`
-   **Auto-deploy**: Push to main
-   **Headers**: `frontend/public/_headers` (CSP, security)

### Render (Backend)

-   **Build**: `pip install -r backend/requirements.txt`
-   **Start**: `gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app`
-   **Python**: 3.11.9

**Environment Variables:**

```
FLASK_ENV=production
SECRET_KEY=<64-char-random>
JWT_SECRET_KEY=<64-char-random>
DATABASE_URL=<neon-connection-string>
CORS_ORIGINS=https://bloom-tracker.app
SENDGRID_API_KEY=<optional>
```

### Neon PostgreSQL

-   **Free tier**: 0.5GB, 100 compute hours/month
-   **Autosuspend**: Sleeps after 5 min inactivity
-   **Backup**: GitHub Actions daily at 2 AM UTC

---

## Development Workflow

### Quick Start

```powershell
# Setup
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd frontend && npm install && cd ..

# Run
.\start.ps1  # or: bstart

# Test account
# Email: test@test.com, Password: test
```

### PowerShell Aliases

```powershell
bstart   # Start backend + frontend
bstop    # Stop servers
breset   # Reset database
bformat  # Run black formatter
```

### PR-Based Workflow (Required)

**⚠️ IMPORTANT: Always use Pull Requests. Never push directly to `main`.**

```powershell
# 1. Create feature branch
git checkout -b feat/my-feature

# 2. Make changes, then format and commit
bformat
git add . && git commit -m "feat: description (#XX)"

# 3. Push branch
git push -u origin feat/my-feature

# 4. Create PR
gh pr create --fill

# 5. Wait for CI to pass (check GitHub Actions)
gh pr checks

# 6. After CI passes, merge
gh pr merge --squash --delete-branch

# 7. Update local main
git checkout main && git pull
```

### Pre-Merge Checklist

Before merging any PR:

-   [ ] CI pipeline passed (all green checks)
-   [ ] Reviewed the diff
-   [ ] Tests cover new functionality
-   [ ] No console.log or debug code
-   [ ] DECISION_LOG.md updated (if architectural change)

### Pre-Push Hook

Runs automatically:

-   Black formatting check
-   Flake8 linting
-   Frontend build validation
-   Console.log detection

Bypass: `git push --no-verify`

---

## Feature Notes

### Salary Period Wizard

**3-step flow** (`SalaryPeriodWizard.jsx`):

1. Enter balances (debit, credit available, limit) + optional end date and sub-periods
2. Review fixed bills (from recurring templates)
3. Confirm period breakdown

**Calculation**:

```
total_budget = debit + credit_allowance - fixed_bills
period_budget = total_budget / num_sub_periods  // default: 4
```

**Flexible Sub-Periods** (experimental feature flag: `flexibleSubPeriodsEnabled`):

-   When enabled, users can specify custom end date and number of sub-periods
-   Minimum: 1 period (entire date range)
-   Maximum: 1 period per day in the range
-   Days are distributed evenly across periods (extra days go to earlier periods)

### Carryover Logic

```
Period 1: Budget - Spent = Leftover
Period 2: (Budget + Period1_Leftover) - Spent = Leftover
Period 3: (Budget + Period2_Leftover) - Spent = Leftover
...
Period N: (Budget + Previous_Leftover) - Spent = Final
```

Overspending reduces next period's available budget.

### Recurring Expenses (On-Demand Model)

**Changed Dec 2024**: No longer auto-generates. User controls generation.

1. User configures lookahead (7-90 days, default 14) in Settings
2. Dashboard shows "Scheduled" toggle to preview upcoming
3. User clicks "Confirm Schedule" to generate expenses
4. RecurringExpenses page has Active/Upcoming tabs

### Bank Import

Paste tab-separated transactions:

```
2025/11/22    -42,33    Wise Europe SA
```

Auto-categorizes: Uber→Transport, Wolt→Food, Netflix→Subscriptions

### Goals & Savings

-   Create goals with target amount and date
-   Link to category/subcategory
-   Track progress with visual indicators
-   Transaction history per goal

### Custom Categories

Settings → Categories tab:

-   Create subcategories per expense category
-   Enable/disable defaults
-   Used in expense forms

---

## Recent Changes (Jan 2025)

| Feature              | Issue | Description                        |
| -------------------- | ----- | ---------------------------------- |
| Flexible Sub-Periods | #9    | Configurable 1 to N budget periods |

## Recent Changes (Dec 2024)

| Feature             | Issue | Description                        |
| ------------------- | ----- | ---------------------------------- |
| Goals & Savings     | #4    | Full goal tracking with progress   |
| Custom Categories   | #98   | User-defined subcategories         |
| Data Export/Import  | #90   | JSON/CSV with weekly breakdown     |
| On-Demand Recurring | #93   | User-controlled expense generation |
| HttpOnly JWT        | #80   | Cookies instead of localStorage    |
| Account Lockout     | #34   | Lock after failed logins           |
| European Dates      | #75   | DD/MM/YYYY format                  |

---

## Open Issues (Roadmap)

**In Progress:**

-   #92 Day-by-day transaction navigation
-   #94 Comprehensive calculation audit

**Planned Features:**

-   #1 End-of-period smart suggestions
-   #2 Budget categories with spending limits
-   #3 Reports & analytics dashboard
-   #6 Notifications & reminders

**Technical Debt:**

-   #32 Redis-based rate limiting
-   #33 Email verification
-   #38 Sentry error tracking

---

_For complete issue list: `gh issue list --state open`_

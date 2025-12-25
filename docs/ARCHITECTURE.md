# Bloom Architecture

Comprehensive technical architecture documentation for the Bloom Budget Tracker.

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Model](#data-model)
3. [Period System](#period-system)
4. [Balance Calculations](#balance-calculations)
5. [Authentication Flow](#authentication-flow)
6. [Frontend State Management](#frontend-state-management)
7. [API Communication](#api-communication)

---

## System Overview

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React + Vite)"]
        UI[UI Components]
        Pages[Pages]
        API_Client[api.js - Axios Client]
        Context[Contexts<br/>Theme, Currency, FeatureFlags]
    end

    subgraph Backend["Backend (Flask)"]
        Routes[Route Handlers]
        Services[Services<br/>Balance, Budget, Email]
        Models[SQLAlchemy Models]
        Utils[Utilities<br/>Rate Limiter, Validators]
    end

    subgraph Database["Database"]
        SQLite[(SQLite<br/>Development)]
        PostgreSQL[(PostgreSQL<br/>Production - Neon)]
    end

    subgraph External["External Services"]
        SendGrid[SendGrid<br/>Email Service]
    end

    UI --> Pages
    Pages --> API_Client
    API_Client -->|"HTTPS + JWT Cookies"| Routes
    Routes --> Services
    Services --> Models
    Models --> SQLite
    Models --> PostgreSQL
    Routes --> SendGrid
```

### Technology Stack

| Layer        | Technology                               |
| ------------ | ---------------------------------------- |
| **Frontend** | React 18 + Vite, Tailwind CSS            |
| **Backend**  | Flask (Python 3.11), Flask-JWT-Extended  |
| **Database** | SQLite (dev), PostgreSQL via Neon (prod) |
| **Auth**     | JWT in HttpOnly cookies                  |
| **Email**    | SendGrid                                 |
| **Hosting**  | Cloudflare Pages (FE) + Render (BE)      |

---

## Data Model

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ SALARY_PERIOD : has
    USER ||--o{ EXPENSE : has
    USER ||--o{ INCOME : has
    USER ||--o{ DEBT : has
    USER ||--o{ GOAL : has
    USER ||--o{ RECURRING_EXPENSE : has
    USER ||--o{ SUBCATEGORY : has

    SALARY_PERIOD ||--|{ BUDGET_PERIOD : contains
    BUDGET_PERIOD ||--o{ EXPENSE : contains
    BUDGET_PERIOD ||--o{ INCOME : contains

    RECURRING_EXPENSE ||--o{ EXPENSE : generates

    USER {
        int id PK
        string email UK
        string password_hash
        int failed_login_attempts
        datetime locked_until
        int recurring_lookahead_days
        string default_currency
    }

    SALARY_PERIOD {
        int id PK
        int user_id FK
        int initial_debit_balance
        int initial_credit_balance
        int credit_limit
        int credit_budget_allowance
        int weekly_budget
        date start_date
        date end_date
        bool is_active
    }

    BUDGET_PERIOD {
        int id PK
        int user_id FK
        int salary_period_id FK
        int week_number
        int budget_amount
        date start_date
        date end_date
    }

    EXPENSE {
        int id PK
        int user_id FK
        int budget_period_id FK
        int recurring_template_id FK
        string name
        int amount
        string category
        string subcategory
        date date
        string payment_method
        bool is_fixed_bill
    }

    INCOME {
        int id PK
        int user_id FK
        int budget_period_id FK
        string type
        int amount
        date scheduled_date
        date actual_date
    }

    DEBT {
        int id PK
        int user_id FK
        string name
        int original_amount
        int current_balance
        int monthly_payment
        bool archived
    }

    GOAL {
        int id PK
        int user_id FK
        string name
        int target_amount
        int current_amount
        date target_date
        string category
        string subcategory
    }

    RECURRING_EXPENSE {
        int id PK
        int user_id FK
        string name
        int amount
        string category
        string frequency
        date next_due_date
        bool is_active
        bool is_fixed_bill
    }
```

### Money Convention

**All amounts stored as integer cents** (not floats):

```
Database: 1500 = €15.00
Frontend: formatCurrency(1500) → "€15.00"
API: Always cents, never euros
```

This prevents floating-point precision errors common with currency.

---

## Period System

### Two-Tier Period Hierarchy

The core budgeting concept: a **SalaryPeriod** (4 weeks) auto-creates **BudgetPeriods** (individual weeks).

```mermaid
flowchart TD
    subgraph SP["SalaryPeriod (4-Week Parent)"]
        SP_Data["initial_debit_balance<br/>initial_credit_balance<br/>credit_limit<br/>weekly_budget"]
    end

    subgraph BP["BudgetPeriods (Auto-Created Children)"]
        BP1["Week 1<br/>Dec 1-7"]
        BP2["Week 2<br/>Dec 8-14"]
        BP3["Week 3<br/>Dec 15-21"]
        BP4["Week 4<br/>Dec 22-28"]
    end

    SP -->|"Creates on wizard submit"| BP1
    SP --> BP2
    SP --> BP3
    SP --> BP4
```

### Period Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant Wizard as SalaryPeriodWizard
    participant API
    participant DB

    User->>Wizard: Enter balances (Step 1)
    User->>Wizard: Review fixed bills (Step 2)
    User->>Wizard: Confirm budget (Step 3)
    Wizard->>API: POST /api/v1/salary-periods

    API->>API: Calculate weekly_budget<br/>(debit + credit_allowance - fixed_bills) / 4
    API->>DB: Create SalaryPeriod

    loop 4 times
        API->>DB: Create BudgetPeriod (Week 1-4)
    end

    API->>DB: Create Initial Balance income entry
    API-->>Wizard: Return salary_period + budget_periods
    Wizard-->>User: Show weekly breakdown
```

### Carryover Logic

Underspending or overspending in one week affects the next week's available budget.

```mermaid
flowchart LR
    subgraph Week1["Week 1"]
        W1_Budget["Budget: €100"]
        W1_Spent["Spent: €80"]
        W1_Leftover["Leftover: +€20"]
    end

    subgraph Week2["Week 2"]
        W2_Base["Base: €100"]
        W2_Carry["+ Carryover: €20"]
        W2_Adjusted["Adjusted: €120"]
        W2_Spent["Spent: €140"]
        W2_Leftover["Leftover: -€20"]
    end

    subgraph Week3["Week 3"]
        W3_Base["Base: €100"]
        W3_Carry["+ Carryover: -€20"]
        W3_Adjusted["Adjusted: €80"]
    end

    W1_Leftover -->|"Positive carryover"| W2_Carry
    W2_Leftover -->|"Negative carryover"| W3_Carry
```

**Calculation Formula:**

```python
# From backend/services/budget_service.py
adjusted_budget = base_budget + carryover
remaining = adjusted_budget - spent
next_week_carryover = cumulative_carryover + remaining
```

### Expense → Period Assignment

Expenses are assigned to BudgetPeriods based on their date:

```javascript
// Frontend: Match expense date to period boundaries
const matchingPeriod = allPeriods.find((period) => {
    const expenseDate = new Date(expenseData.date);
    return (
        expenseDate >= new Date(period.start_date) &&
        expenseDate <= new Date(period.end_date)
    );
});
```

**Critical Rule:** Never create BudgetPeriods manually. Always let SalaryPeriod creation handle it.

---

## Balance Calculations

### Balance Types

| Balance Type         | Description                              | Stored Where         |
| -------------------- | ---------------------------------------- | -------------------- |
| **Debit Balance**    | Money available in debit account         | Calculated real-time |
| **Credit Available** | Credit card spending room (limit - debt) | Calculated real-time |
| **Credit Limit**     | Maximum credit card capacity             | SalaryPeriod         |

### Real-Time Balance Calculation

```mermaid
flowchart TD
    Start["Calculate Display Balances"]

    subgraph Debit["Debit Balance Calculation"]
        D1["Find earliest 'Initial Balance' income"]
        D2["Sum all subsequent income<br/>(excluding Initial Balance entries)"]
        D3["Sum all debit expenses"]
        D4["debit_balance = initial + income - expenses"]
    end

    subgraph Credit["Credit Available Calculation"]
        C1["Sum all credit_card expenses"]
        C2["Sum all credit card payments"]
        C3["credit_debt = expenses - payments"]
        C4["credit_available = limit - debt"]
    end

    Start --> D1 --> D2 --> D3 --> D4
    Start --> C1 --> C2 --> C3 --> C4

    D4 --> Result["Return balances for display"]
    C4 --> Result
```

### Why Real-Time Calculation?

**Problem:** SalaryPeriods store snapshot balances at creation time. If a user creates next month's period before the current month ends, the snapshot won't include transactions made after creation.

**Solution:** `balance_service.py` always calculates from transaction source of truth:

```python
# backend/services/balance_service.py
def get_display_balances(salary_period_id, user_id):
    """
    Calculate real-time balances instead of using stored snapshots.
    Periods are cosmetic filters - balance reflects actual account state.
    """
    debit_balance = _calculate_debit_balance(user_id)
    credit_available = _calculate_credit_available(user_id, credit_limit_cents)
    return {"debit_balance": debit_balance, "credit_available": credit_available}
```

---

## Authentication Flow

### JWT in HttpOnly Cookies

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend
    participant Backend
    participant DB

    Browser->>Frontend: Enter credentials
    Frontend->>Backend: POST /auth/login
    Backend->>DB: Validate credentials
    Backend->>Backend: Generate JWT
    Backend->>Browser: Set-Cookie: access_token (HttpOnly)

    Note over Browser,Backend: Subsequent Requests

    Browser->>Backend: GET /api/v1/expenses<br/>(Cookie auto-attached)
    Backend->>Backend: Validate JWT from cookie
    Backend->>DB: Fetch user data
    Backend-->>Browser: JSON response
```

### Security Features

| Feature              | Implementation                  |
| -------------------- | ------------------------------- |
| **Token Storage**    | HttpOnly cookie (XSS-safe)      |
| **Token Expiry**     | 24 hours (supports PWA offline) |
| **Account Lockout**  | Lock after 5 failed attempts    |
| **Rate Limiting**    | In-memory, per-endpoint limits  |
| **Password Hashing** | Werkzeug (PBKDF2+SHA256)        |
| **CORS**             | Whitelist-only origins          |

### Account Lockout Flow

```mermaid
flowchart TD
    Login["Login Attempt"]
    Check["Check Credentials"]
    Valid{"Valid?"}
    Reset["Reset failed_attempts = 0"]
    Success["Login Success"]
    Increment["failed_attempts += 1"]
    ThresholdCheck{"attempts >= 5?"}
    Lock["Set locked_until = now + 15min"]
    Fail["Login Failed"]
    LockedCheck{"Account Locked?"}
    LockedError["Return: Account Locked"]

    Login --> LockedCheck
    LockedCheck -->|Yes| LockedError
    LockedCheck -->|No| Check
    Check --> Valid
    Valid -->|Yes| Reset --> Success
    Valid -->|No| Increment --> ThresholdCheck
    ThresholdCheck -->|Yes| Lock --> Fail
    ThresholdCheck -->|No| Fail
```

---

## Frontend State Management

### Dashboard Component Hierarchy

```mermaid
flowchart TD
    subgraph Dashboard["Dashboard.jsx (Main State)"]
        State["State:<br/>activeSalaryPeriod<br/>budgetPeriods<br/>currentWeekIndex<br/>expenses"]
    end

    subgraph Components["Child Components"]
        WBC["WeeklyBudgetCard<br/>(Week display + navigation)"]
        EL["ExpenseList<br/>(Transaction list)"]
        SPC["SalaryPeriodCard<br/>(Period summary)"]
        FAB["DraggableFloatingButton<br/>(Quick actions)"]
    end

    subgraph Modals["Modals"]
        AEM["AddExpenseModal"]
        EEM["EditExpenseModal"]
        AIM["AddIncomeModal"]
        SPW["SalaryPeriodWizard"]
        BIM["BankImportModal"]
    end

    Dashboard --> WBC
    Dashboard --> EL
    Dashboard --> SPC
    Dashboard --> FAB
    Dashboard --> AEM
    Dashboard --> EEM
    Dashboard --> AIM
    Dashboard --> SPW
    Dashboard --> BIM

    WBC -->|"ref.refresh()"| Dashboard
    AEM -->|"onSuccess"| Dashboard
    EEM -->|"onSuccess"| Dashboard
```

### Component Refresh Pattern

Components expose a `refresh()` method via `forwardRef` + `useImperativeHandle`:

```jsx
// WeeklyBudgetCard.jsx
const WeeklyBudgetCard = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
        refresh: loadWeeklyData,
    }));
});

// Dashboard.jsx - Parent triggers refresh
weeklyBudgetCardRef.current?.refresh();
```

### Context Providers

```mermaid
flowchart TD
    App["App.jsx"]
    Theme["ThemeContext<br/>(Dark mode toggle)"]
    Currency["CurrencyContext<br/>(EUR/USD/GBP conversion)"]
    FF["FeatureFlagContext<br/>(Feature toggles)"]
    Router["React Router"]
    Pages["Page Components"]

    App --> Theme --> Currency --> FF --> Router --> Pages
```

---

## API Communication

### API Structure

All endpoints are prefixed with `/api/v1/`:

```
/api/v1/
├── auth/
│   ├── login
│   ├── logout
│   ├── register
│   └── refresh
├── salary-periods/
├── budget-periods/
├── expenses/
├── income/
├── debts/
├── recurring-expenses/
├── goals/
├── subcategories/
└── export/
```

### Request Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant Axios as api.js
    participant Flask as Flask Routes
    participant Svc as Services
    participant DB as Database

    FE->>Axios: api.expenses.create(data)
    Axios->>Axios: Add credentials: 'include'
    Axios->>Flask: POST /api/v1/expenses
    Flask->>Flask: @jwt_required() decorator
    Flask->>Flask: Validate input
    Flask->>Svc: Business logic
    Svc->>DB: SQLAlchemy query
    DB-->>Svc: Result
    Svc-->>Flask: Processed data
    Flask-->>Axios: JSON response
    Axios-->>FE: Promise resolved
```

### Error Handling

```javascript
// frontend/src/api.js
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
    withCredentials: true, // Send cookies
});

// Global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);
```

---

## Deployment Architecture

```mermaid
flowchart LR
    subgraph User["User"]
        Browser[Browser/PWA]
    end

    subgraph Cloudflare["Cloudflare Pages"]
        FE[React SPA<br/>bloom-tracker.app]
    end

    subgraph Render["Render"]
        BE[Flask API<br/>bloom-backend-b44r.onrender.com]
    end

    subgraph Neon["Neon"]
        PG[(PostgreSQL<br/>AWS EU-Central-1)]
    end

    subgraph SendGrid["SendGrid"]
        Email[Email Service]
    end

    Browser -->|HTTPS| FE
    FE -->|API Calls| BE
    BE -->|SQL| PG
    BE -->|SMTP| Email
```

### Environment Variables

**Backend (Render):**

```bash
FLASK_ENV=production
SECRET_KEY=<64-char-random>
JWT_SECRET_KEY=<64-char-random>
DATABASE_URL=<neon-connection-string>
CORS_ORIGINS=https://bloom-tracker.app
SENDGRID_API_KEY=<optional>
```

**Frontend (Cloudflare):**

```bash
VITE_API_URL=https://bloom-backend-b44r.onrender.com
```

---

## Key Files Reference

| File                                             | Purpose                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| `backend/app.py`                                 | Flask app factory, CORS, JWT config            |
| `backend/models/database.py`                     | All SQLAlchemy models                          |
| `backend/services/balance_service.py`            | Real-time balance calculations                 |
| `backend/services/budget_service.py`             | Budget math, carryover logic                   |
| `backend/routes/salary_periods.py`               | Period CRUD, weekly breakdown                  |
| `frontend/src/api.js`                            | Axios instance, API wrappers                   |
| `frontend/src/pages/Dashboard.jsx`               | Main state management, component orchestration |
| `frontend/src/components/SalaryPeriodWizard.jsx` | 3-step budget setup flow                       |
| `frontend/src/components/WeeklyBudgetCard.jsx`   | Week display with carryover                    |

---

## Common Pitfalls

| ❌ Don't                                 | ✅ Do                                        |
| ---------------------------------------- | -------------------------------------------- |
| Create BudgetPeriods manually            | Let SalaryPeriod creation handle it          |
| Create overlapping SalaryPeriods         | Delete existing period first                 |
| Edit BudgetPeriods directly              | Edit parent SalaryPeriod                     |
| Use `new Date()` for leftover allocation | Use the week's `end_date`                    |
| Store money as floats                    | Use integer cents everywhere                 |
| Read balance from SalaryPeriod snapshot  | Use `balance_service.get_display_balances()` |

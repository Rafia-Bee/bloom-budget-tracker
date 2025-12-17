# Bloom Budget Tracker - Database Analysis Report

**Analysis Date:** December 12, 2025
**Analyzed By:** Code Review (GitHub Copilot)

## Database Structure Overview

The application uses **SQLAlchemy ORM** with dual database support:

-   **Development**: SQLite (`instance/bloom.db`)
-   **Production**: PostgreSQL (Neon hosted)

---

## Visual Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│     USERS        │
│──────────────────│
│ id (PK)          │◄─────────────────────────────────────┐
│ email (UNIQUE)   │                                      │
│ password_hash    │                                      │
│ created_at       │                                      │
└──────────────────┘                                      │
        │                                                 │
        │ (CASCADE DELETE ALL USER DATA)                  │
        │                                                 │
        ├─────────────────────┬──────────────────────────┬─────────────────┐
        │                     │                          │                 │
        ▼                     ▼                          ▼                 ▼
┌──────────────┐    ┌──────────────────┐      ┌──────────────┐   ┌──────────────┐
│ SALARY       │    │ BUDGET PERIODS   │      │  EXPENSES    │   │   INCOME     │
│ PERIODS      │    │ (Weekly Periods) │      │──────────────│   │──────────────│
│──────────────│    │──────────────────│      │ id           │   │ id           │
│ id (PK)      │───►│ id (PK)          │      │ user_id (FK) │   │ user_id (FK) │
│ user_id (FK) │    │ user_id (FK)     │      │ name         │   │ type         │
│              │    │ salary_period_id │      │ amount       │   │ amount       │
│ BALANCES:    │    │ week_number(1-4) │      │ category     │   │ scheduled    │
│ ├─debit      │    │ budget_amount    │      │ subcategory  │   │ actual_date  │
│ ├─credit     │    │ start_date       │      │ date         │   └──────────────┘
│ └─limit      │    │ end_date         │      │ payment_meth │
│              │    │ period_type      │      │ is_fixed_bill│
│ BUDGETS:     │    └──────────────────┘      │ notes        │
│ ├─total      │             │                │ receipt_url  │
│ ├─fixed_bills│             │                │              │
│ ├─weekly     │             │                │ recurring_   │
│ ├─debit_wk   │             │                │ template_id ─┼──┐
│ └─credit_wk  │             │                └──────────────┘  │
│              │             │                                  │
│ start_date   │             │                                  │
│ end_date     │             │                                  │
│ is_active    │             │                                  │
└──────────────┘             │                                  │
        │                    │                                  │
        │                    │                                  │
        ▼                    ▼                                  ▼
┌──────────────┐    ┌──────────────┐              ┌────────────────────┐
│   DEBTS      │    │ PERIOD       │              │ RECURRING          │
│──────────────│    │ SUGGESTIONS  │              │ EXPENSES           │
│ id           │    │──────────────│              │────────────────────│
│ user_id (FK) │    │ id           │              │ id (PK)            │
│ name         │    │ user_id (FK) │              │ user_id (FK)       │
│ original_amt │    │ suggestion_  │              │ name               │
│ current_bal  │    │ type         │              │ amount             │
│ monthly_pmt  │    │ amount       │              │ category           │
│ archived     │    │ status       │              │ payment_method     │
└──────────────┘    └──────────────┘              │ frequency          │
                                                  │ day_of_month       │
                                                  │ day_of_week        │
                                                  │ start_date         │
                                                  │ end_date           │
                                                  │ next_due_date      │
                                                  │ is_active          │
                                                  │ is_fixed_bill      │
                                                  └────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                         SUPPORTING TABLES                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ EXPENSE_NAME_        │  │ USER_DEFAULTS    │  │ CREDIT_CARD_    │ │
│  │ MAPPINGS             │  │──────────────────│  │ SETTINGS        │ │
│  │──────────────────────│  │ id               │  │─────────────────│ │
│  │ id                   │  │ user_id (FK,UNQ) │  │ id              │ │
│  │ expense_name (UNIQUE)│  │ default_expense  │  │ user_id(FK,UNQ) │ │
│  │ subcategory          │  │ default_category │  │ credit_limit    │ │
│  │ confidence           │  │ default_subcat   │  └─────────────────┘ │
│  └──────────────────────┘  │ default_payment  │                      │
│                            └──────────────────┘                      │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ PASSWORD_RESET_TOKENS                                        │   │
│  │──────────────────────────────────────────────────────────────│   │
│  │ id  │  user_id (FK)  │  token (UNIQUE)  │  expires_at       │   │
│  │ is_used  │  created_at                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Two-Tier Period System Explained

```
SALARY PERIOD (4 weeks)
├── Week 1 (Budget Period)  ─┐
├── Week 2 (Budget Period)   ├─ Auto-created as children
├── Week 3 (Budget Period)   │  when Salary Period is created
└── Week 4 (Budget Period)  ─┘

CARRYOVER LOGIC:
Week 1: Budget €100 → Spend €80 → Leftover €20
Week 2: Budget €100 + €20 carryover = €120 available
```

**Critical Understanding:**

-   **SalaryPeriod** = Parent container (monthly, 4 weeks)
-   **BudgetPeriod** = Child weeks (auto-generated, DO NOT create manually)
-   Expenses are assigned to weeks by matching their `date` field to period boundaries
-   Only SalaryPeriods appear in the UI period selector

---

## Database Schema - 12 Tables

### **1. User Management**

**`users` table**

-   `id` (PK, Integer)
-   `email` (String(120), unique, nullable=False)
-   `password_hash` (String(255), nullable=False)
-   `created_at` (DateTime)

**Relationships**: Cascading delete to all user data (budget_periods, salary_periods, expenses, income, debts)

### **2. Period Management (Two-Tier System)**

**`salary_periods` table** (Parent - 4-week periods)

-   `id` (PK)
-   `user_id` (FK → users)
-   Balance fields: `initial_debit_balance`, `initial_credit_balance`, `credit_limit`, `credit_budget_allowance` (all Integer, cents)
-   Budget fields: `total_budget_amount`, `fixed_bills_total`, `remaining_amount`, `weekly_budget`, `weekly_debit_budget`, `weekly_credit_budget` (all Integer)
-   `salary_amount` (Integer, nullable=True, deprecated)
-   `start_date`, `end_date` (Date, nullable=False)
-   `is_active` (Boolean, default=True)
-   `created_at` (DateTime)

**`budget_periods` table** (Child - weekly periods)

-   `id` (PK)
-   `user_id` (FK → users, indexed)
-   `salary_period_id` (FK → salary_periods, nullable=True)
-   `week_number` (Integer, nullable=True, 1-4)
-   `budget_amount` (Integer, nullable=True)
-   `start_date`, `end_date` (Date, indexed)
-   `period_type` (String(50))
-   `created_at` (DateTime)

**Index**: Composite index on `(user_id, start_date, end_date)`

### **3. Transactions**

**`expenses` table**

-   `id` (PK)
-   `user_id` (FK → users, indexed)
-   `recurring_template_id` (FK → recurring_expenses, nullable=True)
-   `name` (String(200))
-   `amount` (Integer, cents)
-   `category` (String(100), indexed)
-   `subcategory` (String(100), nullable=True)
-   `date` (Date, indexed)
-   `due_date` (String(50), default="N/A")
-   `payment_method` (String(20), default="credit", indexed)
-   `notes` (Text, nullable=True)
-   `receipt_url` (String(500), nullable=True)
-   `is_fixed_bill` (Boolean, default=False)
-   `created_at` (DateTime)

**Indexes**:

-   `idx_expense_user_date` (user_id, date)
-   `idx_expense_user_date_fixed` (user_id, date, is_fixed_bill)
-   `idx_expense_user_category` (user_id, category)
-   `idx_expense_user_payment` (user_id, payment_method)

**`income` table**

-   `id` (PK)
-   `user_id` (FK → users, indexed)
-   `type` (String(50))
-   `amount` (Integer, cents)
-   `scheduled_date`, `actual_date` (Date, indexed)
-   `created_at` (DateTime)

**Indexes**:

-   `idx_income_user_scheduled` (user_id, scheduled_date)
-   `idx_income_user_actual` (user_id, actual_date)

### **4. Debt Management**

**`debts` table**

-   `id` (PK)
-   `user_id` (FK → users)
-   `name` (String(200))
-   `original_amount`, `current_balance`, `monthly_payment` (Integer)
-   `archived` (Boolean, default=False)
-   `created_at`, `updated_at` (DateTime)

### **5. Recurring Expenses**

**`recurring_expenses` table**

-   `id` (PK)
-   `user_id` (FK → users)
-   `name` (String(200))
-   `amount` (Integer)
-   `category`, `subcategory` (String)
-   `payment_method` (String(20), default="credit")
-   `frequency` (String(20): 'weekly', 'biweekly', 'monthly', 'custom')
-   `frequency_value` (Integer, nullable=True, for custom)
-   `day_of_month` (Integer, nullable=True, 1-31)
-   `day_of_week` (Integer, nullable=True, 0-6)
-   `start_date`, `end_date` (Date, end_date nullable)
-   `next_due_date` (Date)
-   `is_active` (Boolean, default=True)
-   `is_fixed_bill` (Boolean, default=False)
-   `notes` (Text)
-   `created_at`, `updated_at` (DateTime)

### **6. Supporting Tables**

**`expense_name_mappings` table** (AI subcategorization)

-   `id` (PK)
-   `expense_name` (String(200), **unique**)
-   `subcategory` (String(100))
-   `confidence` (Float, default=1.0)
-   `last_updated` (DateTime)

**`user_defaults` table**

-   `id` (PK)
-   `user_id` (FK → users, **unique**)
-   `default_expense_name`, `default_category`, `default_subcategory`, `default_payment_method` (Strings)

**`credit_card_settings` table**

-   `id` (PK)
-   `user_id` (FK → users, **unique**)
-   `credit_limit` (Integer, default=150000)
-   `created_at`, `updated_at` (DateTime)

**`period_suggestions` table**

-   `id` (PK)
-   `user_id` (FK → users)
-   `suggestion_type` (String(100))
-   `amount` (Integer)
-   `status` (String(20), default="pending")
-   `created_at` (DateTime)

**`password_reset_tokens` table**

-   `id` (PK)
-   `user_id` (FK → users)
-   `token` (String(255), **unique**)
-   `expires_at` (DateTime)
-   `is_used` (Boolean, default=False)
-   `created_at` (DateTime)

---

## Design Strengths

1. ✅ **Proper indexing** on frequently queried columns (user_id, date, category, payment_method)
2. ✅ **Composite indexes** for common query patterns
3. ✅ **Cascade deletes** configured properly (all user data deleted on user deletion)
4. ✅ **Money stored as integers** (cents) throughout - prevents floating-point errors
5. ✅ **Connection pooling** configured for PostgreSQL with keepalives
6. ✅ **Password hashing** using werkzeug (bcrypt-based)
7. ✅ **Foreign key relationships** properly defined
8. ✅ **Error handling** with try/except blocks and rollbacks

---

## Critical Issues & Vulnerabilities

### **1. Missing Database Constraints** ⚠️

**No CHECK constraints** on critical fields:

```python
# Missing validation in database layer:
- amount > 0 (expenses, income, debts)
- week_number BETWEEN 1 AND 4 (budget_periods)
- email format validation
- password length minimum
- date ranges (start_date < end_date)
```

**Impact**: Application logic handles validation, but database allows invalid data if logic is bypassed.

**Recommendation**: Add CHECK constraints:

```python
__table_args__ = (
    db.CheckConstraint('amount > 0', name='check_positive_amount'),
    db.CheckConstraint('start_date < end_date', name='check_date_range'),
)
```

### **2. No Migration System** 🔴

**Critical finding**: No migration files found (`**/migrations/**/*.py` returned nothing)

**Impact**:

-   Schema changes are applied via `db.create_all()` which only creates missing tables
-   No version control for schema changes
-   Production schema drift risk
-   Cannot roll back schema changes
-   No audit trail of database evolution

**Recommendation**: Implement **Flask-Migrate (Alembic)**:

```bash
pip install Flask-Migrate
flask db init
flask db migrate -m "initial schema"
flask db upgrade
```

### **3. Transaction Handling Inconsistencies** ⚠️

**Found multiple patterns**:

```python
# Pattern 1: No explicit transaction (implicit commit on each operation)
db.session.add(expense)
db.session.commit()

# Pattern 2: Try/except with rollback
try:
    db.session.add(debt)
    db.session.commit()
except Exception as e:
    db.session.rollback()

# Pattern 3: Multi-step operations WITHOUT transaction wrapper
db.session.add(salary_period)
db.session.add(budget_period)  # If this fails, salary_period already committed
db.session.commit()
```

**Issues found in `salary_periods.py` (lines 420-473)**:

-   Creates `SalaryPeriod`
-   Creates 4 `BudgetPeriod` records
-   Creates `Income` record
-   Creates multiple debt `Expense` records
-   **NOT wrapped in a transaction** - partial failure leaves inconsistent state

**Recommendation**: Use explicit transactions for multi-step operations:

```python
try:
    # All operations here
    db.session.commit()
except Exception as e:
    db.session.rollback()
    raise
```

### **4. Potential Race Conditions** ⚠️

**Overlapping period validation** in `salary_periods.py`:

```python
# Check for overlapping periods (lines 380-390)
overlapping = SalaryPeriod.query.filter(...)
if overlapping:
    return error
# Time gap here - another request could create overlapping period
db.session.add(salary_period)
db.session.commit()
```

**Recommendation**: Add unique constraint or use database-level locking:

```python
__table_args__ = (
    db.Index('idx_user_date_range', 'user_id', 'start_date', 'end_date'),
    db.CheckConstraint('start_date < end_date'),
)
```

### **5. Generic Exception Handling** ⚠️

**Found 30+ instances** of `except Exception as e`:

```python
except Exception as e:
    db.session.rollback()
    return jsonify({"error": str(e)}), 500
```

**Issues**:

-   Catches ALL exceptions including `KeyboardInterrupt`, `SystemExit`
-   Leaks internal error messages to client (potential info disclosure)
-   No logging of stack traces
-   Makes debugging harder

**Recommendation**:

```python
from sqlalchemy.exc import SQLAlchemyError

except SQLAlchemyError as e:
    db.session.rollback()
    app.logger.error(f"Database error: {e}", exc_info=True)
    return jsonify({"error": "Database operation failed"}), 500
except ValueError as e:
    return jsonify({"error": str(e)}), 400
```

### **6. Missing Database-Level Referential Integrity** ⚠️

**`Expense.recurring_template_id`** is nullable FK, but no ON DELETE behavior specified:

```python
recurring_template_id = db.Column(
    db.Integer, db.ForeignKey("recurring_expenses.id"), nullable=True
)
```

**Issue**: If a `RecurringExpense` is deleted, generated `Expense` records still reference it.

**Current behavior**: Relationship defined with backref but no cascade specified.

**Recommendation**:

```python
recurring_template_id = db.Column(
    db.Integer,
    db.ForeignKey("recurring_expenses.id", ondelete='SET NULL'),
    nullable=True
)
```

### **7. No Soft Delete Pattern** ⚠️

All deletions are **hard deletes**:

```python
db.session.delete(expense)
db.session.commit()
```

**Impact**:

-   No data recovery after accidental deletion
-   Audit trail lost
-   Recurring expense history lost when template deleted

**Recommendation**: Implement soft delete for critical tables:

```python
deleted_at = db.Column(db.DateTime, nullable=True)
# In queries: .filter(deleted_at.is_(None))
```

### **8. No Database Backups Mentioned in Code** ⚠️

**Found**: `scripts/backup_database.py` exists but:

-   No scheduled backup mechanism in code
-   No backup retention policy
-   Neon PostgreSQL free tier: 0.5GB storage limit

**Recommendation**: Implement automated backups (GitHub Actions or Render cron).

### **9. String Length Limits May Be Insufficient** ⚠️

```python
receipt_url = db.Column(db.String(500), nullable=True)  # May overflow for long URLs
notes = db.Column(db.Text, nullable=True)  # Good, unlimited
```

**Recommendation**: Consider increasing `receipt_url` to 1024 or use `Text`.

### **10. No Audit Trail** ⚠️

No tracking of:

-   Who modified what and when
-   Previous values before updates
-   Deletion records

**Recommendation**: Add audit columns or implement event logging:

```python
created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
modified_by = db.Column(db.Integer, db.ForeignKey('users.id'))
modified_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
```

---

## Performance Concerns

### **1. N+1 Query Problem Potential**

**Code pattern in `salary_periods.py` (lines 115-145)**:

```python
for week in all_weeks:
    week_expenses = db.session.query(func.sum(Expense.amount)).filter(...)
    # Executes 1 query per week (4 queries)
```

**Recommendation**: Use `joinedload` or single aggregation query.

### **2. No Query Result Caching**

Frequent queries like:

-   Current salary period lookup
-   User defaults
-   Credit card settings

**Recommendation**: Consider Flask-Caching for frequently accessed, rarely changed data.

### **3. ✅ Missing Index on Common Query Pattern (RESOLVED)**

**Found query pattern**: Expenses by date range + user + is_fixed_bill:

```python
Expense.date >= start AND Expense.date <= end
  AND user_id = X AND is_fixed_bill = False
```

**Resolution**: Added composite index `idx_expense_user_date_fixed` on `(user_id, date, is_fixed_bill)`

-   Migration: `d4a91c2b7f3e_add_composite_index_expense_user_date_fixed.py`
-   Date: 2025-12-17
-   Optimizes weekly budget calculations and carryover queries

---

## Security Findings

### **1. Email Not Validated at Database Level**

```python
email = db.Column(db.String(120), unique=True, nullable=False)
# No CHECK constraint for email format
```

### **2. No Rate Limiting on Database Queries**

Only HTTP-level rate limiting found (`@rate_limit` decorator).

### **3. Potential SQL Injection via ILIKE** (Low Risk)

```python
search_pattern = f"%{search}%"
query = query.filter(Expense.name.ilike(search_pattern))
```

SQLAlchemy parameterizes this, but worth noting.

### **4. Password Tokens Have No Cleanup Mechanism**

`password_reset_tokens` table grows indefinitely.

**Recommendation**: Add periodic cleanup job or TTL:

```python
# Delete expired tokens older than 24 hours
PasswordResetToken.query.filter(
    PasswordResetToken.expires_at < datetime.utcnow() - timedelta(days=1)
).delete()
```

---

## Missing Features

1. **No database-level uniqueness constraints** beyond user email
2. **No archival strategy** for old periods/expenses
3. **No database monitoring/alerting** setup
4. **No connection pool exhaustion protection** (beyond config limits)
5. **No read replicas** for query scaling (acceptable for current scale)
6. **No full-text search indexes** (current ILIKE is slow on large datasets)

---

## Summary & Priority Recommendations

### **Critical (Fix Immediately):**

1. 🔴 Implement migration system (Flask-Migrate)
2. 🔴 Wrap multi-step operations in explicit transactions
3. 🔴 Add CHECK constraints for data integrity

### **High Priority:**

4. ⚠️ Fix generic exception handling (use specific exceptions)
5. ⚠️ Add ON DELETE behavior to FKs
6. ⚠️ Implement soft delete for expenses/recurring expenses
7. ✅ Add composite index for `(user_id, date, is_fixed_bill)` - COMPLETED 2025-12-17

### **Medium Priority:**

8. Add audit trail columns (created_by, modified_at)
9. Implement token cleanup job
10. Add database backup automation

### **Low Priority:**

11. Consider caching for frequently accessed data
12. Increase `receipt_url` length limit
13. Add full-text search indexes if data grows

---

## Overall Assessment

The database design is **functionally sound** for the application's needs, with good indexing and proper relationships. However, it lacks **critical production safeguards** (migrations, transactions, constraints) that could lead to data integrity issues and difficult debugging in production.

**Strengths:**

-   Well-structured relationships
-   Good indexing strategy
-   Proper money handling (integers for cents)
-   Cascade deletes configured

**Weaknesses:**

-   No migration system
-   Inconsistent transaction handling
-   Missing database constraints
-   No soft deletes
-   No audit trail

**Next Steps:**

1. Prioritize implementing Flask-Migrate for schema versioning
2. Review and fix transaction handling in multi-step operations
3. Add CHECK constraints to prevent invalid data at database level
4. Consider implementing soft deletes for user-facing data

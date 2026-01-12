# Database Development Instructions

Guidelines for database work on the Bloom Budget Tracker.

---

## 🗄️ Database Overview

| Environment | Database   | Connection             |
| ----------- | ---------- | ---------------------- |
| Development | SQLite     | `instance/bloom.db`    |
| Testing     | SQLite     | In-memory (`:memory:`) |
| Production  | PostgreSQL | Neon (serverless)      |

### ORM

SQLAlchemy with Flask-SQLAlchemy. Models defined in `backend/models/database.py`.

---

## 🚨 CRITICAL: Production Database Rules

### 1. ALWAYS Query Production First

Before ANY database change, query production to verify current state:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users';

-- Check existing data
SELECT COUNT(*) FROM expenses;
SELECT DISTINCT category FROM expenses LIMIT 10;
```

**Never assume local DB matches production.**

### 2. Manual SQL Migrations for Production

Production migrations are **manual SQL scripts** run in Neon SQL Editor.

**Do NOT use:**

-   Flask-Migrate in production
-   Automatic migrations
-   ORM migrations

### 3. Migration Process

```
1. Write migration SQL script
2. Test on local SQLite
3. Backup production data
4. Run in Neon SQL Editor
5. Verify with SELECT queries
6. Update ORM model
7. Document in DECISION_LOG.md
```

---

## 💰 Money Storage

**CRITICAL: All amounts stored as INTEGER CENTS.**

```sql
-- Correct: Store €15.00 as 1500
INSERT INTO expenses (amount) VALUES (1500);

-- Wrong: Never use decimal/float
INSERT INTO expenses (amount) VALUES (15.00);  -- ❌
```

### Column Types

```sql
-- SQLite
amount INTEGER NOT NULL DEFAULT 0

-- PostgreSQL
amount INTEGER NOT NULL DEFAULT 0
```

---

## 📊 Schema Reference

### Users Table

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    recurring_lookahead_days INTEGER DEFAULT 30,
    default_currency VARCHAR(3) DEFAULT 'EUR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Salary Periods Table

```sql
CREATE TABLE salary_periods (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    initial_debit_balance INTEGER NOT NULL DEFAULT 0,
    initial_credit_balance INTEGER NOT NULL DEFAULT 0,
    credit_limit INTEGER NOT NULL DEFAULT 0,
    credit_budget_allowance INTEGER NOT NULL DEFAULT 0,
    weekly_budget INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    balance_mode VARCHAR(10) DEFAULT 'sync',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Budget Periods Table

```sql
CREATE TABLE budget_periods (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    salary_period_id INTEGER NOT NULL REFERENCES salary_periods(id),
    week_number INTEGER NOT NULL,
    budget_amount INTEGER NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Expenses Table

```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    budget_period_id INTEGER REFERENCES budget_periods(id),
    recurring_template_id INTEGER REFERENCES recurring_expenses(id),
    name VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    date DATE NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'debit',
    is_fixed_bill BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Income Table

```sql
CREATE TABLE income (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    budget_period_id INTEGER REFERENCES budget_periods(id),
    type VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    scheduled_date DATE,
    actual_date DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Debts Table

```sql
CREATE TABLE debts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    original_amount INTEGER NOT NULL DEFAULT 0,
    current_balance INTEGER NOT NULL DEFAULT 0,
    monthly_payment INTEGER DEFAULT 0,
    interest_rate DECIMAL(5,2),
    due_date DATE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Goals Table

```sql
CREATE TABLE goals (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    target_amount INTEGER NOT NULL DEFAULT 0,
    current_amount INTEGER NOT NULL DEFAULT 0,
    target_date DATE,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Recurring Expenses Table

```sql
CREATE TABLE recurring_expenses (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    frequency VARCHAR(20) NOT NULL,
    next_due_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_fixed_bill BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(20) DEFAULT 'debit',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subcategories Table

```sql
CREATE TABLE subcategories (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name, category)
);
```

---

## 🔧 Common Migrations

### Add Column

```sql
-- PostgreSQL (Production)
ALTER TABLE expenses ADD COLUMN new_field VARCHAR(100);

-- SQLite (Development) - more limited
-- May need to recreate table for complex changes
```

### Add Index

```sql
-- Both databases
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_budget_periods_dates ON budget_periods(start_date, end_date);
```

### Add Foreign Key (PostgreSQL only)

```sql
ALTER TABLE expenses
ADD CONSTRAINT fk_expenses_recurring
FOREIGN KEY (recurring_template_id)
REFERENCES recurring_expenses(id);
```

### Rename Column

```sql
-- PostgreSQL
ALTER TABLE expenses RENAME COLUMN old_name TO new_name;

-- SQLite - requires table recreation
```

---

## 🔍 Useful Queries

### Check Period Expenses

```sql
SELECT
    bp.id,
    bp.week_number,
    bp.start_date,
    bp.end_date,
    COUNT(e.id) as expense_count,
    COALESCE(SUM(e.amount), 0) as total_spent
FROM budget_periods bp
LEFT JOIN expenses e ON e.budget_period_id = bp.id AND e.is_deleted = FALSE
WHERE bp.salary_period_id = ?
GROUP BY bp.id
ORDER BY bp.week_number;
```

### User Summary

```sql
SELECT
    u.email,
    COUNT(DISTINCT sp.id) as salary_periods,
    COUNT(DISTINCT e.id) as expenses,
    COUNT(DISTINCT i.id) as income_entries
FROM users u
LEFT JOIN salary_periods sp ON sp.user_id = u.id
LEFT JOIN expenses e ON e.user_id = u.id AND e.is_deleted = FALSE
LEFT JOIN income i ON i.user_id = u.id AND i.is_deleted = FALSE
WHERE u.id = ?
GROUP BY u.id;
```

### Category Breakdown

```sql
SELECT
    category,
    COUNT(*) as count,
    SUM(amount) as total_cents,
    SUM(amount) / 100.0 as total_euros
FROM expenses
WHERE user_id = ?
  AND is_deleted = FALSE
  AND date BETWEEN ? AND ?
GROUP BY category
ORDER BY total_cents DESC;
```

### Find Orphaned Records

```sql
-- Expenses without budget period
SELECT * FROM expenses
WHERE budget_period_id IS NOT NULL
  AND budget_period_id NOT IN (SELECT id FROM budget_periods);

-- Budget periods without salary period
SELECT * FROM budget_periods
WHERE salary_period_id NOT IN (SELECT id FROM salary_periods);
```

---

## 📝 SQLAlchemy Model Pattern

### Model Definition

```python
# backend/models/database.py

class MyModel(db.Model):
    __tablename__ = 'my_models'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Integer, nullable=False, default=0)  # Cents!
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='my_models')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'amount': self.amount,  # Return cents, frontend converts
            'is_deleted': self.is_deleted,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
```

### Query Patterns

```python
# Always filter by user_id
items = MyModel.query.filter_by(
    user_id=user_id,
    is_deleted=False
).all()

# With ordering
items = MyModel.query.filter_by(user_id=user_id)\
    .order_by(MyModel.created_at.desc())\
    .all()

# With date range
from sqlalchemy import and_
items = MyModel.query.filter(
    and_(
        MyModel.user_id == user_id,
        MyModel.date >= start_date,
        MyModel.date <= end_date
    )
).all()
```

---

## 🚨 Common Pitfalls

### 1. Missing User Filter

```python
# ❌ Wrong: Exposes all users' data
Expense.query.all()

# ✅ Correct: Always filter by user
Expense.query.filter_by(user_id=user_id).all()
```

### 2. Float Money Values

```python
# ❌ Wrong: Float precision issues
amount = db.Column(db.Float)

# ✅ Correct: Integer cents
amount = db.Column(db.Integer)
```

### 3. Forgetting Soft Delete Check

```python
# ❌ Wrong: Includes deleted records
Expense.query.filter_by(user_id=user_id).all()

# ✅ Correct: Exclude deleted
Expense.query.filter_by(user_id=user_id, is_deleted=False).all()
```

### 4. Manual BudgetPeriod Creation

```python
# ❌ Wrong: BudgetPeriods created manually
bp = BudgetPeriod(user_id=user_id, ...)

# ✅ Correct: Created automatically by SalaryPeriod
# See salary_periods.py create_salary_period()
```

---

## 🔄 Backup & Recovery

### Export User Data

```sql
-- Full user export
SELECT * FROM expenses WHERE user_id = ? AND is_deleted = FALSE;
SELECT * FROM income WHERE user_id = ? AND is_deleted = FALSE;
SELECT * FROM salary_periods WHERE user_id = ?;
SELECT * FROM budget_periods WHERE user_id = ?;
```

### Restore Soft-Deleted Records

```sql
UPDATE expenses
SET is_deleted = FALSE, deleted_at = NULL
WHERE id = ? AND user_id = ?;
```

---

## 📚 Related Documentation

-   [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Data model diagrams
-   [API.md](../docs/API.md) - API endpoints and data formats
-   [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Production database setup
-   [DATABASE_ANALYSIS.md](../docs/DATABASE_ANALYSIS.md) - Schema analysis

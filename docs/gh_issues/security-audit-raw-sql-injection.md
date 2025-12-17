# Security: Raw SQL Injection Risk in Maintenance Scripts

## Priority

🟠 **HIGH** - Security vulnerability

## Description

Multiple maintenance scripts use raw SQL queries with the `text()` wrapper, creating potential SQL injection vulnerabilities. While currently low risk (scripts not exposed to user input), this violates secure coding practices and creates future risk if scripts are modified.

## Security Risk

-   **Impact**: High - Could lead to database compromise
-   **Likelihood**: Low - Scripts not directly exposed to user input
-   **CVSS**: Medium-High (6.5+)

## Vulnerable Code Locations

### Primary Script: maintenance.py

**File**: `scripts/maintenance.py:38`

```python
result = conn.execute(text("PRAGMA table_info(debts)"))

conn.execute(
    text("ALTER TABLE debts ADD COLUMN archived BOOLEAN DEFAULT 0 NOT NULL")
)
```

**File**: `scripts/maintenance.py:64-74`

```python
result = db.session.execute(
    text("SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_expenses'")
)

db.session.execute(
    text("""
        CREATE TABLE recurring_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            -- ... more SQL ...
        )
    """)
)
```

**File**: `scripts/maintenance.py:105`

```python
result = db.session.execute(text("PRAGMA table_info(expenses)"))
db.session.execute(
    text("ALTER TABLE expenses ADD COLUMN recurring_template_id INTEGER")
)
```

### Additional Risk Areas

Multiple other scripts use similar patterns:

-   Database introspection queries
-   Table creation/modification
-   Data cleanup operations

## Risk Analysis

### Current Risk: LOW

-   Scripts run manually by administrators
-   No user input directly passed to queries
-   Used for one-time migrations/maintenance

### Future Risk: HIGH

-   Scripts could be modified to accept parameters
-   Could be integrated into web endpoints
-   Maintenance operations might need user-specific data

### Attack Scenarios

1. **Script Modification**: Developer adds user input parameter to script
2. **Integration Risk**: Script functionality moved to web endpoint
3. **Injection via Environment**: Environment variables used in SQL construction

## Secure Solutions

### Option 1: Use SQLAlchemy ORM (Recommended)

```python
# Instead of raw SQL table creation
# Use SQLAlchemy model definitions and migrations

from sqlalchemy import MetaData, inspect
from flask_migrate import upgrade

def migrate_add_archived():
    """Use proper migration instead of raw SQL"""
    # Check if column exists using SQLAlchemy
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('debts')]

    if 'archived' not in columns:
        # Use proper migration
        upgrade(directory='backend/migrations')
    else:
        print("✓ 'archived' column already exists")
```

### Option 2: Parameterized Queries with Validation

```python
def check_table_exists(table_name):
    """Safely check if table exists"""
    # Validate table name against whitelist
    allowed_tables = ['debts', 'expenses', 'recurring_expenses', 'users']
    if table_name not in allowed_tables:
        raise ValueError(f"Invalid table name: {table_name}")

    # Use parameterized query
    result = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:table_name"),
        {'table_name': table_name}
    )
    return result.fetchone() is not None
```

### Option 3: DDL via SQLAlchemy Constructs

```python
from sqlalchemy import Column, Integer, Boolean, MetaData, Table

def add_archived_column_safely():
    """Add column using SQLAlchemy DDL"""
    metadata = MetaData()

    # Reflect existing table
    debts_table = Table('debts', metadata, autoload_with=db.engine)

    # Check if column exists
    if 'archived' not in debts_table.columns:
        # Add column using SQLAlchemy DDL
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE debts ADD COLUMN archived BOOLEAN DEFAULT 0 NOT NULL'))
            conn.commit()
```

## Recommended Implementation

### Phase 1: Immediate Fix - Input Validation

```python
# scripts/maintenance.py - Add validation layer

ALLOWED_TABLES = ['debts', 'expenses', 'users', 'recurring_expenses']
ALLOWED_COLUMNS = {
    'debts': ['archived', 'amount', 'name'],
    'expenses': ['recurring_template_id', 'amount', 'name'],
    # ... define allowed columns per table
}

def validate_table_name(table_name):
    """Validate table name against whitelist"""
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"Table '{table_name}' not allowed")
    return table_name

def validate_column_name(table_name, column_name):
    """Validate column name for specific table"""
    if table_name not in ALLOWED_COLUMNS:
        raise ValueError(f"No column validation for table '{table_name}'")
    if column_name not in ALLOWED_COLUMNS[table_name]:
        raise ValueError(f"Column '{column_name}' not allowed for table '{table_name}'")
    return column_name

# Usage in functions
def check_column_exists(table_name, column_name):
    table_name = validate_table_name(table_name)
    column_name = validate_column_name(table_name, column_name)

    result = db.session.execute(
        text("PRAGMA table_info(:table_name)"),
        {'table_name': table_name}
    )
    columns = [row[1] for row in result]
    return column_name in columns
```

### Phase 2: Migration to ORM

```python
# Replace raw SQL with proper migrations
# Use Flask-Migrate for schema changes
# Use SQLAlchemy ORM for data operations

def migrate_using_orm():
    """Replace with proper Flask-Migrate"""
    from flask_migrate import upgrade

    try:
        upgrade(directory='backend/migrations')
        print("✓ Migrations completed successfully")
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        raise
```

## Implementation Plan

### Step 1: Audit All Raw SQL

-   [ ] Catalog all `text()` usage in scripts
-   [ ] Identify which queries could accept user input
-   [ ] Classify risk level for each usage

### Step 2: Add Input Validation

-   [ ] Create validation functions for table/column names
-   [ ] Add whitelists for allowed database objects
-   [ ] Update all script functions to use validation

### Step 3: Replace with ORM/Migrations

-   [ ] Convert schema changes to proper migrations
-   [ ] Replace data queries with SQLAlchemy ORM
-   [ ] Remove raw SQL where possible

### Step 4: Security Review

-   [ ] Code review all script modifications
-   [ ] Test scripts with malicious input
-   [ ] Document secure coding guidelines

## Files to Modify

-   `scripts/maintenance.py` - Primary security fixes
-   `scripts/remove_duplicates.py` - Check for raw SQL usage
-   `scripts/validate_check_constraints.py` - Review for security
-   `docs/SECURITY.md` - Add secure coding guidelines
-   `backend/migrations/` - Create proper migration files

## Testing Requirements

-   [ ] All maintenance functions work with validation
-   [ ] Malicious input properly rejected
-   [ ] Error messages don't leak information
-   [ ] Performance not significantly impacted

## Related Security Issues

-   Environment variable validation (#XX)
-   Database connection security (#XX)

## Labels

`security`, `high`, `backend`, `scripts`, `sql-injection`, `maintenance`

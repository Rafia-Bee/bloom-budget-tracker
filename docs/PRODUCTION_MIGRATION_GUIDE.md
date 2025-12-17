# Production Migration Setup Guide

## Problem

Production database has tables created by `db.create_all()`. Switching to Flask-Migrate requires telling Alembic about the existing schema without dropping/recreating tables.

## Solution: Baseline Migration + Incremental Updates

### Phase 1: Establish Baseline (One-Time Setup)

1. **Access Production Database**

    ```bash
    # Get DATABASE_URL from Render environment variables
    # Connect via Render Shell or local psql client
    ```

2. **Run Baseline Command**

    ```bash
    export FLASK_APP=backend.app:create_app
    flask db stamp head
    ```

    This creates `alembic_version` table and marks current schema as "initial migration" without modifying existing tables.

3. **Verify**
    ```sql
    SELECT * FROM alembic_version;
    -- Should show: version_num = '96250a305e91' (our initial migration ID)
    ```

### Phase 2: Re-Apply Feature Migrations

4. **Local: Create Fresh Migrations**

    ```bash
    cd backend

    # 1. Account Lockout Fields
    flask db revision -m "Add account lockout fields to User model"
    # Edit migration file: add failed_login_attempts, locked_until columns

    # 2. (Optional) Add other pending features
    ```

5. **Test Locally**

    ```bash
    # Reset local database
    rm instance/bloom.db
    flask db upgrade  # Should create all tables + new columns

    # Test account lockout functionality
    python -m pytest backend/tests/test_auth.py::TestAccountLockout
    ```

6. **Deploy to Production**

    ```bash
    git add backend/migrations/
    git commit -m "feat: add production-ready migrations for account lockout (#34)"
    git push origin main

    # Render will automatically run:
    # flask db upgrade (via render.yaml buildCommand)
    ```

### Phase 3: Future Feature Migrations

For all new features:

```bash
# 1. Create migration
flask db revision -m "descriptive message"

# 2. Edit migration file with upgrade/downgrade logic

# 3. Test locally
flask db upgrade
# (test feature)
flask db downgrade  # Verify rollback works

# 4. Commit and push
git add backend/migrations/versions/XXX_*.py
git commit -m "feat: description (#issue)"
git push
```

## Migration File Template

```python
"""Add account lockout fields to User model

Revision ID: XXXX
Revises: 96250a305e91
Create Date: 2025-XX-XX
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'XXXX'
down_revision = '96250a305e91'
branch_labels = None
depends_on = None

def upgrade():
    # Add columns with explicit defaults for existing rows
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
```

## Safety Checks

### Before Deploying

-   ✅ Test migration on local SQLite
-   ✅ Test migration on local PostgreSQL (docker)
-   ✅ Review migration file for DROP statements (should be rare)
-   ✅ Ensure downgrade() logic exists
-   ✅ Check that server_default is set for NOT NULL columns

### After Deploying

-   ✅ Check Render build logs for migration success
-   ✅ Verify `alembic_version` table updated
-   ✅ Test login/register on production
-   ✅ Monitor error logs for SQLAlchemy exceptions

## Rollback Strategy

If migration fails in production:

**Option 1: Quick Rollback**

```bash
git revert HEAD
git push origin main
```

**Option 2: Database Rollback**

```bash
# Connect to Neon PostgreSQL
flask db downgrade -1  # Roll back one migration
```

**Option 3: Manual Fix**

```sql
-- If migration partially applied, manually complete it:
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
UPDATE alembic_version SET version_num = 'TARGET_VERSION';
```

## Monitoring

Check these after each migration deploy:

1. Render build logs: Look for "INFO [alembic.runtime.migration]"
2. Application logs: No SQLAlchemy.exc.ProgrammingError
3. Sentry (if configured): No new error alerts
4. User reports: Login/core functionality working

## Common Issues

### "column does not exist"

-   Migration didn't run or failed
-   Check Render build logs
-   Manually connect to DB and verify schema

### "relation alembic_version does not exist"

-   Forgot to run `flask db stamp head`
-   Run it on production database

### "Target database is not up to date"

-   Alembic version mismatch
-   Run `flask db upgrade` manually or redeploy

## Best Practices

1. **Always test locally first** - Use identical database engine (PostgreSQL)
2. **One feature per migration** - Easier to roll back
3. **Write reversible migrations** - Implement downgrade()
4. **Use server_default** - Prevents "column cannot be null" on existing rows
5. **Document breaking changes** - Update DEPLOYMENT.md
6. **Schedule migrations** - Deploy during low-traffic periods
7. **Backup before migrating** - Use Neon's built-in backups or `pg_dump`

## Next Steps

1. [ ] Get Neon DATABASE_URL from Render
2. [ ] Connect to production database
3. [ ] Run `flask db stamp head`
4. [ ] Create new migration for account lockout
5. [ ] Test on staging/local PostgreSQL
6. [ ] Deploy to production
7. [ ] Monitor and verify

# Complete Production Database Migration: All Recent Features

**Issue Type:** Database Migration
**Priority:** Critical
**Labels:** `backend`, `database`, `production`

## Problem

Multiple recent features added new database tables and columns that exist in development but need to be migrated to production (Neon PostgreSQL):

### New Tables & Features:

1. **Subcategories system** (Custom user subcategories)
2. **Goals system** (Savings goals tracking)
3. **Data integrity constraints** (Check constraints across all tables)
4. **Recurring expense lookahead** (User setting for preview days)

### Database Changes Summary:

-   `subcategories` table (with system defaults)
-   `goals` table (with progress tracking)
-   `recurring_lookahead_days` column in `users` table
-   Multiple CHECK constraints for data integrity
-   New indexes and foreign key constraints

## Migration Options

Since Render free tier has no shell access, use the complete SQL script:

**File:** `docs/production_migration_complete.sql`

-   `recurring_lookahead_days` INTEGER NOT NULL DEFAULT 14

This column exists in development (SQLite) but needs to be added to the production database (Neon PostgreSQL).

## Migration Details

**Migration file:** `backend/migrations/versions/c5d8e9a2b1f3_add_recurring_lookahead_days.py`

**Changes:**

1. Added `recurring_lookahead_days` column to `users` table
2. Default value: 14 days
3. Check constraint: value must be between 7 and 90 days

## Migration Steps

### Option 1: Alembic Migration (Recommended)

```powershell
# Connect to production database
$env:DATABASE_URL = "postgresql://..."  # Set Neon connection string

# Run migrations
.venv\Scripts\Activate.ps1
python scripts/run_migrations.py
```

### Option 2: Manual SQL (if Alembic fails)

```sql
-- Add column with default value
ALTER TABLE users
ADD COLUMN recurring_lookahead_days INTEGER NOT NULL DEFAULT 14;

-- Add check constraint
ALTER TABLE users
ADD CONSTRAINT check_user_lookahead_range
CHECK (recurring_lookahead_days >= 7 AND recurring_lookahead_days <= 90);
```

## Verification

After migration, verify:

1. Column exists: `SELECT recurring_lookahead_days FROM users LIMIT 1;`
2. Default value works: All existing users should have 14 days
3. Constraint works: Try inserting user with invalid value (should fail)
4. API endpoints work: GET/PUT `/api/v1/user-data/settings/recurring-lookahead`

## Related Files

-   Migration: `backend/migrations/versions/c5d8e9a2b1f3_add_recurring_lookahead_days.py`
-   Model: `backend/models/database.py` (User class)
-   Routes: `backend/routes/user_data.py` (lookahead endpoints)
-   Frontend: Settings → Preferences tab

## Rollback Plan

If migration fails:

```sql
-- Remove check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_lookahead_range;

-- Remove column
ALTER TABLE users DROP COLUMN IF EXISTS recurring_lookahead_days;
```

## Testing Checklist

-   [ ] Migration runs successfully
-   [ ] Existing users have default value (14)
-   [ ] GET `/api/v1/user-data/settings/recurring-lookahead` returns 200
-   [ ] PUT endpoint can update value
-   [ ] Check constraint prevents invalid values (< 7 or > 90)
-   [ ] Settings page loads without errors
-   [ ] Scheduled/Upcoming views respect lookahead setting

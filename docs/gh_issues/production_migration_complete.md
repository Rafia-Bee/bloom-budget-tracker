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

## Migration Solution

Since Render free tier has no shell access, use the complete SQL script:

**File:** `docs/production_migration_complete.sql`

This script includes all database changes and can be run directly in Neon SQL console.

## Step-by-Step Migration Instructions

1. **Open Neon Console**: https://console.neon.tech
2. **Navigate to your database**
3. **Open SQL Editor tab**
4. **Copy entire content** from `docs/production_migration_complete.sql`
5. **Execute the script**
6. **Verify results** using verification queries at bottom of script

## What Gets Migrated

### Tables Added:

-   **subcategories**: Custom user expense categories with system defaults
-   **goals**: Savings goals with progress tracking

### Columns Added:

-   **users.recurring_lookahead_days**: User setting (7-90 days, default 14)

### Data Integrity:

-   CHECK constraints across all tables for positive amounts
-   Foreign key constraints with proper CASCADE behavior
-   Indexes for performance

### System Data:

-   17 default subcategories across all 4 expense categories
-   Proper "Other" fallback categories

## Verification Checklist

After running the script, verify these work:

-   [ ] Settings → Preferences loads without errors
-   [ ] Dashboard → Scheduled view respects lookahead setting
-   [ ] Subcategories appear in expense modals
-   [ ] Goals system accessible (empty but no errors)
-   [ ] API endpoints return 200:
    -   `GET /api/v1/user-data/settings/recurring-lookahead`
    -   `GET /api/v1/subcategories`
    -   `GET /api/v1/goals`

## Rollback Plan

**⚠️ Take Neon snapshot before migration!**

If issues occur, restore from snapshot or run:

```sql
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS recurring_lookahead_days;
-- Remove constraints as needed
```

## Files Involved

-   **Migration Script**: `docs/production_migration_complete.sql`
-   **Backend Models**: User, Subcategory, Goal classes updated
-   **Backend Routes**: user_data.py, subcategories.py, goals.py
-   **Frontend**: Settings page, Dashboard, various modals updated

## Related Issues

This migration enables:

-   Issue #98: Custom subcategories system ✅
-   Issue #4: Goals and savings tracking ✅
-   Issue #93: Recurring expense redesign (lookahead setting) ✅
-   Data integrity improvements across all tables ✅

After migration completion, all these features will be fully functional in production.

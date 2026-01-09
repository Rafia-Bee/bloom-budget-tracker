-- Migration: Add balance tracking fields to User model
-- Date: 2026-01-05
-- Issue: #149 - Phase 1: Database schema update
-- Alembic Revision: 9ef3d960b257
--
-- Description:
--   Adds new columns to the users table to support explicit balance tracking.
--   This replaces the fragile Income/Expense marker records with stable User fields.
--
-- New columns:
--   - balance_start_date: When user started tracking their balance
--   - user_initial_debit_balance: Starting debit balance (cents)
--   - user_initial_credit_limit: Starting credit limit (cents)
--   - user_initial_credit_debt: Starting credit debt (cents)
--   - balance_mode: "sync" (snapshot) or "cumulative" (additive)
--
-- Note: Also creates indexes on budget_periods table that were detected by Alembic

-- ============================================================
-- STEP 1: PRE-MIGRATION VERIFICATION
-- ============================================================
-- Run this first to see the current state of the users table

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Expected: Should NOT have balance_start_date, user_initial_debit_balance, etc.

-- ============================================================
-- STEP 2: ADD NEW COLUMNS TO USERS TABLE
-- ============================================================

-- Add balance_start_date (nullable, no default needed)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS balance_start_date DATE;

-- Add user_initial_debit_balance with default 0
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_initial_debit_balance INTEGER NOT NULL DEFAULT 0;

-- Add user_initial_credit_limit with default 0
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_initial_credit_limit INTEGER NOT NULL DEFAULT 0;

-- Add user_initial_credit_debt with default 0
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_initial_credit_debt INTEGER NOT NULL DEFAULT 0;

-- Add balance_mode with default 'sync'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS balance_mode VARCHAR(20) NOT NULL DEFAULT 'sync';

-- ============================================================
-- STEP 3: ADD CHECK CONSTRAINT FOR balance_mode
-- ============================================================

-- Add constraint to ensure balance_mode is valid
ALTER TABLE users
ADD CONSTRAINT check_user_balance_mode_valid
CHECK (balance_mode IN ('sync', 'cumulative'));

-- ============================================================
-- STEP 4: ADD INDEXES TO BUDGET_PERIODS (if not exist)
-- ============================================================
-- These were detected by Alembic as missing

CREATE INDEX IF NOT EXISTS ix_budget_periods_end_date ON budget_periods (end_date);
CREATE INDEX IF NOT EXISTS ix_budget_periods_start_date ON budget_periods (start_date);
CREATE INDEX IF NOT EXISTS ix_budget_periods_user_id ON budget_periods (user_id);

-- ============================================================
-- STEP 5: UPDATE ALEMBIC VERSION
-- ============================================================
-- This tells Flask-Migrate that the database is at the correct revision

UPDATE alembic_version SET version_num = '9ef3d960b257' WHERE version_num = 'j1k2l3m4n5o6';

-- If the above doesn't update any rows (version was different), insert directly:
-- INSERT INTO alembic_version (version_num) VALUES ('9ef3d960b257')
-- ON CONFLICT (version_num) DO NOTHING;

-- ============================================================
-- STEP 6: POST-MIGRATION VERIFICATION
-- ============================================================
-- Run these queries to confirm the migration was successful

-- 6a. Verify new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('balance_start_date', 'user_initial_debit_balance',
                      'user_initial_credit_limit', 'user_initial_credit_debt',
                      'balance_mode')
ORDER BY column_name;

-- Expected output (5 rows):
-- balance_mode              | character varying | NO       | 'sync'::character varying
-- balance_start_date        | date              | YES      |
-- user_initial_credit_debt  | integer           | NO       | 0
-- user_initial_credit_limit | integer           | NO       | 0
-- user_initial_debit_balance| integer           | NO       | 0

-- 6b. Verify constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'check_user_balance_mode_valid';

-- Expected: check_user_balance_mode_valid | ((balance_mode)::text = ANY ...)

-- 6c. Verify all users have default values
SELECT id, email, balance_mode, user_initial_debit_balance
FROM users
LIMIT 5;

-- Expected: All users should have balance_mode='sync' and user_initial_debit_balance=0

-- 6d. Verify budget_periods indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'budget_periods';

-- Expected: Should include ix_budget_periods_end_date, ix_budget_periods_start_date, ix_budget_periods_user_id

-- 6e. Verify alembic version
SELECT version_num FROM alembic_version;

-- Expected: 9ef3d960b257

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
-- Save this separately in case you need to undo the migration

/*
-- To rollback this migration:

ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_balance_mode_valid;
ALTER TABLE users DROP COLUMN IF EXISTS balance_mode;
ALTER TABLE users DROP COLUMN IF EXISTS user_initial_credit_debt;
ALTER TABLE users DROP COLUMN IF EXISTS user_initial_credit_limit;
ALTER TABLE users DROP COLUMN IF EXISTS user_initial_debit_balance;
ALTER TABLE users DROP COLUMN IF EXISTS balance_start_date;

DROP INDEX IF EXISTS ix_budget_periods_user_id;
DROP INDEX IF EXISTS ix_budget_periods_start_date;
DROP INDEX IF EXISTS ix_budget_periods_end_date;

UPDATE alembic_version SET version_num = 'j1k2l3m4n5o6' WHERE version_num = '9ef3d960b257';
*/

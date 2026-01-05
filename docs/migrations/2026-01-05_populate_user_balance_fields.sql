-- Migration: Populate User balance fields from Income/Expense markers
-- Date: 2026-01-05
-- Issue: #149 - Phase 2: Data migration
-- 
-- Description:
--   Migrates balance tracking data from Income/Expense marker records
--   to the new User model fields added in Phase 1.
--
-- IMPORTANT: Run Phase 1 SQL first (2026-01-05_add_user_balance_fields.sql)
--
-- This migration:
--   1. Sets balance_start_date from earliest "Initial Balance" income
--   2. Sets user_initial_debit_balance from that income record
--   3. Sets user_initial_credit_limit from earliest salary period
--   4. Sets user_initial_credit_debt from "Pre-existing Credit Card Debt" expense
--   5. Sets balance_mode = 'sync' for all users (default)

-- ============================================================
-- STEP 1: PRE-MIGRATION VERIFICATION
-- ============================================================

-- Check how many users need migration (balance_start_date is NULL)
SELECT COUNT(*) as users_needing_migration
FROM users
WHERE balance_start_date IS NULL;

-- Check how many have Initial Balance income records
SELECT u.id, u.email, i.amount, i.actual_date
FROM users u
LEFT JOIN income i ON i.user_id = u.id AND i.type = 'Initial Balance' AND i.deleted_at IS NULL
WHERE u.balance_start_date IS NULL
ORDER BY u.id;

-- ============================================================
-- STEP 2: MIGRATE DEBIT BALANCE DATA
-- ============================================================

-- Update users with their earliest Initial Balance data
WITH earliest_initial_balance AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        amount,
        actual_date
    FROM income
    WHERE type = 'Initial Balance'
      AND deleted_at IS NULL
    ORDER BY user_id, actual_date ASC
)
UPDATE users u
SET 
    balance_start_date = eib.actual_date,
    user_initial_debit_balance = eib.amount
FROM earliest_initial_balance eib
WHERE u.id = eib.user_id
  AND u.balance_start_date IS NULL;

-- ============================================================
-- STEP 3: MIGRATE CREDIT LIMIT DATA
-- ============================================================

-- Update users with credit limit from their earliest salary period
WITH earliest_salary_period AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        credit_limit,
        start_date
    FROM salary_periods
    ORDER BY user_id, start_date ASC
)
UPDATE users u
SET 
    user_initial_credit_limit = esp.credit_limit,
    -- If balance_start_date wasn't set (no Initial Balance), use salary period date
    balance_start_date = COALESCE(u.balance_start_date, esp.start_date)
FROM earliest_salary_period esp
WHERE u.id = esp.user_id
  AND u.user_initial_credit_limit = 0;

-- ============================================================
-- STEP 4: MIGRATE CREDIT DEBT DATA
-- ============================================================

-- Update users with their earliest Pre-existing Credit Card Debt
WITH earliest_debt_marker AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        amount
    FROM expenses
    WHERE category = 'Debt'
      AND subcategory = 'Credit Card'
      AND name = 'Pre-existing Credit Card Debt'
      AND deleted_at IS NULL
    ORDER BY user_id, date ASC
)
UPDATE users u
SET user_initial_credit_debt = edm.amount
FROM earliest_debt_marker edm
WHERE u.id = edm.user_id
  AND u.user_initial_credit_debt = 0;

-- For users without a debt marker, calculate from salary period
-- debt = credit_limit - initial_credit_balance
WITH calculated_debt AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        GREATEST(0, credit_limit - initial_credit_balance) as calculated_debt
    FROM salary_periods
    ORDER BY user_id, start_date ASC
)
UPDATE users u
SET user_initial_credit_debt = cd.calculated_debt
FROM calculated_debt cd
WHERE u.id = cd.user_id
  AND u.user_initial_credit_debt = 0
  AND cd.calculated_debt > 0;

-- ============================================================
-- STEP 5: SET DEFAULT BALANCE MODE
-- ============================================================

-- All users default to 'sync' mode (already set by schema default)
-- This update is for any users that might have NULL somehow
UPDATE users
SET balance_mode = 'sync'
WHERE balance_mode IS NULL OR balance_mode = '';

-- ============================================================
-- STEP 6: POST-MIGRATION VERIFICATION
-- ============================================================

-- 6a. Check how many users were migrated
SELECT 
    COUNT(*) as total_users,
    COUNT(balance_start_date) as migrated_users,
    COUNT(*) - COUNT(balance_start_date) as not_migrated
FROM users;

-- 6b. View migrated user data (sample)
SELECT 
    id,
    email,
    balance_start_date,
    user_initial_debit_balance / 100.0 as debit_balance_eur,
    user_initial_credit_limit / 100.0 as credit_limit_eur,
    user_initial_credit_debt / 100.0 as credit_debt_eur,
    balance_mode
FROM users
WHERE balance_start_date IS NOT NULL
ORDER BY id
LIMIT 10;

-- 6c. Verify data matches original income records
SELECT 
    u.id,
    u.email,
    u.user_initial_debit_balance as user_amount,
    i.amount as income_amount,
    CASE WHEN u.user_initial_debit_balance = i.amount THEN 'MATCH' ELSE 'MISMATCH' END as status
FROM users u
JOIN income i ON i.user_id = u.id AND i.type = 'Initial Balance' AND i.deleted_at IS NULL
WHERE u.balance_start_date IS NOT NULL
ORDER BY u.id;

-- 6d. Verify balance_mode is set for all users
SELECT balance_mode, COUNT(*) as user_count
FROM users
GROUP BY balance_mode;

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================
-- To rollback this data migration (NOT the schema):

/*
UPDATE users
SET 
    balance_start_date = NULL,
    user_initial_debit_balance = 0,
    user_initial_credit_limit = 0,
    user_initial_credit_debt = 0,
    balance_mode = 'sync';
*/

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- After running this migration:
-- 1. The original Income/Expense marker records are NOT deleted
-- 2. They will be removed in Phase 6 after verifying the new system works
-- 3. The balance service (Phase 3) will be updated to use User fields
-- 4. Until Phase 3, the app will continue using Income/Expense markers

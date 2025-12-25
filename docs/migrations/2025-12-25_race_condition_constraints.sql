-- Production Migration: Race Condition Constraints
-- Issue: #112 (covers #108, #109, #110, #111)
-- Date: 2025-12-25
--
-- INSTRUCTIONS:
-- 1. First run the duplicate check queries at the bottom
-- 2. If no duplicates, run the migration statements
-- 3. Run this on Neon SQL Editor (https://console.neon.tech)
--
-- Related Flask-Migrate revision: g1h2i3j4k5l6

-- ============================================================
-- STEP 1: CHECK FOR DUPLICATES (run these first!)
-- ============================================================

-- Check for duplicate subcategories
SELECT user_id, category, name, COUNT(*) as duplicate_count
FROM subcategories
GROUP BY user_id, category, name
HAVING COUNT(*) > 1;

-- Check for duplicate Initial Balance entries
SELECT user_id, COUNT(*) as duplicate_count
FROM income
WHERE type = 'Initial Balance'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Check for duplicate recurring expense entries
SELECT user_id, recurring_template_id, date, COUNT(*) as duplicate_count
FROM expenses
WHERE recurring_template_id IS NOT NULL
GROUP BY user_id, recurring_template_id, date
HAVING COUNT(*) > 1;

-- ============================================================
-- STEP 2: MIGRATION (only run if no duplicates found)
-- ============================================================

-- 1. Unique constraint for subcategories (user_id, category, name)
-- Prevents: Creating duplicate subcategory names in same category
ALTER TABLE subcategories
ADD CONSTRAINT uq_subcategory_user_category_name
UNIQUE (user_id, category, name);

-- 2. Partial unique index: Only one "Initial Balance" income per user
-- Prevents: Multiple initial balance entries from race conditions
CREATE UNIQUE INDEX IF NOT EXISTS uq_income_initial_balance_per_user
ON income (user_id)
WHERE type = 'Initial Balance';

-- 3. Partial unique index: One expense per recurring template per date
-- Prevents: Duplicate recurring expense generation on same day
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_recurring_date
ON expenses (user_id, recurring_template_id, date)
WHERE recurring_template_id IS NOT NULL;

-- ============================================================
-- ROLLBACK (if needed)
-- ============================================================

-- DROP INDEX IF EXISTS uq_expense_recurring_date;
-- DROP INDEX IF EXISTS uq_income_initial_balance_per_user;
-- ALTER TABLE subcategories DROP CONSTRAINT uq_subcategory_user_category_name;

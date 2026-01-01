-- Flexible Sub-Periods Migration for Bloom Budget Tracker
-- Issue: #9 - Flexible Sub-Period Division
-- Date: 2026-01-01
--
-- This migration:
-- 1. Adds num_sub_periods column to salary_periods table (default: 4)
-- 2. Updates budget_periods date_range constraint to allow single-day periods
-- 3. Updates credit_limit constraint to allow 0 (no credit card users)
--
-- Run this in Neon SQL Editor for production deployment.

-- ============================================================
-- 1. Add num_sub_periods column to salary_periods
-- ============================================================
ALTER TABLE salary_periods
ADD COLUMN IF NOT EXISTS num_sub_periods INTEGER NOT NULL DEFAULT 4;

-- ============================================================
-- 2. Update budget_periods date_range constraint
--    Change from: start_date < end_date
--    To: start_date <= end_date (allows single-day periods)
-- ============================================================

-- PostgreSQL supports ALTER CONSTRAINT, but for CHECK constraints
-- we need to drop and recreate
ALTER TABLE budget_periods
DROP CONSTRAINT IF EXISTS check_budget_period_date_range;

ALTER TABLE budget_periods
ADD CONSTRAINT check_budget_period_date_range
CHECK (start_date <= end_date);

-- ============================================================
-- 3. Update salary_periods credit_limit constraint
--    Change from: credit_limit > 0
--    To: credit_limit >= 0 (allows users without credit cards)
-- ============================================================
ALTER TABLE salary_periods
DROP CONSTRAINT IF EXISTS check_salary_period_positive_credit_limit;

ALTER TABLE salary_periods
ADD CONSTRAINT check_salary_period_positive_credit_limit
CHECK (credit_limit >= 0);

-- ============================================================
-- 4. Update budget_periods week_number constraint
--    Change from: week_number BETWEEN 1 AND 4
--    To: week_number >= 1 (allows any number of sub-periods)
-- ============================================================
ALTER TABLE budget_periods
DROP CONSTRAINT IF EXISTS check_budget_period_week_number;

ALTER TABLE budget_periods
ADD CONSTRAINT check_budget_period_week_number
CHECK (week_number IS NULL OR week_number >= 1);

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify num_sub_periods column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'salary_periods'
AND column_name = 'num_sub_periods';

-- Verify constraints were updated
SELECT
    tc.constraint_name,
    tc.table_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('salary_periods', 'budget_periods')
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

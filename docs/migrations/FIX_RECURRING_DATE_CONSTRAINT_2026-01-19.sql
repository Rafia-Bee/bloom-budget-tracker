-- Migration: Fix recurring date range constraint
-- Date: 2026-01-19
-- Issue: CHECK constraint fails when start_date == end_date (valid for one-time scheduled payments)
-- Change: start_date < end_date -> start_date <= end_date

-- ============================================
-- STEP 1: Check current constraints (verification)
-- ============================================
-- Run this first to see current state:
/*
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE '%recurring%date_range%';
*/

-- ============================================
-- STEP 2: Drop old constraints
-- ============================================
ALTER TABLE recurring_expenses DROP CONSTRAINT IF EXISTS check_recurring_expense_date_range;
ALTER TABLE recurring_income DROP CONSTRAINT IF EXISTS check_recurring_income_date_range;

-- ============================================
-- STEP 3: Add corrected constraints
-- ============================================
-- Changed from "start_date < end_date" to "start_date <= end_date"
ALTER TABLE recurring_expenses
ADD CONSTRAINT check_recurring_expense_date_range
CHECK (end_date IS NULL OR start_date <= end_date);

ALTER TABLE recurring_income
ADD CONSTRAINT check_recurring_income_date_range
CHECK (end_date IS NULL OR start_date <= end_date);

-- ============================================
-- STEP 4: Verify new constraints
-- ============================================
-- Run this to confirm the change:
/*
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE '%recurring%date_range%';
*/

-- Expected output:
-- check_recurring_expense_date_range | CHECK ((end_date IS NULL) OR (start_date <= end_date))
-- check_recurring_income_date_range  | CHECK ((end_date IS NULL) OR (start_date <= end_date))

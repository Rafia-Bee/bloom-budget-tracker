-- Soft Delete Migration for Bloom Budget Tracker
-- Issue: #61 - Implement soft delete pattern
-- Date: 2025-12-27
--
-- This migration adds deleted_at columns to support soft delete functionality.
-- Records with deleted_at = NULL are active; records with a timestamp are soft-deleted.
--
-- Run this in Neon SQL Editor for production deployment.

-- Add deleted_at column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);

-- Add deleted_at column to income table
ALTER TABLE income ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_income_deleted_at ON income(deleted_at);

-- Add deleted_at column to debts table
ALTER TABLE debts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_debts_deleted_at ON debts(deleted_at);

-- Add deleted_at column to recurring_expenses table
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_deleted_at ON recurring_expenses(deleted_at);

-- Verify columns were added
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'deleted_at'
    AND table_schema = 'public'
ORDER BY table_name;

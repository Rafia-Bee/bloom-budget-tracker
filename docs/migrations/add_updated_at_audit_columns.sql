-- Production Migration: Add updated_at Audit Columns
-- Issue: #63 (Simplified)
-- Date: 2024-12-31
-- Run on: Neon PostgreSQL SQL Editor
--
-- This adds updated_at columns to track when records were last modified.
-- Simplified approach: Only tracking modification timestamps, not who modified
-- (since all records are user-scoped via user_id already).

-- Step 1: Add columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE expenses SET updated_at = created_at WHERE updated_at IS NULL;

-- Step 2: Add columns to income table
ALTER TABLE income ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE income SET updated_at = created_at WHERE updated_at IS NULL;

-- Step 3: Add columns to salary_periods table
ALTER TABLE salary_periods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE salary_periods SET updated_at = created_at WHERE updated_at IS NULL;

-- Step 4: Update alembic version (after successful migration)
INSERT INTO alembic_version (version_num) VALUES ('i1j2k3l4m5n6')
ON CONFLICT (version_num) DO NOTHING;

-- Verification (run these to confirm):
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'expenses' AND column_name = 'updated_at';

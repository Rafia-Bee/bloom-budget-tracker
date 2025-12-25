-- Migration: Add exchange_rate_used to expenses and income tables
-- Run this on Neon SQL Editor for production database
-- Date: 2025-12-25

-- Add exchange_rate_used column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exchange_rate_used FLOAT;

-- Add exchange_rate_used column to income table
ALTER TABLE income ADD COLUMN IF NOT EXISTS exchange_rate_used FLOAT;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('expenses', 'income')
  AND column_name = 'exchange_rate_used';

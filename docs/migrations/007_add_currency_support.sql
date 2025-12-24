-- Migration: Add Multi-Currency Support
-- Issue: #7
-- Date: 2025-12-24
--
-- Run this script on Neon PostgreSQL SQL Editor
-- IMPORTANT: Backup data before running in production

-- 1. Add default_currency to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) NOT NULL DEFAULT 'EUR';

-- 2. Add currency fields to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS original_amount INTEGER;

-- 3. Add currency fields to income table
ALTER TABLE income
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE income
ADD COLUMN IF NOT EXISTS original_amount INTEGER;

-- 4. Create exchange_rates table for caching API responses
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate FLOAT NOT NULL CHECK (rate > 0),
    rate_date DATE NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (base_currency, target_currency, rate_date)
);

-- 5. Create indexes for exchange rates lookup
CREATE INDEX IF NOT EXISTS idx_exchange_rate_lookup
ON exchange_rates (base_currency, target_currency, rate_date);

CREATE INDEX IF NOT EXISTS ix_exchange_rates_base_currency
ON exchange_rates (base_currency);

CREATE INDEX IF NOT EXISTS ix_exchange_rates_target_currency
ON exchange_rates (target_currency);

CREATE INDEX IF NOT EXISTS ix_exchange_rates_rate_date
ON exchange_rates (rate_date);

-- Verification queries (uncomment to run):
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'default_currency';
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'expenses' AND column_name IN ('currency', 'original_amount');
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'income' AND column_name IN ('currency', 'original_amount');
-- SELECT * FROM exchange_rates LIMIT 1;

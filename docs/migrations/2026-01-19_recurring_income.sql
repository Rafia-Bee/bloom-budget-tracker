-- Migration: Add RecurringIncome model and payment_date_adjustment
-- Issue: #177 - Recurring Income Feature
-- Date: 2026-01-19
--
-- Run this script in Neon SQL Editor AFTER verifying the current schema
--
-- IMPORTANT: Run these verification queries first:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'income';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'recurring_income';

-- Step 1: Create recurring_income table
CREATE TABLE recurring_income (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount INTEGER NOT NULL,
    income_type VARCHAR(50) NOT NULL DEFAULT 'Salary',
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    frequency VARCHAR(20) NOT NULL,
    frequency_value INTEGER,
    day_of_month INTEGER,
    day_of_week INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT check_recurring_income_positive_amount CHECK (amount > 0),
    CONSTRAINT check_recurring_income_day_of_month CHECK (day_of_month IS NULL OR (day_of_month BETWEEN 1 AND 31)),
    CONSTRAINT check_recurring_income_day_of_week CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)),
    CONSTRAINT check_recurring_income_date_range CHECK (end_date IS NULL OR start_date < end_date),
    CONSTRAINT check_recurring_income_frequency_value CHECK (frequency_value IS NULL OR frequency_value > 0)
);

-- Step 2: Create index on deleted_at for soft delete queries
CREATE INDEX ix_recurring_income_deleted_at ON recurring_income(deleted_at);

-- Step 3: Add recurring_income_id column to income table
ALTER TABLE income ADD COLUMN recurring_income_id INTEGER;

-- Step 4: Create index on the new foreign key
CREATE INDEX ix_income_recurring_income_id ON income(recurring_income_id);

-- Step 5: Add foreign key constraint
ALTER TABLE income ADD CONSTRAINT fk_income_recurring_income_id
    FOREIGN KEY (recurring_income_id) REFERENCES recurring_income(id) ON DELETE SET NULL;

-- Step 6: Add payment_date_adjustment column to users table
ALTER TABLE users ADD COLUMN payment_date_adjustment VARCHAR(20) NOT NULL DEFAULT 'exact_date';

-- Step 7: Add check constraint for valid payment_date_adjustment values
ALTER TABLE users ADD CONSTRAINT check_user_payment_date_adjustment_valid
    CHECK (payment_date_adjustment IN ('exact_date', 'previous_workday', 'next_workday'));

-- Verification queries (run after migration):
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns WHERE table_name = 'recurring_income';
--
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'income'
-- AND column_name = 'recurring_income_id';
--
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users'
-- AND column_name = 'payment_date_adjustment';

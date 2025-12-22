-- Bloom Production Database Migration Script
-- Run this on Neon PostgreSQL production database
--
-- This combines all pending migrations:
-- 1. Subcategories system (a1b2c3d4e5f6)
-- 2. Goals system (b1c2d3e4f5a6)
-- 3. Data integrity constraints (e8f5c3a1b9d4)
-- 4. Recurring expense lookahead (c5d8e9a2b1f3)

-- ============================================================================
-- 1. ADD SUBCATEGORIES TABLE AND SYSTEM DATA
-- ============================================================================

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_subcategories_user_id ON subcategories(user_id);
CREATE INDEX IF NOT EXISTS ix_subcategories_category ON subcategories(category);

-- Add foreign key constraint name (for consistency)
ALTER TABLE subcategories
DROP CONSTRAINT IF EXISTS fk_subcategory_user;

ALTER TABLE subcategories
ADD CONSTRAINT fk_subcategory_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Insert system default subcategories (only if they don't exist)
INSERT INTO subcategories (user_id, category, name, is_system, is_active, created_at, updated_at)
SELECT NULL, category, name, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
    -- Fixed Expenses
    ('Fixed Expenses', 'Rent'),
    ('Fixed Expenses', 'Utilities'),
    ('Fixed Expenses', 'Insurance'),
    ('Fixed Expenses', 'Subscriptions'),
    ('Fixed Expenses', 'Other'),
    -- Flexible Expenses
    ('Flexible Expenses', 'Food'),
    ('Flexible Expenses', 'Transportation'),
    ('Flexible Expenses', 'Entertainment'),
    ('Flexible Expenses', 'Shopping'),
    ('Flexible Expenses', 'Health'),
    ('Flexible Expenses', 'Other'),
    -- Savings & Investments
    ('Savings & Investments', 'Emergency Fund'),
    ('Savings & Investments', 'Investments'),
    ('Savings & Investments', 'Savings Goals'),
    ('Savings & Investments', 'Other'),
    -- Debt Payments
    ('Debt Payments', 'Credit Card'),
    ('Debt Payments', 'Other')
) AS system_subs(category, name)
WHERE NOT EXISTS (
    SELECT 1 FROM subcategories
    WHERE subcategories.category = system_subs.category
    AND subcategories.name = system_subs.name
    AND subcategories.is_system = TRUE
);

-- ============================================================================
-- 2. ADD GOALS TABLE
-- ============================================================================

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_amount INTEGER NOT NULL,
    target_date DATE,
    subcategory_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT check_goal_positive_amount CHECK (target_amount > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_goal_user_active ON goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_goal_user_subcategory ON goals(user_id, subcategory_name);

-- Add foreign key constraint name (for consistency)
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS fk_goal_user;

ALTER TABLE goals
ADD CONSTRAINT fk_goal_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. ADD DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Add check constraints to existing tables (only if they don't exist)
DO $$
BEGIN
    -- User constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_user_failed_attempts') THEN
        ALTER TABLE users ADD CONSTRAINT check_user_failed_attempts CHECK (failed_login_attempts >= 0);
    END IF;

    -- Expense constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_expense_positive_amount') THEN
        ALTER TABLE expenses ADD CONSTRAINT check_expense_positive_amount CHECK (amount > 0);
    END IF;

    -- Income constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_income_positive_amount') THEN
        ALTER TABLE income ADD CONSTRAINT check_income_positive_amount CHECK (amount > 0);
    END IF;

    -- Debt constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_debt_positive_original') THEN
        ALTER TABLE debts ADD CONSTRAINT check_debt_positive_original CHECK (original_amount > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_debt_positive_current') THEN
        ALTER TABLE debts ADD CONSTRAINT check_debt_positive_current CHECK (current_balance >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_debt_positive_payment') THEN
        ALTER TABLE debts ADD CONSTRAINT check_debt_positive_payment CHECK (monthly_payment > 0);
    END IF;

    -- Recurring expense constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_recurring_positive_amount') THEN
        ALTER TABLE recurring_expenses ADD CONSTRAINT check_recurring_positive_amount CHECK (amount > 0);
    END IF;

    -- Budget period constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_budget_period_date_order') THEN
        ALTER TABLE budget_periods ADD CONSTRAINT check_budget_period_date_order CHECK (start_date <= end_date);
    END IF;

    -- Salary period constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_salary_period_date_order') THEN
        ALTER TABLE salary_periods ADD CONSTRAINT check_salary_period_date_order CHECK (start_date <= end_date);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_salary_period_positive_credit_limit') THEN
        ALTER TABLE salary_periods ADD CONSTRAINT check_salary_period_positive_credit_limit CHECK (credit_limit >= 0);
    END IF;
END $$;

-- ============================================================================
-- 4. ADD RECURRING EXPENSE LOOKAHEAD SETTING
-- ============================================================================

-- Add recurring_lookahead_days column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS recurring_lookahead_days INTEGER NOT NULL DEFAULT 14;

-- Add check constraint for lookahead range
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_user_lookahead_range') THEN
        ALTER TABLE users ADD CONSTRAINT check_user_lookahead_range
        CHECK (recurring_lookahead_days >= 7 AND recurring_lookahead_days <= 90);
    END IF;
END $$;

-- ============================================================================
-- 5. UPDATE ALEMBIC VERSION TABLE (Optional - for tracking)
-- ============================================================================

-- Update alembic_version table to reflect latest migration
-- Note: This assumes the table exists. If using manual SQL, this may not be needed.
UPDATE alembic_version SET version_num = 'c5d8e9a2b1f3' WHERE version_num IS NOT NULL;

-- If alembic_version doesn't exist or is empty, create it
INSERT INTO alembic_version (version_num)
SELECT 'c5d8e9a2b1f3'
WHERE NOT EXISTS (SELECT 1 FROM alembic_version);

-- ============================================================================
-- 6. VERIFICATION QUERIES
-- ============================================================================

-- Check that all tables exist
SELECT
    'subcategories' as table_name,
    COUNT(*) as system_subcategory_count
FROM subcategories
WHERE is_system = TRUE

UNION ALL

SELECT
    'goals' as table_name,
    COUNT(*) as total_count
FROM goals

UNION ALL

SELECT
    'users_with_lookahead' as table_name,
    COUNT(*) as users_count
FROM users
WHERE recurring_lookahead_days IS NOT NULL;

-- Check constraints
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name
FROM pg_constraint
WHERE conname LIKE 'check_%'
AND conrelid IN (
    'users'::regclass,
    'expenses'::regclass,
    'goals'::regclass,
    'subcategories'::regclass
)
ORDER BY conrelid, conname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- This script adds:
-- ✅ Subcategories table with system defaults
-- ✅ Goals table with constraints
-- ✅ Data integrity constraints across all tables
-- ✅ User recurring_lookahead_days setting (7-90 days)
-- ✅ Proper foreign keys and indexes
-- ✅ Alembic version tracking

-- After running this script:
-- 1. Verify all tables exist and have data
-- 2. Test API endpoints work correctly
-- 3. Check Settings → Preferences loads without errors
-- 4. Verify Scheduled/Upcoming views work with lookahead setting

COMMIT;
-- Migration: Rename user_initial_credit_debt to user_initial_credit_available
-- Date: 2026-01-08
-- Issue: #149 Phase 6 - Simplify credit storage
-- Alembic Revision: 34eed8893f3a

-- Forward migration
-- 1. Add new column
ALTER TABLE users ADD COLUMN user_initial_credit_available INTEGER NOT NULL DEFAULT 0;

-- 2. Migrate data: available = limit - debt
UPDATE users
SET user_initial_credit_available = user_initial_credit_limit - user_initial_credit_debt
WHERE user_initial_credit_limit > 0;

-- 3. Drop old column
ALTER TABLE users DROP COLUMN user_initial_credit_debt;

-- 4. Update alembic version
UPDATE alembic_version SET version_num = '34eed8893f3a';

-- Verification (run after to confirm)
SELECT
    email,
    user_initial_credit_limit,
    user_initial_credit_available
FROM users
WHERE user_initial_credit_limit > 0;

-- Rollback (if needed)
-- ALTER TABLE users ADD COLUMN user_initial_credit_debt INTEGER NOT NULL DEFAULT 0;
-- UPDATE users SET user_initial_credit_debt = user_initial_credit_limit - user_initial_credit_available WHERE user_initial_credit_limit > 0;
-- ALTER TABLE users DROP COLUMN user_initial_credit_available;
-- UPDATE alembic_version SET version_num = '9ef3d960b257';

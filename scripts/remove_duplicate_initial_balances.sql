-- Migration: Remove duplicate Initial Balance entries
-- Run this in Neon SQL Editor after deploying the fix (commit 76fb0c0)
--
-- This query:
-- 1. Finds all users with multiple Initial Balance entries
-- 2. Keeps the earliest one (by actual_date)
-- 3. Deletes all others

-- Step 1: Preview what will be deleted (SAFE - read-only)
SELECT
    i.id,
    i.user_id,
    i.type,
    i.amount / 100.0 as amount_euros,
    i.actual_date,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY actual_date ASC) as row_num
FROM income i
WHERE i.type = 'Initial Balance'
ORDER BY user_id, actual_date;

-- Step 2: Delete duplicates (keeps earliest, deletes rest)
-- ⚠️ ONLY RUN THIS AFTER REVIEWING STEP 1 OUTPUT
DELETE FROM income
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY actual_date ASC) as row_num
        FROM income
        WHERE type = 'Initial Balance'
    ) sub
    WHERE row_num > 1
);

-- Step 3: Verify cleanup (SAFE - read-only)
-- Should show exactly 1 Initial Balance per user
SELECT
    user_id,
    COUNT(*) as initial_balance_count
FROM income
WHERE type = 'Initial Balance'
GROUP BY user_id;

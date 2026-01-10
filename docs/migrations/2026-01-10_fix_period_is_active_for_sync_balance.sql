-- Migration: Fix is_active flag for salary periods in sync mode balance calculation
-- Date: 2026-01-10
-- Issue: Balance calculation bug - Period 1 has is_active=false causing incorrect sync mode calculation
--
-- Root Cause Analysis:
-- =====================
-- The balance_service.py uses is_active=True filter when finding the earliest period
-- to calculate sync mode balances. When Period 1 was marked as inactive (likely during
-- period transition), the calculation started from Period 2's start date instead of
-- the anchor date, causing:
--   - Income only counted from 2025-12-20 (1,733 cents instead of 313,628 cents)
--   - Expenses only counted from 2025-12-20 (37,530 cents instead of 607,664 cents)
--   - Wrong balance: 307,200 + 1,733 - 37,530 = 271,403 cents (€2,714.03)
--   - Correct balance: 307,200 + 313,628 - 607,664 = 13,164 cents (€131.64)
--
-- This fix ensures Period 1 is marked as active so sync mode calculations work correctly.

-- STEP 1: Check current state of salary_periods for affected user
-- ================================================================
SELECT id, start_date, end_date, initial_debit_balance, is_active
FROM salary_periods
WHERE user_id = (SELECT id FROM users WHERE email = 'saiyuriye.rafia@gmail.com')
ORDER BY start_date;
-- Expected: Period 1 (id=1) has is_active=false

-- STEP 2: Fix Period 1 is_active flag
-- ====================================
UPDATE salary_periods
SET is_active = true
WHERE id = 1
AND user_id = (SELECT id FROM users WHERE email = 'saiyuriye.rafia@gmail.com');

-- STEP 3: Verify the fix
-- ======================
SELECT id, start_date, end_date, initial_debit_balance, is_active
FROM salary_periods
WHERE user_id = (SELECT id FROM users WHERE email = 'saiyuriye.rafia@gmail.com')
ORDER BY start_date;
-- Expected: Both periods should now have is_active=true

-- STEP 4: Verify balance calculation inputs
-- ==========================================
-- After this fix, the balance service should now calculate:
-- - earliest_date = 2025-11-20 (Period 1's start date)
-- - Income from 2025-11-20 to 2026-01-19 = 313,628 cents
-- - Expenses from 2025-11-20 to 2026-01-19 = 607,664 cents
-- - Balance = 307,200 + 313,628 - 607,664 = 13,164 cents = €131.64

-- OPTIONAL: Find and fix any other users with same issue
-- ======================================================
-- Check if any other users have old salary periods marked inactive
-- that could cause similar calculation issues:
/*
SELECT
    u.email,
    sp.id as period_id,
    sp.start_date,
    sp.end_date,
    sp.is_active
FROM salary_periods sp
JOIN users u ON sp.user_id = u.id
WHERE sp.is_active = false
ORDER BY u.email, sp.start_date;
*/

-- NOTE: Consider whether old/completed periods should remain active
-- for sync mode calculations, or if the code should be fixed to not
-- filter by is_active when determining earliest_date.

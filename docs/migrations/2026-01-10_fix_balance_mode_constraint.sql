-- Migration: Fix balance_mode constraint to use 'budget' instead of 'cumulative'
-- Date: 2026-01-10
-- Issue: #165
--
-- Root cause: The initial migration (2026-01-05) created constraint with 'cumulative'
-- but the code uses 'budget'. This causes "check constraint violation" when switching modes.

-- STEP 1: DROP THE OLD CONSTRAINT
-- ================================
ALTER TABLE users
DROP CONSTRAINT IF EXISTS check_user_balance_mode_valid;

-- STEP 2: UPDATE ANY EXISTING 'cumulative' VALUES TO 'budget'
-- ===========================================================
-- (In case any rows somehow have 'cumulative' value)
UPDATE users
SET balance_mode = 'budget'
WHERE balance_mode = 'cumulative';

-- STEP 3: ADD THE CORRECTED CONSTRAINT
-- ====================================
ALTER TABLE users
ADD CONSTRAINT check_user_balance_mode_valid
CHECK (balance_mode IN ('sync', 'budget'));

-- STEP 4: VERIFICATION
-- ====================
-- Verify constraint exists with correct values
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'check_user_balance_mode_valid';
-- Expected: check_user_balance_mode_valid | ((balance_mode)::text = ANY (ARRAY['sync'::text, 'budget'::text]))

-- Verify all users have valid balance_mode
SELECT balance_mode, COUNT(*) as user_count
FROM users
GROUP BY balance_mode;
-- Expected: All rows should be 'sync' or 'budget'

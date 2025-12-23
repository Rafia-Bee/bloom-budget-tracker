-- Fix Savings & Investments default subcategories
-- Should only have "Other" as default, but production has 4 extra ones

-- Step 1: Show what will be deleted (for verification)
SELECT
    category,
    name as subcategory_name,
    id as subcategory_id,
    is_system,
    user_id
FROM subcategories
WHERE category = 'Savings & Investments'
  AND is_system = true
  AND name != 'Other';

-- Step 2: Delete the incorrect default subcategories
-- Keep only "Other" for Savings & Investments category
DELETE FROM subcategories
WHERE category = 'Savings & Investments'
  AND is_system = true
  AND name != 'Other';

-- Step 3: Verify the fix - should only show "Other" now
SELECT
    category,
    name as subcategory_name,
    id as subcategory_id,
    is_system,
    user_id
FROM subcategories
WHERE category = 'Savings & Investments'
  AND is_system = true
ORDER BY name;

-- Step 4: Show updated counts by category
SELECT
    category,
    STRING_AGG(name, ', ' ORDER BY name) as subcategory_names,
    COUNT(*) as total_count
FROM subcategories
WHERE is_system = true
GROUP BY category
ORDER BY category;
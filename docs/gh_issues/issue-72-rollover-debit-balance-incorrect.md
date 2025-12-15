# Rollover Debit Balance Calculation Incorrect

## Bug Description

The "Week 4 Ending Soon" rollover prompt shows incorrect debit balance for the next period. Credit available calculation is correct, but debit balance is wrong.

## Observed Behavior

Rollover prompt shows:

-   **Debit: €-1163.63** ❌ WRONG
-   **Credit Available: €511.77 / €1500.00** ✅ CORRECT

## Expected Behavior

Based on exported data analysis:

-   **Debit should be: €232.03**

## Current Period Details

Period: 2025-11-20 to 2025-12-19

-   Initial debit balance: €3072.00
-   Income: €303.50 (Nov 27)
-   Credit limit: €1500.00
-   Initial credit balance: €89.42
-   Fixed bills total: €2337.38

## Possible Root Causes

1. **Future expenses included**: Scheduled expenses (Dec 19, Dec 20, Jan 15, Jan 20, Feb 15, Feb 20, etc.) may be incorrectly included in current period calculations
2. **Date range filtering bug**: Expenses might not be filtered correctly by `start_date` and `end_date` of salary period
3. **Double-counting**: Some expenses might be counted multiple times
4. **Recurring expense handling**: Generated future expenses from recurring templates might be included incorrectly

## Analysis Needed

The rollover calculation needs to:

1. Only include expenses within the current salary period dates (Nov 20 - Dec 19)
2. Exclude scheduled expenses for future periods
3. Correctly sum debit card expenses vs credit card expenses
4. Account for all income within the period

## Files to Investigate

-   `frontend/src/components/SalaryPeriodRolloverPrompt.jsx` - Rollover UI and calculation
-   `backend/routes/salary_periods.py` - GET /salary-periods/current endpoint
-   Any logic that calculates ending balances for a salary period
-   Date filtering logic for expenses within a salary period

## Test Data

Full exported data available in issue description for reproduction.

## Impact

High - Users cannot trust the rollover calculations, leading to incorrect budget planning for next period.

# Comprehensive Calculation Review & Audit

## Summary

Thoroughly review all financial calculations in the app to identify and fix potential bugs, inconsistencies, and edge cases. Ensure all balance calculations, carryover logic, and budget assignments are accurate and tested.

## Background

Several calculation issues have been identified or fixed:

-   **Issue #89**: Debit/Credit balance calculations (RESOLVED with balance_service.py)
-   **Issue #72**: Rollover debit balance incorrect
-   Various carryover calculation edge cases

While some fixes have been implemented, a comprehensive audit is needed to ensure all calculations are correct, consistent, and well-tested.

## Calculation Areas to Review

### 1. Balance Calculations

**Debit Balance** (`backend/services/balance_service.py`)

-   [ ] Verify all income is correctly summed
-   [ ] Verify all debit expenses are correctly summed
-   [ ] Test with empty transactions (new user)
-   [ ] Test with negative balance scenarios
-   [ ] Test with multiple income sources
-   [ ] Test debt payment handling (should subtract from both debit and credit)

**Credit Balance** (`backend/services/balance_service.py`)

-   [ ] Verify starting balance calculation (limit - initial debt)
-   [ ] Verify expense aggregation excludes Debt category markers
-   [ ] Verify payment aggregation (Debt Payments → Credit Card)
-   [ ] Test pre-existing debt marker edge cases
-   [ ] Test when no debt marker exists
-   [ ] Test when credit limit changes mid-period
-   [ ] Verify available doesn't exceed limit

**Test Cases Needed:**

```python
# Debit Balance Tests
def test_debit_balance_empty():
    # User with no transactions
    assert calculate_debit() == 0

def test_debit_balance_income_only():
    # User with income, no expenses
    income = 3000
    assert calculate_debit() == 3000

def test_debit_balance_with_expenses():
    # User with income and expenses
    income = 3000
    expenses = 500
    assert calculate_debit() == 2500

def test_debit_balance_credit_payment():
    # Credit card payment from debit
    income = 3000
    debit_expenses = 500
    credit_payment = 200  # Debt Payment -> Credit Card
    # Payment is a debit expense, so should subtract
    assert calculate_debit() == 2300

# Credit Balance Tests
def test_credit_balance_no_debt_marker():
    # User starts with full limit available
    limit = 1500
    assert calculate_credit() == 1500

def test_credit_balance_with_debt():
    # User has pre-existing debt
    limit = 1500
    initial_debt = 500
    assert calculate_credit() == 1000  # limit - debt

def test_credit_balance_after_spending():
    # User spends on credit card
    limit = 1500
    initial_debt = 500
    new_spending = 200
    assert calculate_credit() == 800  # 1000 - 200

def test_credit_balance_after_payment():
    # User makes payment
    limit = 1500
    initial_debt = 500
    new_spending = 200
    payment = 100
    assert calculate_credit() == 900  # 800 + 100

def test_credit_balance_capped_at_limit():
    # Overpayment should not exceed limit
    limit = 1500
    initial_debt = 100
    payment = 2000  # Overpayment
    assert calculate_credit() == 1500  # Capped at limit
```

### 2. Carryover Logic

**Weekly Carryover** (`backend/routes/salary_periods.py::get_current_salary_period`)

-   [ ] Verify cumulative carryover calculation
-   [ ] Test with all weeks having leftover
-   [ ] Test with all weeks overspent
-   [ ] Test with mixed leftover/overspend
-   [ ] Verify carryover resets on period boundary
-   [ ] Test when viewing future weeks

**Test Cases:**

```python
def test_carryover_all_leftover():
    # All weeks have leftover, should accumulate
    week1_leftover = 50
    week2_leftover = 30
    week3_budget = 200
    assert week3_adjusted_budget == 280  # 200 + 50 + 30

def test_carryover_overspend():
    # Week 1 overspent
    week1_overspend = -50
    week2_budget = 200
    assert week2_adjusted_budget == 150  # 200 - 50

def test_carryover_no_future_impact():
    # Carryover should not affect future incomplete weeks
    current_week = 2
    week3_carryover = should_be_zero
```

### 3. Rollover Calculations

**Period-to-Period Rollover** (`frontend/src/components/SalaryPeriodRolloverPrompt.jsx`)

-   [ ] Verify ending debit calculation includes all period income/expenses
-   [ ] Verify ending credit calculation
-   [ ] Test with incomplete weeks (period still active)
-   [ ] Test with future scheduled expenses
-   [ ] Test with debt payments during period
-   [ ] Verify date filtering (only realized transactions)

**Current Issues:**

-   Rollover shows incorrect debit balance (#72)
-   May not properly filter future transactions
-   Date comparison logic needs review

### 4. Budget Period Assignment

**Expense Assignment** (`frontend/src/pages/Dashboard.jsx`)

-   [ ] Verify expenses assigned to correct week based on date
-   [ ] Test expenses on week boundary dates (start/end)
-   [ ] Test expenses before first period
-   [ ] Test expenses after last period
-   [ ] Test timezone handling (date comparisons)

### 5. Fixed Bills Calculation

**Auto-Detection** (`backend/routes/salary_periods.py::preview_salary_period`)

-   [ ] Verify recurring expense detection
-   [ ] Test with is_fixed_bill flag
-   [ ] Test with expenses in date range
-   [ ] Verify deduplication logic
-   [ ] Test manual adjustments override

### 6. Budget Preview Calculations

**Budget Distribution** (`backend/routes/salary_periods.py::preview_salary_period`)

-   [ ] Verify total budget = debit + credit_allowance - fixed_bills
-   [ ] Verify weekly budget = total / 4
-   [ ] Test with negative budget (overspent)
-   [ ] Test debit_portion vs credit_portion calculations
-   [ ] Verify remaining budget per week

**Formula to verify:**

```python
total_budget = debit_balance + credit_allowance - fixed_bills_total
weekly_budget = total_budget // 4

# Debit portion (after fixed bills are paid)
debit_after_bills = debit_balance - fixed_bills_total
if debit_after_bills >= total_budget:
    # All budget comes from debit
    weekly_debit = weekly_budget
    weekly_credit = 0
else:
    # Some budget comes from credit
    weekly_debit = max(0, debit_after_bills // 4)
    weekly_credit = weekly_budget - weekly_debit
```

### 7. Leftover Allocation

**Leftover Calculation** (`backend/routes/salary_periods.py::get_week_leftover`)

-   [ ] Verify week spending excludes fixed bills
-   [ ] Verify carryover from previous weeks
-   [ ] Test end-of-week leftover calculation
-   [ ] Test with current incomplete week
-   [ ] Verify debt allocation suggestions

## Edge Cases to Test

### Time-Based Edge Cases

-   [ ] Expense on first day of period
-   [ ] Expense on last day of period
-   [ ] Expense at midnight (boundary)
-   [ ] Expense with different timezone
-   [ ] Future scheduled expenses
-   [ ] Income on last day of previous period

### Data Edge Cases

-   [ ] Zero balance (brand new user)
-   [ ] Negative debit balance (overspent)
-   [ ] Credit card at limit (0 available)
-   [ ] Credit card overpayment (available > limit)
-   [ ] No income in period
-   [ ] No expenses in period
-   [ ] No fixed bills
-   [ ] All expenses are fixed bills

### Period Edge Cases

-   [ ] Overlapping periods (should be prevented)
-   [ ] Gap between periods
-   [ ] Single-day period
-   [ ] Period with no weeks
-   [ ] Active period change during day

## Known Issues to Fix

### 1. Inconsistent Rounding

-   Some places use `//` (floor division)
-   Some places use `int()` (truncation)
-   Some places use `round()`
-   **Decision needed**: Standardize on one approach

### 2. Cents vs Euros Conversion

-   Backend stores cents (integers)
-   Frontend displays euros (floats)
-   Conversion happens in multiple places
-   **Risk**: Precision loss, rounding errors

**Locations:**

-   `backend/routes/salary_periods.py` - multiple conversions
-   `frontend/src/pages/Dashboard.jsx` - card displays
-   `frontend/src/components/*.jsx` - various components

### 3. Date Comparison Inconsistencies

-   Some use `>=` and `<=`
-   Some use `>` and `<`
-   Some compare Date objects
-   Some compare ISO strings
-   **Risk**: Off-by-one errors, boundary issues

### 4. Currency Display Inconsistencies

-   Some show `€X.XX`
-   Some show `€X`
-   Some show `X€`
-   **Decision**: Standardize format

## Implementation Plan

### Phase 1: Write Comprehensive Tests (Week 1)

1. Create test suite for `backend/services/balance_service.py`
2. Create test suite for carryover logic
3. Create test suite for rollover calculations
4. Add edge case tests
5. **Goal**: 100% test coverage for calculation functions

### Phase 2: Fix Identified Issues (Week 2)

1. Fix any failing tests
2. Standardize rounding approach
3. Audit date comparison logic
4. Fix rollover calculation (#72)
5. Document calculation formulas

### Phase 3: Refactor & Consolidate (Week 3)

1. Move all balance calculations to `balance_service.py`
2. Create `carryover_service.py` for weekly carryover logic
3. Create `rollover_service.py` for period rollover logic
4. Remove duplicate calculation code
5. Add inline documentation

### Phase 4: Validation & Monitoring (Week 4)

1. Add validation checks in production
2. Log calculation results for monitoring
3. Add admin endpoint to verify user balances
4. Create reconciliation script
5. Document known limitations

## Files Requiring Review

**Backend:**

-   [backend/services/balance_service.py](backend/services/balance_service.py) - Real-time balance calculations
-   [backend/routes/salary_periods.py](backend/routes/salary_periods.py) - Period creation, carryover, rollover
-   [backend/routes/expenses.py](backend/routes/expenses.py) - Expense creation, updates
-   [backend/routes/income.py](backend/routes/income.py) - Income tracking
-   [backend/models/database.py](backend/models/database.py) - Data models, constraints

**Frontend:**

-   [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) - Main calculation display
-   [frontend/src/components/DebitCreditCards.jsx](frontend/src/components/DebitCreditCards.jsx) - Balance display
-   [frontend/src/components/WeeklyBudgetCard.jsx](frontend/src/components/WeeklyBudgetCard.jsx) - Carryover display
-   [frontend/src/components/SalaryPeriodRolloverPrompt.jsx](frontend/src/components/SalaryPeriodRolloverPrompt.jsx) - Rollover calculations
-   [frontend/src/components/SalaryPeriodWizard.jsx](frontend/src/components/SalaryPeriodWizard.jsx) - Period preview

**Tests:**

-   [backend/tests/test_business_logic.py](backend/tests/test_business_logic.py) - Existing tests
-   Need to create:
    -   `backend/tests/test_balance_calculations.py`
    -   `backend/tests/test_carryover_logic.py`
    -   `backend/tests/test_rollover_calculations.py`

## Success Criteria

-   [ ] All calculation functions have unit tests
-   [ ] All tests pass
-   [ ] No calculation inconsistencies between frontend/backend
-   [ ] Rounding approach standardized
-   [ ] Date comparison logic consistent
-   [ ] Known edge cases handled
-   [ ] Documentation updated
-   [ ] User-reported calculation issues resolved

## Priority

**High** - Core functionality must be accurate and reliable

## Labels

-   `enhancement`
-   `bug`
-   `backend`
-   `frontend`
-   `testing`
-   `calculations`
-   `technical-debt`

## Related Issues

-   #89 - Debit/Credit Balance Calculation Bug (RESOLVED)
-   #72 - Rollover Debit Balance Incorrect (OPEN)
-   May discover additional issues during review

## Additional Notes

This is a **large, multi-phase task** that should be broken down into smaller sub-issues:

1. "Create comprehensive test suite for balance calculations"
2. "Audit and fix carryover logic"
3. "Fix rollover calculation bugs"
4. "Standardize rounding and currency handling"
5. "Refactor calculation code into services"

Consider assigning different phases to different milestones or sprints.

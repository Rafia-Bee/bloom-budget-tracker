# Debit/Credit Balance Calculations Incorrect

## Summary

Dashboard shows incorrect available balances for debit and credit cards:

-   **Debit card**: Shows €9084.69 (should be ~€590.41)
-   **Credit card**: Shows €89.42 (should be ~€1254.72 available / €245.28 used)

## Current Behavior

### Scenario

1. User is in Week 4 of salary period (Nov 20 - Dec 19)
2. User creates NEXT salary period (Dec 20 - Jan 19) on Dec 17
3. User spends money on Dec 18-19 (still in OLD period)
4. App does not update NEXT period's initial balances with Dec 18-19 expenses
5. On Dec 20, dashboard shows astronomical incorrect values

### Actual Values Shown

-   Debit available: €9084.69 ❌
-   Credit available: €89.42 ❌

### Expected Values

-   Debit available: €590.41 ✅
-   Credit available: €1254.72 ✅ (or €245.28 used of €1500 limit)

### Database State (from export)

```json
{
    "initial_debit_balance": 289374, // €2893.74
    "initial_credit_balance": 50178, // €501.78 debt
    "credit_limit": 150000, // €1500 limit
    "credit_budget_allowance": 20000, // €200/week
    "fixed_bills_total": 226399, // €2263.99
    "weekly_budget": 20743 // €207.43/week
}
```

## Root Causes

### Problem 1: Initial Balance Doesn't Account for Late Expenses

When a future salary period is created:

1. Initial balances are captured at creation time
2. Expenses made after period creation (but before period starts) are NOT reflected
3. Period starts with outdated balances

**Example:**

-   Dec 17: Create period with €2893.74 debit balance
-   Dec 18-19: Spend €73.65 (expenses logged to OLD period)
-   Dec 20: NEW period starts with €2893.74 (ignoring the €73.65 spent)

### Problem 2: Dashboard Calculation Logic Wrong

The dashboard cards show values that don't match any reasonable calculation:

-   €9084.69 appears to be adding weekly budgets or income multiple times
-   Not properly subtracting fixed bills from initial balance
-   May be double-counting or mis-categorizing expense totals

## Expected Behavior

### Solution D: Lazy Balance Correction (Recommended)

Keep balance snapshots but always calculate actual balances when displaying to users.

**Implementation Steps:**

1. Create `backend/services/balance_service.py` with real-time calculation functions
2. Update dashboard API to call `get_display_balances()` instead of using snapshot fields
3. Optional: Add nightly background job to sync snapshots with actuals (for tidiness)

**Key Functions:**

```python
def get_current_debit_balance(user_id):
    # Sum ALL income - ALL debit expenses
    total_income = Income.query.filter_by(user_id=user_id).sum('amount')
    total_debit = Expense.query.filter_by(user_id=user_id, payment_method='Debit card').sum('amount')
    return total_income - total_debit

def get_current_credit_balance(user_id, credit_limit):
    # Calculate: available = limit - (spent - repaid)
    credit_spent = Expense.query.filter_by(user_id=user_id, payment_method='Credit card').sum('amount')
    credit_repaid = Expense.query.filter_by(user_id=user_id, subcategory='Credit Card').sum('amount')
    credit_debt = credit_spent - credit_repaid
    return credit_limit - credit_debt
```

**Benefits:**

-   ✅ Handles future period creation
-   ✅ Handles expense edits (recalculates automatically)
-   ✅ Handles expense deletions
-   ✅ Handles late expenses
-   ✅ Self-healing (display always correct)
-   ✅ Keeps snapshots for debugging
-   ⚠️ Slightly slower (but cacheable)

---

### Alternative Solutions (For Reference)

### Option A: Recalculate on Period Start

When a salary period becomes active:

1. Check if any income was received in old period AFTER this period was created
2. Check expenses made in old period AFTER this period was created
3. Adjust `initial_debit_balance` and `initial_credit_balance` accordingly
4. Update `fixed_bills_total` if recurring expenses changed

**Issues:** Doesn't handle edits made after activation

### Option B: Block Future Period Creation

Don't allow creating next period until current period ends:

-   Simpler logic
-   Prevents stale balance issue
-   But less flexible for planning

**Issues:** Band-aid solution, doesn't fix root calculation bug

### Option C: Pure Real-Time Tracking

Instead of snapshot balances:

-   Calculate current balance from ALL income - ALL expenses
-   Don't store `initial_debit_balance`, compute it on-demand
-   More accurate but requires careful date filtering

**Issues:** No historical "balance at period start" audit trail

## Technical Details

### Affected Components

-   `backend/routes/salary_periods.py` - period creation and balance calculations
-   `frontend/src/components/DebitCreditCards.jsx` - dashboard display
-   `backend/services/balance_service.py` (if exists) - balance calculations

### Related Code

```python
# backend/routes/salary_periods.py - create_salary_period()
# When creating a period, it captures current balance:
salary_period = SalaryPeriod(
    initial_debit_balance=debit_balance,  # Snapshot at creation time
    initial_credit_balance=credit_balance,  # Never updated
    ...
)
```

### Calculation Formula Should Be

```python
# Debit Available
total_income = sum(all income entries)
total_debit_expenses = sum(debit expenses in current+past periods)
credit_repayments = sum(debit expenses with subcategory="Credit Card")
debit_available = total_income - total_debit_expenses

# Credit Available
credit_used = credit_limit - initial_credit_balance
credit_spent_this_period = sum(credit expenses in current period)
credit_repaid = sum(credit repayment expenses)
credit_available = credit_limit - (credit_used + credit_spent_this_period - credit_repaid)
```

## Steps to Reproduce

1. Be in week 4 of a salary period
2. Create the NEXT salary period (starts in future)
3. Make expenses in week 4 AFTER creating next period
4. Wait for next period to become active
5. Check dashboard debit/credit cards
6. Values will be incorrect

## Test Data

-   Period start: Dec 20, 2025
-   Initial debit: €2893.74
-   Actual expenses Dec 19: €73.65
-   Expected debit: €2893.74 - €73.65 = €2820.09
-   After fixed bills: €2820.09 - €2263.99 = €556.10

## Priority

**High** - Core budgeting functionality is broken, shows completely wrong available money

## Labels

-   `bug`
-   `backend`
-   `frontend`
-   `calculations`
-   `balance-tracking`

## Related Issues

-   #80 (httpOnly cookies - unrelated, just happened at same time)
-   May relate to income/expense assignment logic

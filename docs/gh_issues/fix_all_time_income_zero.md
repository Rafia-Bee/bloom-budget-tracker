# Fix: All-Time Income Shows €0 - Remove Manual Frontend Balance Calculations

## Summary

The frontend manually calculates balances from transactions in `calculateCumulativeBalances()`, which causes "All-time income: €0" to display incorrectly. The backend already provides accurate, real-time balances via `balance_service.py` - the frontend should trust and use those values instead of recalculating.

## Problem

**Symptoms:**

-   ✅ Debit card available balance displays correctly (€416.16)
-   ✅ Credit card available balance displays correctly
-   ❌ "All-time income" shows €0.00 (should show total non-Initial-Balance income)
-   ❌ "% of total" shows "0% of total" (should show spending percentage)

**Root Cause:**

The frontend has a `calculateCumulativeBalances()` function that:

1. Fetches all income entries
2. Excludes "Initial Balance" entries (correct, they're period snapshots)
3. Sums remaining income into `cumulativeIncome` state variable
4. But this calculation **is currently showing €0**, indicating no non-Initial-Balance income exists

**Why This Is Wrong:**

1. Backend already calculates balances correctly in [backend/services/balance_service.py](backend/services/balance_service.py)
2. Backend's `get_display_balances()` returns accurate real-time balances
3. Frontend should use backend values, not recalculate from scratch
4. Manual frontend calculations duplicate logic and cause inconsistencies

## Current Flow

### Backend (✅ Correct)

```python
# backend/services/balance_service.py
def _calculate_debit_balance():
    """
    1. Find earliest "Initial Balance" entry (starting money)
    2. Sum all OTHER income since that date (excludes Initial Balance)
    3. Subtract all debit expenses
    4. Return: starting_balance + income - expenses
    """
    # Returns accurate balance in euros
```

### Frontend (❌ Duplicates Logic)

```jsx
// frontend/src/pages/Dashboard.jsx
const calculateCumulativeBalances = async () => {
    // Fetches ALL income
    const allIncomeRes = await incomeAPI.getAll({});

    // Manually excludes Initial Balance
    allIncome.forEach((income) => {
        if (income.type !== "Initial Balance") {
            cumulativeIncome += amount; // Currently summing to €0
        }
    });

    // Manually calculates debit/credit from expenses
    allExpenses.forEach((expense) => {
        if (expense.payment_method === "Debit card") {
            cumulativeDebit += amount;
        }
        // ...
    });

    setTotalIncome(cumulativeIncome); // Sets to €0
    setDebitBalance(cumulativeDebit); // OVERWRITES backend value!
};
```

## Investigation Needed

**Why is `cumulativeIncome` calculating to €0?**

Possible reasons:

1. **No non-Initial-Balance income exists** - All income is marked as "Initial Balance"
2. **Income entries have wrong type field** - Check database for income.type values
3. **Date filtering issue** - Income entries might be excluded by date logic
4. **API response format** - Income might not be in expected format

**Check database:**

```sql
SELECT type, COUNT(*), SUM(amount) FROM income GROUP BY type;
-- Expected: Mix of "Initial Balance", "Salary", "Other", etc.
-- Actual: All entries might be "Initial Balance"?
```

**Check API response:**

```javascript
console.log("All income entries:", allIncomeRes.data);
console.log(
    "Income types:",
    allIncome.map((i) => i.type)
);
// Are all entries "Initial Balance"?
```

## Recommended Solution

### Option 1: Use Backend Balances Only (Recommended)

**Remove `calculateCumulativeBalances()` entirely** and use backend-provided values.

#### Backend Already Provides These Values:

```javascript
// From GET /salary-periods/current
{
  "salary_period": {
    "display_debit_balance": 41616,  // €416.16 in cents
    "display_credit_balance": 50000,  // €500.00 in cents
    ...
  }
}
```

#### Add New Backend Endpoint for Stats:

```python
# backend/routes/income.py (or create backend/routes/stats.py)
@income_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_income_stats():
    """Get all-time income statistics"""
    user_id = int(get_jwt_identity())

    # Total non-Initial-Balance income
    total_income = db.session.query(
        func.coalesce(func.sum(Income.amount), 0)
    ).filter(
        Income.user_id == user_id,
        Income.type != "Initial Balance"
    ).scalar() or 0

    # Period income (current salary period)
    current_period = SalaryPeriod.query.filter_by(
        user_id=user_id,
        is_active=True
    ).first()

    period_income = 0
    if current_period:
        period_income = db.session.query(
            func.coalesce(func.sum(Income.amount), 0)
        ).filter(
            Income.user_id == user_id,
            Income.type != "Initial Balance",
            Income.actual_date >= current_period.start_date,
            Income.actual_date <= current_period.end_date
        ).scalar() or 0

    return jsonify({
        "total_income": total_income,  # cents
        "period_income": period_income,  # cents
    }), 200
```

#### Update Frontend:

```jsx
// Remove calculateCumulativeBalances() function entirely
// Add new state loaded from backend
const [incomeStats, setIncomeStats] = useState({ total: 0, period: 0 })

// Load stats from backend
const loadIncomeStats = async () => {
  try {
    const response = await incomeAPI.getStats()  // New API call
    setIncomeStats({
      total: response.data.total_income / 100,
      period: response.data.period_income / 100
    })
  } catch (error) {
    console.error('Failed to load income stats:', error)
  }
}

// Use in component
useEffect(() => {
  loadIncomeStats()
}, [currentPeriod])

// Display
<span>Period income: €{incomeStats.period.toFixed(2)}</span>
<span>All-time income: €{incomeStats.total.toFixed(2)}</span>
```

### Option 2: Fix Current Calculation (Not Recommended)

Keep `calculateCumulativeBalances()` but:

1. Debug why `cumulativeIncome` is €0
2. Fix the logic to match backend calculations
3. Keep two calculation codebases in sync forever (maintenance burden)

**Why not recommended:** Duplicates logic, prone to bugs, harder to maintain.

## Implementation Plan

### Phase 1: Investigate (15 minutes)

1. Run query: `SELECT type, COUNT(*), SUM(amount) FROM income GROUP BY type;`
2. Add console.log to see actual income types in frontend
3. Determine why `cumulativeIncome === 0`

### Phase 2: Create Backend Endpoint (30 minutes)

1. Add `/income/stats` endpoint (or `/stats/income`)
2. Return total_income and period_income
3. Test endpoint with Postman/curl

### Phase 3: Update Frontend (1 hour)

1. Add `getStats()` to [frontend/src/api.js](frontend/src/api.js)
2. Replace `calculateCumulativeBalances()` calls with `loadIncomeStats()`
3. Remove manual balance calculation state (`totalIncome`, `currentPeriodIncome`, etc.)
4. Use backend values directly from `/salary-periods/current` for debit/credit
5. Update UI to display new stats

### Phase 4: Cleanup (30 minutes)

1. Remove `calculateCumulativeBalances()` function
2. Remove related state variables
3. Remove manual expense/income aggregation logic
4. Update documentation

## Files to Modify

**Backend:**

-   [backend/routes/income.py](backend/routes/income.py) - Add `/stats` endpoint
-   [backend/services/balance_service.py](backend/services/balance_service.py) - Already correct, no changes
-   [backend/routes/salary_periods.py](backend/routes/salary_periods.py) - Already returns `display_*_balance`, no changes

**Frontend:**

-   [frontend/src/api.js](frontend/src/api.js) - Add `incomeAPI.getStats()`
-   [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) - Remove `calculateCumulativeBalances()`, use backend values
    -   Lines 397-498: Remove entire function
    -   Lines 1172-1179: Use new `incomeStats` state

## Impact

**Before (Current):**

-   Frontend calculates balances manually
-   Duplicates backend logic
-   Shows incorrect "All-time income: €0"
-   Maintenance burden (two calculation codebases)

**After (Proposed):**

-   Frontend trusts backend calculations
-   Single source of truth for balances
-   Shows correct all-time income
-   Simpler, more maintainable code

## Related Issues/Decisions

-   **DECISION_LOG.md (2025-12-21):** "Fixed Debit Card Balance to Be Period-Independent"
    -   Backend now calculates correctly, frontend needs to catch up
-   **Issue #89:** Debit/Credit Balance Calculation Bug (RESOLVED)
    -   Backend fixed with `balance_service.py`
-   **Issue #94:** Comprehensive Calculation Review & Audit
    -   This fix should be part of Phase 2 or 3

## Priority

**High** - User-facing display bug, shows misleading financial information

## Labels

-   `bug`
-   `frontend`
-   `backend`
-   `technical-debt`

## Acceptance Criteria

-   [ ] Backend `/income/stats` endpoint returns correct values
-   [ ] Frontend displays accurate "All-time income"
-   [ ] Frontend displays accurate "Period income"
-   [ ] Frontend displays accurate "% of total"
-   [ ] `calculateCumulativeBalances()` removed
-   [ ] No manual balance calculations in frontend
-   [ ] All balance calculations come from backend
-   [ ] Documentation updated

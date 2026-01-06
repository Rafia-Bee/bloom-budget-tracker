# Decision Log

Architectural decisions only. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-07: Phase 3 Complete - Mode-Aware Balance Calculations (#149)

**Context:** Phase 3 needed to implement mode-aware balance calculations. Testing revealed multiple issues that were fixed.

### Issues Found & Fixed

1. **Delete All Data Bug:** When user deleted all data, `User.user_initial_debit_balance` wasn't reset, causing stale balance display.

    - Fix: Added reset of User balance fields in `user_data.py` delete endpoint

2. **Multiple Active Periods Bug:** Creating a past period deactivated the current period, causing past periods to be excluded from calculations.

    - Fix: Changed activation logic to allow multiple periods to be active simultaneously
    - Past + Current periods can coexist; only future periods start inactive

3. **All-Time Income Bug:** `income/stats` endpoint didn't include past period balances.
    - Fix: Updated endpoint to be mode-aware, adding past period balances in sync mode

### Files Modified

-   **backend/services/balance_service.py**

    -   Budget mode: Period-isolated balance calculation
    -   Sync mode: Anchor + past periods + income - expenses
    -   Past periods in sync mode show their isolated balance (not cumulative)

-   **backend/routes/salary_periods.py**

    -   Removed code that deactivated other periods when creating new ones
    -   Multiple periods can now be active simultaneously

-   **backend/routes/user_data.py**

    -   Delete All Data now resets User balance fields

-   **backend/routes/income.py**
    -   `get_income_stats()` now mode-aware, includes past period balances in sync mode

### Sync Mode Logic (Final)

**Anchor Balance:** Set when FIRST period is created, stored in `User.user_initial_debit_balance`

**Past Period:** Period with `start_date < User.balance_start_date`

-   Treated as "past income" that adds to cumulative total
-   User must add past expenses to "balance the books"

**Calculation:**

-   When viewing past period: Show isolated balance (its own balance)
-   When viewing current/future period: Anchor + past_periods + income - expenses

**All-Time Income:**

-   Sync mode: Anchor + past period balances + all income
-   Budget mode: Anchor + all income (periods don't accumulate)

### What's Next

**Phase 5: Informational Modal** (~1.5 hours)
- Create `PeriodInfoModal.jsx` - shows context-aware info when creating past/future periods
- Sync mode past period: "This €X will be added to your cumulative total"
- Budget mode past period: "This period is isolated from other periods"  
- Wire up in `SalaryPeriodWizard.jsx` when user clicks "Create"
- Options: [Continue] or [Change to X Mode]
- Reference: See modal mockups in `docs/BALANCE_CALCULATION_ANALYSIS.md` (Phase 5 section)

**Phase 6: Cleanup & Feature Flag** (~1 hour)
- Graduate `balanceModeEnabled` feature flag (make it always on)
- Remove legacy "Initial Balance" Income entries from dashboard/lists
- Remove legacy "Pre-existing Credit Card Debt" Expense markers
- Clean up dead code paths in balance_service.py fallbacks
- Update tests for new behavior

**Branch:** `fix/149-initial-balance-accumulation` - 5 commits ahead of origin, NOT pushed yet

**To Continue:**
1. `git push` to update PR #156
2. Start Phase 5 implementation

---

## 2026-01-05: Phases 1-4 Complete (#149)

### Phase 4: Balance Mode UI

**UI Touchpoints:**

1. First period wizard - dropdown selector
2. User menu - Balance Settings option
3. Salary Period Wizard Step 1 - toggle
4. Settings page - Balance section

**Files:** `BalanceModeModal.jsx`, `SalaryPeriodWizard.jsx`, `Header.jsx`, `Settings.jsx`

### Phase 3: Balance Service Refactored

-   `_calculate_debit_balance()` uses User fields instead of Income markers
-   `_calculate_credit_available()` uses User fields instead of Expense markers
-   Backward compatible with non-migrated users

### Phase 2: Data Migration

-   Script: `scripts/migrate_balance_to_user.py`
-   Neon SQL: `docs/migrations/2026-01-05_populate_user_balance_fields.sql`
-   Non-destructive, markers kept until Phase 6

### Phase 1: Schema Update

```python
# New User columns
balance_start_date = db.Column(db.Date, nullable=True)
user_initial_debit_balance = db.Column(db.Integer, default=0)
user_initial_credit_limit = db.Column(db.Integer, default=0)
user_initial_credit_debt = db.Column(db.Integer, default=0)
balance_mode = db.Column(db.String(20), default="sync")
```

---

# Decision Log

Architectural decisions only. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-08: Credit Storage Simplification (#149 Phase 6)

**Context:** The credit balance calculation was convoluted - storing debt and calculating available backwards.

**Previous Design:**

```python
# Store debt: user.user_initial_credit_debt = limit - available
# Calculate: available = limit - debt  (unnecessary conversion)
```

**New Design:**

```python
# Store what user entered directly
user.user_initial_credit_available = credit_balance
# Use directly without conversion
```

**Changes:**

1. `database.py`: Renamed `user_initial_credit_debt` → `user_initial_credit_available`
2. `salary_periods.py`: Store `credit_balance` directly
3. `balance_service.py`: Use `user_initial_credit_available` directly
4. Migration: `34eed8893f3a` with data conversion (available = limit - debt)
5. Production SQL: `docs/migrations/2026-01-08_rename_credit_debt_to_available.sql`

**Rationale:** Simpler code is easier to maintain. This matches how debit works (`user_initial_debit_balance`).

**Impact:** Cleaner code, same functionality.

---

## 2026-01-08: Past Period Credit Balance Bug Fix (#149)

**Context:** Bug discovered where creating a past period after a current period showed wrong credit balance when viewing the past period. User expected €1000 but saw €500 (the current period's credit).

**Root Cause:** Two issues:

1. User balance anchor fields (`balance_start_date`, `user_initial_credit_*`) only updated on FIRST period creation, not when creating an earlier period
2. `_calculate_credit_available()` in sync mode didn't handle past periods specially (debit already did)

**Decision:** Treat past periods (before anchor date) as isolated for balance calculations in sync mode

**Changes:**

1. `salary_periods.py`: Update user anchor fields when creating a period earlier than existing `balance_start_date`
2. `balance_service.py`: Added past period handling to `_calculate_credit_available()` mirroring existing debit logic

**Rationale:** When viewing a past period, users expect to see the balances that were valid during that period, not the accumulated balance from a later anchor. This maintains parity between debit and credit balance calculations.

**Impact:** Past periods now correctly show their own `initial_credit_balance` instead of using the user anchor value.

---

## 2026-01-06: Phase 5 Complete + E2E Tests Pass (#149)

**Context:** Completed Phase 5 (PeriodInfoModal) and E2E tests. Found and fixed a critical bug where period creation overwrote user's balance_mode preference.

### Phase 5: PeriodInfoModal

**Created:** `frontend/src/components/PeriodInfoModal.jsx`

-   Shows context-aware information when `balance_start_date` is set
-   Sync mode: Explains how past/future periods contribute to cumulative balance
-   Budget mode: Explains period isolation
-   Includes "Change Mode" button to switch balance modes

**Integrated Into:** `SalaryPeriodWizard.jsx`

-   Modal appears at end of Step 3 (Review) when user has balance tracking active
-   If user changes mode via modal, wizard navigates to Settings page

### E2E Tests: `frontend/e2e/balance-mode.spec.js`

**Test Groups:**

1. **Balance mode setting** - API CRUD for sync/budget modes
2. **Sync mode** - Multiple periods with cumulative balance, expense impact
3. **Budget mode** - Multiple periods with isolated balances, expense isolation
4. **PeriodInfoModal** - Appears when balance_start_date is set

**Key Testing Patterns:**

-   Uses `/api/v1/salary-periods/current` endpoint which returns `display_debit_balance`
-   Deletes all data before each test group via `/api/v1/user-data/delete-all`
-   Must run with `--workers=1` to avoid database conflicts

### Bug Found & Fixed

**Bug:** `salary_periods.py` line 940 unconditionally set `user.balance_mode = "sync"` when creating the first period, **overwriting** any user preference.

**Impact:** E2E tests for budget mode were failing because mode was silently changed to sync.

**Fix:** Removed the line. The User model's `default="sync"` handles new users, and existing preferences are preserved.

**File:** `backend/routes/salary_periods.py` (lines 931-941)

### Test Results

```
26 passed (2.4m)
- Balance mode setting works correctly
- Sync mode period creation works
- Expenses affect balance correctly (sync)
- Budget mode maintains isolated balances
- Past period expenses do not affect current balance (budget)
- Current period expenses affect current balance (budget)
- Modal appears when balance start date is set
```

### What's Next

**Phase 6: Cleanup & Feature Flag** (~1 hour)

-   Graduate `balanceModeEnabled` feature flag (make it always on)
-   Remove legacy "Initial Balance" Income entries from dashboard/lists
-   Remove legacy "Pre-existing Credit Card Debt" Expense markers
-   Clean up dead code paths in balance_service.py fallbacks
-   Update tests for new behavior

### Files Modified This Session

-   `frontend/e2e/balance-mode.spec.js` - Complete E2E test suite for balance modes
-   `backend/routes/salary_periods.py` - Fixed balance_mode override bug

### Branch Status

**Branch:** `fix/149-initial-balance-accumulation` (PR #156)
**Status:** Local changes NOT committed yet

-   Fixed balance_mode override bug
-   Ready to format, test, and commit

**To Continue:**

1. Run `bformat` to format code
2. Run `btest b` to verify backend tests pass
3. Commit: `git add . && git commit -m "fix(#149): prevent period creation from overwriting balance_mode"`
4. Push to PR
5. Start Phase 6

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

-   Create `PeriodInfoModal.jsx` - shows context-aware info when creating past/future periods
-   Sync mode past period: "This €X will be added to your cumulative total"
-   Budget mode past period: "This period is isolated from other periods"
-   Wire up in `SalaryPeriodWizard.jsx` when user clicks "Create"
-   Options: [Continue] or [Change to X Mode]
-   Reference: See modal mockups in `docs/BALANCE_CALCULATION_ANALYSIS.md` (Phase 5 section)

**Phase 6: Cleanup & Feature Flag** (~1 hour)

-   Graduate `balanceModeEnabled` feature flag (make it always on)
-   Remove legacy "Initial Balance" Income entries from dashboard/lists
-   Remove legacy "Pre-existing Credit Card Debt" Expense markers
-   Clean up dead code paths in balance_service.py fallbacks
-   Update tests for new behavior

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

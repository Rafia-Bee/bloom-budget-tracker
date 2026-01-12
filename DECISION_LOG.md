# Decision Log

Session continuity for AI context + architectural decisions. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-12: Context-Specific Copilot Instructions & Phase 3 Complete (#164)

**Session Summary:**

1. Created context-specific instruction files for backend/frontend/database development
2. Verified Phase 3 optimization changes work correctly via manual testing
3. Identified and created GH issue for rollover prompt FAB button bug

**Instruction Files Created:**

-   `.github/BACKEND_INSTRUCTIONS.md` - Flask routes, models, testing patterns
-   `.github/FRONTEND_INSTRUCTIONS.md` - React components, Tailwind styling, API integration
-   `.github/DATABASE_INSTRUCTIONS.md` - Schema reference, migrations, queries
-   `.github/prompts/backend.prompt.md` - Auto-attached context for backend files
-   `.github/prompts/frontend.prompt.md` - Auto-attached context for frontend files
-   `.github/prompts/database.prompt.md` - Auto-attached context for database files

**Bug Found During Testing:**

-   Issue #XXX: FAB (+) button disabled when rollover prompt showing
-   Root cause: `showRolloverPrompt` included in disabled conditions in Dashboard.jsx

**Manual Testing Results:** ✅ App working correctly

-   SharedDataContext caching working (no duplicate API calls for modals)
-   SalaryPeriodContext caching working (no duplicate salary period calls)
-   All CRUD operations functioning normally

**What's Next:**

1. Create PR for `feat/optimize-dashboard-api-calls` branch
2. Fix rollover prompt FAB button bug (Issue #XXX)
3. Optional Phase 4: Dashboard prop-drilling to PeriodSelector

**Current Branch:** `feat/optimize-dashboard-api-calls`

---

## 2026-01-12: Phase 3 Complete - SalaryPeriodContext (#164)

**Session Summary:** Implemented Phase 3 - SalaryPeriodContext for cross-page salary period data caching.

**New Context Created:**

-   `SalaryPeriodContext.jsx` - Centralized caching for current salary period
-   Provides: `currentPeriod`, `currentWeek`, `salaryPeriodData`, `loading`, `loaded`, `refresh()`
-   Pattern matches SharedDataContext (load on auth, state tracking, refresh methods)

**Components Updated to Use Context:**

1. `App.jsx` - Added `SalaryPeriodProvider` wrapper
2. `Debts.jsx` - Uses `useSalaryPeriod()` instead of `salaryPeriodAPI.getCurrent()`
3. `Reports.jsx` - Uses context for default date range (removed async loadDefaultPeriod)
4. `SalaryPeriodRolloverPrompt.jsx` - Uses context as fallback when parent doesn't provide data

**Test Updates:**

-   Added `renderWithSalaryPeriod()` wrapper in `utils.jsx`
-   Rewrote `SalaryPeriodRolloverPrompt.test.jsx` to pass mock data as props
-   Simplified tests by bypassing context (component accepts `salaryPeriodData` prop)

**API Calls Eliminated:**

-   `salaryPeriodAPI.getCurrent()` no longer called independently by Debts, Reports, SalaryPeriodRolloverPrompt
-   Single call at app load, data shared across all pages

**Test Results:** ✅ 34/34 test files, 1032/1032 tests passing

**What's Next:**

1. Phase 4 (optional): Dashboard prop-drilling to PeriodSelector
2. Future: Rate limiting on `currencies/rates` endpoint

**Commits This Session:**

-   `af6afd4` - test: update modal tests to use renderWithSharedData (#164)
-   `3de3f8c` - feat: add SalaryPeriodContext for cross-page data caching (#164)

**Current Branch:** `feat/optimize-dashboard-api-calls`

---

## 2026-01-10: Optimize Dashboard API Calls - Phase 1 & 2 Complete (#164)

**Session Summary:** Investigated frontend API call redundancies, analyzed webserver logs for runtime impact, implemented Phase 1 & 2 optimizations.

**Webserver Log Analysis (E2E Test Run - Before Optimization):**

| API Endpoint             | Actual Calls | Problem                                       |
| ------------------------ | ------------ | --------------------------------------------- |
| `salary-periods/{id}`    | 623          | Same period fetched by multiple components    |
| `currencies/rates`       | 537          | Not fully centralized despite CurrencyContext |
| `default-currency`       | 523          | Every component fetches independently         |
| `salary-periods/current` | 412          | Dashboard, Debts, Reports all call            |
| `budget-periods`         | 367          | Dashboard and child components duplicate      |

**Static Code Analysis:**

-   `debtAPI.getAll()` called by 6 different modals
-   `subcategoryAPI.getAll()` called by 5 different locations
-   `goalAPI.getAll()` called by 3 different locations
-   `salaryPeriodAPI.getCurrent()` called by 4 different components

**Phase 1 Optimizations Implemented:**

1. Dashboard caches `salaryPeriodData` in state and passes to child components
2. WeeklyBudgetCard accepts `initialSalaryPeriodData` prop, skips API call if provided
3. SalaryPeriodRolloverPrompt accepts `salaryPeriodData` prop with fallback pattern

**Phase 2 Optimizations Implemented:**

1. Created `SharedDataContext` for centralized caching of debts/goals/subcategories
2. Updated 5 modals to use cached data instead of fetching:
    - AddExpenseModal, EditExpenseModal, FilterTransactionsModal
    - AddRecurringExpenseModal, AddDebtPaymentModal
3. Added cache invalidation (refreshDebts/refreshGoals/refreshSubcategories) to:
    - Debts.jsx (after create/update/delete)
    - Goals.jsx (after create/update/delete)
    - Settings.jsx (after subcategory CRUD)

**Branch:** `feat/optimize-dashboard-api-calls`

**Files Changed (Phase 2):**

-   `frontend/src/contexts/SharedDataContext.jsx` - NEW: Centralized data caching
-   `frontend/src/App.jsx` - Added SharedDataProvider wrapper
-   `frontend/src/components/AddExpenseModal.jsx` - Use SharedDataContext
-   `frontend/src/components/EditExpenseModal.jsx` - Use SharedDataContext
-   `frontend/src/components/FilterTransactionsModal.jsx` - Use SharedDataContext
-   `frontend/src/components/AddRecurringExpenseModal.jsx` - Use SharedDataContext
-   `frontend/src/components/AddDebtPaymentModal.jsx` - Use SharedDataContext
-   `frontend/src/pages/Debts.jsx` - Add refreshSharedDebts calls
-   `frontend/src/pages/Goals.jsx` - Add refreshSharedGoals calls
-   `frontend/src/pages/Settings.jsx` - Add refreshSharedSubcategories calls

**What's Next (Resume Here Tomorrow):**

1. **FIRST:** Run `btest f` to verify frontend tests pass
2. **THEN:** Run `bformat` to format all code
3. **THEN:** Commit Phase 2 with message: `feat: add SharedDataContext for modal data caching (#164)`
4. **OPTIONAL Phase 3:** Create SalaryPeriodContext for cross-page salary period data sharing
5. **OPTIONAL Phase 4:** Audit other pages (Expenses.jsx, Income.jsx, Debts.jsx) for similar redundancies

**Key Files to Review:**

-   `frontend/src/contexts/SharedDataContext.jsx` - The new context for caching
-   `frontend/src/App.jsx` - Where SharedDataProvider is wrapped

**Current Branch:** `feat/optimize-dashboard-api-calls` (uncommitted changes)

---

## 2026-01-10: Production Balance Bug - Period is_active Flag

**Session Summary:** Investigated production bug where debit balance showed €2,714.03 instead of expected €174.99.

**Root Cause:** Period 1 (2025-11-20 to 2025-12-19) had `is_active = false` in production database. The balance_service.py filters periods by `is_active=True` when determining earliest date for sync mode calculations, causing:

-   Income only counted from Period 2 start (1,733 cents instead of 313,628 cents)
-   Expenses only counted from Period 2 start (37,530 cents instead of 607,664 cents)
-   Wrong calculation: 307,200 + 1,733 - 37,530 = 271,403 cents (€2,714.03)
-   Correct calculation: 307,200 + 313,628 - 607,664 = 13,164 cents (€131.64)

**Fix:** Created SQL migration to set Period 1 `is_active = true`.

**Lesson Learned:** Always verify production database state before any database-related migration. Added Rule #7 to Critical Rules and comprehensive Production Database Verification Checklist to PROMPT_TEMPLATES.md.

**Files Changed:**

-   `docs/migrations/2026-01-10_fix_period_is_active_for_sync_balance.sql` - Fix migration
-   `.github/copilot-instructions.md` - Added Rule #7 for production DB verification
-   `.github/PROMPT_TEMPLATES.md` - Added Production Database Verification Checklist

**What's Next:** Run SQL fix in Neon, verify balance displays correctly

---

## 2026-01-10: Fix #165 - Balance Mode DB Constraint Mismatch

**Session Summary:** Fixed production bug where balance mode switching fails with constraint violation.

**Root Cause:** Migration `2026-01-05_add_user_balance_fields.sql` created constraint with `'cumulative'` but code uses `'budget'`. This caused `check_user_balance_mode_valid` constraint violation when trying to change mode.

**Fix:**

-   Created migration script to drop/recreate constraint with correct values
-   Added tests for balance mode switching endpoint

**Files Changed:**

-   `docs/migrations/2026-01-10_fix_balance_mode_constraint.sql` - Production migration
-   `backend/tests/test_user_data.py` - Added TestBalanceMode class

**What's Next:** Run migration on Neon SQL Editor, verify balance display is correct

---

## 2026-01-09: Fix #160 - Manage Salary Period Shows Selected Period Values

**Session Summary:** Fixed four related bugs:

1. Clicking "Manage Salary Period" showed current period's values instead of selected period's values
2. After editing a salary period, dashboard balances didn't update
3. In SYNC mode, editing anchor period's initial debit balance didn't update display balance
4. In SYNC mode, editing future period's debit balance didn't update the associated Salary income

### Bug 1: Wrong Period Values in Wizard

**Root Cause:** The `onSetupClick` handlers in Dashboard.jsx were fetching all salary periods via API and finding the `is_active` period, instead of using the already-tracked `viewingSalaryPeriodId` state.

**Fix:** Modified both `onSetupClick` handlers to use `viewingSalaryPeriodId` from state.

### Bug 2: Balance Not Updating After Edit (Frontend)

**Root Cause:** After editing salary period, `onComplete` callback only called `loadPeriodsAndCurrentWeek()` which loads current period data. If viewing a non-current period, that period's data wasn't reloaded.

**Fix:** Pass `loadSalaryPeriodData` and `viewingSalaryPeriodId` to DashboardModals, and call `loadSalaryPeriodData(viewingSalaryPeriodId)` in `onComplete` callback.

### Bug 3: Anchor Period Balance Edit Not Reflected (Backend)

**Root Cause:** In SYNC mode, `display_debit_balance` uses `user.user_initial_debit_balance` as anchor. When editing the anchor period, only salary_period was updated.

**Fix:** When editing the anchor salary period (contains `balance_start_date`):

-   Update `user.user_initial_debit_balance`, `user.user_initial_credit_available`, `user.user_initial_credit_limit`
-   Update "Initial Balance" income record to stay in sync

### Bug 4: Future Period Balance Edit Not Reflected (Backend)

**Root Cause:** When creating a future period in SYNC mode, user can opt to create a "Salary" income. When editing, this income wasn't updated.

**Fix:** Use concrete naming convention `"Projected Period Salary: <start_date>"` for the income type:

-   **Frontend (SalaryPeriodWizard.jsx):** Create income with `type: "Projected Period Salary: <startDate>"`
-   **Backend (salary_periods.py):** Match on exact type string `"Projected Period Salary: <start_date>"`

This provides concrete matching instead of fragile date+type lookups.

### Files Changed

-   `frontend/src/pages/Dashboard.jsx` - Fixed onSetupClick handlers, pass new props to DashboardModals
-   `frontend/src/components/dashboard/DashboardModals.jsx` - Accept new props, reload viewed period data on complete
-   `frontend/src/components/SalaryPeriodWizard.jsx` - Use concrete "Period Salary: <date>" type for future period income
-   `backend/routes/salary_periods.py` - Update user anchor balances, Initial Balance income, and future Period Salary income when editing

### Testing Status

-   Issue #160 fix (wizard values) confirmed working
-   Past/current period balance edit confirmed working
-   Future period balance edit needs testing

---

## 2026-01-08: Issue #149 Complete - PR #156 Ready for Merge

**Session Summary:** Completed all 6 phases of Issue #149 (Balance Calculation Refactoring).

### Work Completed This Session

1. **Fixed 6 failing backend tests** - Updated function signatures in `test_balance_service.py`
2. **Fixed credit display bug** - Past/future periods now show correct credit values
3. **Phase 6 complete:**
    - Task 1: Renamed `user_initial_credit_debt` → `user_initial_credit_available`
    - Task 2: Hidden "Initial Balance" Income markers from user lists
    - Task 3: Hidden "Pre-existing Credit Card Debt" Expense markers from user lists
    - Task 4: Reviewed dead code paths (kept fallbacks for backward compatibility)
    - Task 5: Fixed `test_get_all_income` test
4. **Updated Issue #149** with acceptance criteria comment
5. **Pushed 10 commits** to `fix/149-initial-balance-accumulation`
6. **Updated PR #156** with comprehensive description

### Branch/PR Status

-   **Branch:** `fix/149-initial-balance-accumulation`
-   **PR:** #156 - Ready for review and merge
-   **Tests:** All 621 backend tests passing

### What's Next

1. **Manual testing** (optional) - Verify credit display fix in UI
2. **Merge PR #156** - After CI passes
3. **Feature flag graduation** (deferred) - Move to separate PR if desired
4. **Production migration** - Run `docs/migrations/2026-01-08_rename_credit_debt_to_available.sql` on Neon

### Files to Note

-   `docs/migrations/2026-01-08_rename_credit_debt_to_available.sql` - Must run on Neon before/after deploy
-   `backend/routes/income.py` - Added `include_markers` param
-   `backend/routes/expenses.py` - Added `include_markers` param

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

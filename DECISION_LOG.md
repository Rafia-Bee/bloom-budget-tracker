# Decision Log

Session continuity for AI context + architectural decisions. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-20: Production Issues - No Period Mode & Wizard Fixes

**Session Summary:** Fixed multiple production issues for scenario where user's last period ended and needs to create a new one.

**Commits on branch `fix/production-issues-jan-2026`:**

1. **Show transactions when no current period** - TransactionList now visible with day navigation even without active period
2. **Fix recurring badge for income** - Badge now shows for income transactions with `recurring_income_id`
3. **Exclude soft-deleted recurring income from wizard** - Changed to use `.active()` filter
4. **Pre-fill balances in wizard** - Fetches global balances when no edit/rollover data
5. **Pre-existing expenses warning** - Shows count/total of non-fixed-bill expenses in wizard step 3
6. **Fix budget calculation** - Create endpoint now includes `expected_income` (was missing, causing negative budget error)

**Key Bug: Budget Creation Failed with Negative Budget**

- **Problem**: Preview showed €1,217.86 budget, but create failed with CHECK constraint (negative budget)
- **Root Cause**: Preview calculated `debit + credit + expected_income - fixed_bills`, but create was missing `expected_income`
- **Fix**: Added `expected_income` handling to create endpoint, frontend now passes it in payload

**New Backend Feature: is_fixed_bill Filter**

- Added `is_fixed_bill` query param to `/expenses` endpoint for server-side filtering
- Used by wizard to fetch only non-fixed-bill expenses for pre-existing expense preview

**GitHub Issue Created:** Orphaned Transactions Warning Banner (#XX) - for handling transactions in date gaps between periods

**Files Changed:**

- `backend/routes/expenses.py` - Added `is_fixed_bill` filter param
- `backend/routes/salary_periods.py` - Fixed soft-delete filter, added expected_income to create
- `frontend/src/pages/Dashboard.jsx` - No-period transaction loading
- `frontend/src/components/DateNavigator.jsx` - scheduledDates for no-period mode
- `frontend/src/components/dashboard/TransactionList.jsx` - Fixed recurring badge for income
- `frontend/src/components/SalaryPeriodWizard.jsx` - Balance pre-fill, expected_income payload, pre-existing expenses preview

**What's Next:** Push branch and create PR when ready

---

## 2026-01-19: Bug Fixes - Import Constraint & API Cleanup

**Session Summary:** Fixed production import failure and simplified recurring generation API.

**Bug 1: Import Failing on Recurring Expense Date Constraint**

- **Issue**: CHECK constraint `start_date < end_date` failed when importing recurring expense with `start_date == end_date`
- **Root Cause**: Valid use case for one-time scheduled payments where both dates are equal
- **Fix**: Changed constraint to `start_date <= end_date` in both `recurring_expenses` and `recurring_income` tables
- **Files Changed**:
    - `backend/models/database.py` - Model constraint updated
    - `docs/migrations/FIX_RECURRING_DATE_CONSTRAINT_2026-01-19.sql` - Production SQL script (already applied)
    - Local SQLite recreated with fixed constraint

**Bug 2: Confirm Schedule Button Error**

- **Issue**: `recurringGenerationAPI.generateIncome is not a function`
- **Root Cause**: Non-existent API function was being called
- **Fix**: Replaced with unified `recurringGenerationAPI.generate(false, null, includeIncome)`

**API Cleanup: Simplified Recurring Generation**

- **Removed duplicates**:
    - `recurringExpenseAPI.generateNow()` → Use `recurringGenerationAPI.generate()`
    - `recurringExpenseAPI.previewUpcoming()` → Use `recurringGenerationAPI.previewExpenses()`
- **Clean API structure**:
    - `recurringExpenseAPI` - CRUD for expense templates only
    - `recurringIncomeAPI` - CRUD for income templates only
    - `recurringGenerationAPI` - Unified generation/preview for both

**Bug 3: Generated Income Showing Wrong Name**

- **Issue**: Income generated from recurring template showed "Salary" instead of template's custom name
- **Fix**: Backend `income.py` now returns `name` from linked recurring template
- **Frontend**: All income displays use `name || type` pattern

**Files Changed:**

- `backend/models/database.py`
- `backend/routes/income.py`
- `frontend/src/api.js`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/RecurringExpenses.jsx`
- `frontend/src/components/dashboard/TransactionList.jsx`
- `frontend/src/components/dashboard/DashboardModals.jsx`
- `frontend/src/components/TransactionCard.jsx`
- `frontend/src/test/setup.js`

---

## 2026-01-19: Issue #177 - Recurring Income Feature (Phases 1-8 COMPLETE)

**Session Summary:** Implementing Recurring Income feature. All 8 phases complete - backend, feature flag, unified recurring page, AddIncomeModal, dashboard, wizard, tests, and documentation.

**Phase 1 Completed: Backend Model & API**

1. **RecurringIncome Model** - New model in database.py mirroring RecurringExpense structure
2. **Income Model Updated** - Added `recurring_income_id` foreign key
3. **User Model Updated** - Added `payment_date_adjustment` preference
4. **New recurring_income.py Routes** - Full CRUD for recurring income templates
5. **Updated recurring_generator.py** - Extended to handle income generation
6. **Updated recurring_generation.py Routes** - Extended for income

**Phase 2 Completed: Database Migration**

- Flask-Migrate migration applied to local SQLite
- SQL script for production: `docs/migrations/2026-01-19_recurring_income.sql`

**Phase 3 Completed: Feature Flag & Settings UI**

1. **Feature Flag Added** - `recurringIncomeEnabled` in FeatureFlagContext.jsx
2. **Experimental Features Modal** - Added Recurring Income toggle with BETA badge
3. **API Functions Added** - `recurringIncomeAPI`, `recurringGenerationAPI`, payment date functions
4. **Settings Preferences Tab** - Added "Income Payment Date" setting

**Phase 4 Completed: Unified Recurring Page**

1. **AddRecurringIncomeModal.jsx** - New modal for creating/editing recurring income templates
    - Similar structure to AddRecurringExpenseModal
    - Income types: Salary, Bonus, Freelance, Rental, Dividends, Other
    - Green/mint theme to distinguish from expenses

2. **RecurringExpenses.jsx Upgraded** - Now handles both expenses and income
    - Layout restructured: Active/Upcoming tabs + Add button on same row (proper alignment)
    - Sub-tabs (Expenses/Income) appear in second row with pastel colors (rose-50, emerald-50)
    - Active > Expenses: Shows expense templates (unchanged behavior when flag off)
    - Active > Income: Shows income templates with green styling
    - Upcoming tab: Combined view with color-coded items (💸 expenses, 💰 income)
    - Sorted by date, income shown with green border/background
    - All CRUD operations working for both types

3. **State Management** - Added:
    - `recurringIncome`, `scheduledIncome` arrays
    - `activeSubTab` for expenses/income toggle
    - `editingIncome`, `deleteIncomeConfirm` states
    - Handler functions for income operations

4. **Feature Flag Integration** - All income features hidden when flag is off:
    - Sub-tabs not shown
    - Add Income button not shown
    - Upcoming view only shows expenses

**Phase 5 Completed: AddIncomeModal Recurring Option**

1. **AddIncomeModal.jsx Upgraded** - Added "Make this a recurring income" checkbox
    - Only shown when `recurringIncomeEnabled` feature flag is on
    - Same frequency options as AddExpenseModal (weekly, biweekly, monthly, custom)
    - Green/emerald theme for recurring options panel
    - Button text changes to "Create Template" when recurring is checked
    - Modal now supports scrolling with fixed footer (like AddExpenseModal)
    - Extended income types: Salary, Bonus, Freelance, Rental, Dividends, Other

2. **Implementation Pattern** - Mirrors AddExpenseModal:
    - `isRecurring` state controls visibility of frequency options
    - When checked: calls `recurringIncomeAPI.create()` instead of `onAdd()`
    - Uses form ID for external submit button

**Phase 6 Completed: Dashboard Scheduled Tab Integration**

1. **Dashboard.jsx Updated** - Added support for scheduled income
    - Added `scheduledIncome` state and `loadScheduledIncome()` function
    - Uses `recurringGenerationAPI.previewIncome()` API
    - Passes new props to TransactionList: `scheduledIncome`, `recurringIncomeEnabled`, `loadScheduledIncome`
    - Loads scheduled income when switching to scheduled view

2. **TransactionList.jsx Upgraded** - Unified scheduled items view
    - Combines `scheduledExpenses` and `scheduledIncome` into sorted list
    - Color-coded items: green border for income, red for expenses
    - Type badges show "Income" or "Expense" for each item
    - "Confirm Schedule" button generates both types simultaneously
    - Delete selection properly identifies expense vs income IDs
    - Empty state message adapts: "transactions" when flag on, "expenses" when off
    - Feature flag gating: income items only shown when `recurringIncomeEnabled` is true

**Files Modified in Phase 6:**

- `frontend/src/pages/Dashboard.jsx` - Added scheduled income support
- `frontend/src/components/dashboard/TransactionList.jsx` - Unified scheduled view

**Phase 6.5 Completed: Budget Period Wizard Integration**

1. **Backend preview endpoint Updated** - `/salary-periods/preview` now includes expected income:
    - Queries `RecurringIncome` templates for user
    - Returns `expected_income` array and `expected_income_total`
    - Budget calculation: `debit + credit_allowance + expected_income - fixed_bills`
    - Accepts `expected_income` adjustments from frontend (like fixed_bills)

2. **SalaryPeriodWizard.jsx Updated** - Shows expected income in Step 2:
    - New `recurringIncomeEnabled` feature flag check
    - New `expectedIncome` state array
    - Step 2 shows "Expected Income" section (green/emerald theme) after Fixed Bills
    - Users can adjust or remove expected income amounts
    - Total Expected Income displayed with +amount format
    - Step 3 calculation now shows "+ Expected Income" in breakdown

3. **User Flow:**
    - Wizard auto-detects recurring income templates from database
    - Income shown in green/emerald styling (vs pink for expenses)
    - Users can edit amounts for this period only (doesn't change template)
    - Expected income adds to available budget
    - Formula: Total Budget = Debit + Credit Allowance + Expected Income - Fixed Bills

**Files Modified in Phase 6.5:**

- `backend/routes/salary_periods.py` - Added RecurringIncome import, expected income to preview
- `frontend/src/components/SalaryPeriodWizard.jsx` - Added expected income state, display, and handlers

**Phase 7 Completed: Backend Tests**

1. **test_recurring_income_routes.py** - New test file with 13 tests:
    - CRUD tests: create, list, get by ID, update, delete, toggle active
    - Validation tests: accepts custom income types, handles unknown frequency
    - Negative amount rejection test

2. **test_recurring_generation_routes.py** - Extended with 6 new tests:
    - `TestGenerateWithIncomeEndpoint`: Tests generate with include_income parameter
    - `TestPreviewIncomeEndpoint`: Tests preview-income endpoint auth, data, filtering
    - Updated existing tests for new response format (total_generated)

**What's Next:**

- ✅ Phase 8 COMPLETE - Ready for PR review
- Merge PR when approved

**Phase 8 Completed: Final Documentation**

1. **FEATURE_FLAGS.md Updated** - Added `recurringIncomeEnabled` flag documentation
2. **RECURRING_EXPENSES.md Updated** - Renamed conceptually to "Recurring Transactions", added full RecurringIncome section with data model and API endpoints
3. **API.md Updated** - Added complete Recurring Income section with all endpoints documented
4. **Test Fixes** - Fixed AddIncomeModal tests (FeatureFlagProvider wrapper), added testOutput cleanup to run_all_tests.ps1

**Test Results:**

- Frontend: 1002 tests passed ✅
- Backend: 669 tests passed ✅
- E2E: 3 flaky tests (balance-mode, unrelated to #177)

**Files Modified in Phase 8:**

- `docs/FEATURE_FLAGS.md` - Added recurringIncomeEnabled
- `docs/RECURRING_EXPENSES.md` - Added recurring income section
- `docs/API.md` - Added recurring income API docs
- `frontend/src/test/AddIncomeModal.test.jsx` - Fixed FeatureFlagProvider context
- `scripts/run_all_tests.ps1` - Added stale output cleanup

**Related:** #177

---

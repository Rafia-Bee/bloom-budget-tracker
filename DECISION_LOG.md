# Decision Log

Session continuity for AI context + architectural decisions. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-19: Issue #177 - Recurring Income Feature (Phases 1-5)

**Session Summary:** Implementing Recurring Income feature. Phases 1-5 complete backend, feature flag, unified recurring page, and AddIncomeModal recurring option.

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

- Run all tests
- Phase 8: Final documentation

**Related:** #177

---

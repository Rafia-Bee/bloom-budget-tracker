# Decision Log

Architectural decisions only. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2025-12-24

### Multi-Currency API Switch to ExchangeRate-API (Issue #7)

**Context:** Initial implementation used frankfurter.app (ECB data, 30 currencies). User requested support for all world currencies including BDT (Bangladeshi Taka) for global accessibility. Emoji flags had rendering issues on some systems.

**Solution - API Migration:**

-   **Old:** frankfurter.app (ECB data, ~30 European currencies)
-   **New:** ExchangeRate-API open access endpoint (165 currencies, global coverage)

**Changes:**

1. **Backend (`currency_service.py`):**
    - Changed API endpoint: `api.frankfurter.app` → `open.er-api.com/v6/latest/{currency}`
    - Expanded `SUPPORTED_CURRENCIES` from 8 to 165 currencies
    - Added comprehensive `CURRENCY_INFO` with symbols for all currencies
    - Removed `flag` field from currency metadata
    - Updated API response parsing (frankfurter uses `date` field, ExchangeRate-API uses `time_last_update_unix`)
2. **Frontend:**
    - `formatters.js`: Removed flag emojis, text-only display
    - `CurrencySelector.jsx`: Updated to show "CODE - Name" format (no flags)
3. **API Documentation:**
    - Attribution required: "Rates By Exchange Rate API (https://www.exchangerate-api.com)"
    - Rate limits: Updates once per day, requests cached for 24 hours
    - Free tier: No API key for open access endpoint

**Rationale:**

-   **Global coverage:** BDT and 150+ other currencies vs 30 European currencies
-   **User accessibility:** Friends/users from Bangladesh, Asia, Africa, South America can now use the app
-   **Better compatibility:** Text-only display works across all platforms (no emoji rendering issues)
-   **Same architecture:** Daily caching strategy unchanged, still supports offline PWA

**Trade-offs:**

-   Attribution link required (acceptable for free tier)
-   No historical rates in open access version (current rates only)
-   Rate updates once per day (same as before)

**Impact:** Bloom Budget Tracker is now truly global - supports currencies from 165 countries including developing nations. Users can select from BDT, INR, NGN, KES, etc.

---

### Multi-Currency Support Phase 1 (Issue #7)

**Context:** Users need to record expenses in different currencies for travel, foreign income, and cross-border shopping.

**Solution - Phased Approach:**

-   **Phase 1 (MVP):** Infrastructure + basic currency selection
-   **Phase 2:** Historical rates, full conversion display
-   **Phase 3:** Multi-currency accounts, reports

**Database Changes:**

-   `users.default_currency` - User's preferred base currency (VARCHAR(3), default 'EUR')
-   `expenses.currency` & `income.currency` - Transaction currency (VARCHAR(3), default 'EUR')
-   `expenses.original_amount` & `income.original_amount` - For storing unconverted amounts
-   New `exchange_rates` table - Cache for frankfurter.app API rates

**Design Decisions:**

1. **Store in original currency, convert on read** - Preserves historical accuracy
2. **ExchangeRate-API open access** - Free, no API key, 165 currencies, global coverage
3. **Daily rate caching** - Minimize API calls, support offline PWA
4. **EUR as default** - Existing data remains valid, user can change preference
5. **Migration compatible** - All new fields have server defaults, existing records get EUR

**New Files:**

-   `backend/services/currency_service.py` - Exchange rate fetching, caching, conversion
-   `backend/routes/currency.py` - `/currencies`, `/currencies/rates`, `/currencies/convert`
-   `frontend/src/utils/formatters.js` - Centralized `formatCurrency`, `formatWithConversion`
-   `frontend/src/components/CurrencySelector.jsx` - Reusable currency dropdown
-   `docs/migrations/007_add_currency_support.sql` - Production migration for Neon

**Impact:** Users can now select currency when adding expenses/income, set default currency in Settings. Phase 2 will add conversion display and historical rates.

---

### Goals: Initial Amount & Transaction History (Issues #99 & #105)

**Context:** Users wanted to track pre-existing savings when creating goals and see contribution history for each goal.

**Solution:**

-   Added `initial_amount` field to Goal model (integer cents, default 0)
-   Progress calculation now includes: `current_amount = initial_amount + contributions`
-   New `GET /goals/{id}/transactions` endpoint with pagination and running balance
-   Frontend: CreateGoalModal & EditGoalModal now have "Already Saved (€)" field
-   Frontend: Goals page has expandable transaction history per goal (like Debts page)

**Design Decisions:**

1. **Initial amount stored separately** - Not as a fake expense, maintains clean transaction history
2. **Running balance per transaction** - Shows how savings grew over time
3. **Validation: initial_amount <= target_amount** - Cannot start already complete
4. **Progress breakdown** - API returns `initial_amount`, `contributions_amount`, and `current_amount`

**Impact:** Users can now enter money they've already saved before tracking, and view full contribution history. 21 backend tests + 113 frontend tests pass.

---

### Day-by-Day Transaction Navigation (Issue #92)

**Context:** Users wanted quick navigation between dates with transactions instead of using the filter modal.

**Solution:**

-   Created new `DateNavigator` component with Previous/Today/Next buttons
-   Added backend endpoint `GET /expenses/dates-with-transactions` returning sorted ISO dates
-   Integrated with Dashboard's existing filter system - clicking a date sets start/end date filters
-   Added clear button to return to period view

**Design Decisions:**

1. **Navigation skips empty dates** - Previous/Next jump to dates that have transactions, not sequential days
2. **Works with existing filters** - Other filters (category, payment method, etc.) still apply
3. **Null state = period view** - When no date selected, shows current period's transactions
4. **Handles both SQLite and PostgreSQL** - Backend formats dates consistently regardless of DB driver

**Impact:** Users can now browse transaction history with 1 click instead of 5. 24 frontend tests + 3 backend tests added.

---

### System Subcategories Database Restoration (Issue #103)

**Context:** User reported all subcategories disappeared from Settings, but old subcategories still showing in Add Expense modal.

**Investigation:**

-   Migration `a1b2c3d4e5f6_add_subcategory_model.py` was correctly applied (alembic_version confirmed)
-   Database query revealed 0 system subcategories despite migration having insert statements
-   Determined data was accidentally deleted post-migration

**Solution:**

-   Created Python script to restore 14 system default subcategories:
    -   Fixed Expenses (5): Rent/Mortgage, Utilities, Insurance, Subscriptions, Other
    -   Flexible Expenses (6): Food, Transportation, Entertainment, Shopping, Health, Other
    -   Savings & Investments (1): Other (users create specific goals via Goals page)
    -   Debt Payments (2): Credit Card, Other
-   All subcategories have `user_id=NULL`, `is_system=True`, `is_active=True`

**Decision:** Added data validation check to prevent future accidental deletion of system defaults. Database restoration script can be reused if needed.

**Impact:** Users now see default subcategories in Settings and can create custom subcategories again. Issue #103 closed.

---

## 2025-12-24

### Frontend Test Suite Expansion: Modal Component Coverage (6 components, 142 tests)

**Context:** Expanded test coverage for critical modal components with comprehensive test suites covering form validation, user interactions, error handling, and accessibility.

**Components Tested:**

1. **ExportImportModal** (20 tests)

    - Export mode: Checkbox selection, API calls, data types
    - Import mode: File upload, JSON/CSV validation, error handling
    - Weekly breakdown CSV export feature testing

2. **EditExpenseModal** (21 tests)

    - Pre-filled form data from expense object
    - Form updates: name, amount, date, category, subcategory, payment method
    - Cents conversion, loading states, error dismissal

3. **BankImportModal** (35 tests)

    - Input step: Transaction paste, payment method, fixed bills toggle
    - Preview API integration, transaction table display
    - Import confirmation, success/error handling, navigation

4. **AddIncomeModal** (29 tests)

    - Income type selection (Salary/Bonus/Freelance/Other)
    - Form validation, cents conversion, submission flow
    - Error handling with dismissible messages

5. **Header** (24 tests)

    - Desktop/mobile navigation, user menu dropdown
    - Import/Export submenu, logout functionality
    - React Router integration with BrowserRouter

6. **AddDebtModal** (33 tests)

    - Required fields: name, current balance
    - Optional fields: original amount (defaults to current balance), monthly payment (defaults to 0)
    - Cents conversion for all monetary fields

7. **EditIncomeModal** (29 tests) + **BUG FIX**
    - Pre-filled income data, type/amount/date editing
    - Date format conversion (display → YYYY-MM-DD)
    - **Bug Fixed:** Duplicate "Type" label → proper "Date" field with date input
    - **Accessibility:** Added htmlFor attributes to all labels

**Test Pattern Established:**

Each modal follows consistent structure:

-   Rendering (titles, fields, buttons)
-   Form interactions (typing, selections)
-   Validation (required fields, constraints)
-   Submission (API calls, loading states, cents conversion)
-   Error handling (display, dismissal, loading reset)
-   Modal close actions (Cancel, X button)

**Bug Fixed:** EditIncomeModal had incorrect field - duplicate "Type" label instead of "Date" field. Fixed to proper date input with type="date" and added htmlFor attributes for all labels improving accessibility.

**Test Count Progress:**

-   Started: 279 frontend tests
-   Added: 62 tests (this session)
-   Current: **341 frontend tests**

**Coverage Impact:**

-   All critical modal forms now have comprehensive test coverage
-   Tests caught real bug (EditIncomeModal date field)
-   Regression protection for form validation, submission, error handling
-   Accessibility improvements: htmlFor attributes on all form labels

**Remaining Components:**

-   AddRecurringExpenseModal (~30-35 tests planned)
-   CreateGoalModal (~25-30 tests planned)

**Rationale:** Modal components are critical user interaction points. Comprehensive testing prevents regressions in form validation, data handling, and error scenarios. Consistent test structure improves maintainability and makes it easy to add new modal tests following the established pattern.

**Impact:** Significantly improved test coverage for user-facing forms. Tests serve as living documentation of expected behavior and provide safety net for future refactoring. Bug discovery demonstrates value of comprehensive testing.

---

### Security Audit: Cross-User Data Leakage Review (#100, #101)

**Context:** Performed comprehensive security audit of backend routes and services for cross-user data leakage vulnerabilities.

**Findings:**

1. **SECURE - Properly Protected:**

    - All major routes (expenses, income, debts, recurring_expenses, salary_periods, budget_periods) use `filter_by(id=X, user_id=Y)` pattern
    - balance_service.py has user_id scoping (fixed in #100)
    - Export/import routes properly scope all queries

2. **LOW RISK - Enumeration Vulnerability (#101):**
    - `goals.py`: 3 endpoints use `.query.get(id)` + ownership check
    - `subcategories.py`: 2 endpoints use `.query.get(id)` + ownership check
    - Pattern reveals resource existence (403 vs 404) but doesn't leak data

**Recommendation:** Change to single-query pattern for consistency:

```python
# Before (reveals existence)
goal = Goal.query.get(id)
if goal.user_id != current_user_id: return 403

# After (uniform 404)
goal = Goal.query.filter_by(id=id, user_id=current_user_id).first()
if not goal: return 404
```

**Impact:** Codebase is well-protected. 5 low-risk issues tracked in #101 for cleanup.

---

## 2025-12-23

### Recurring Expenses: Radical Redesign Implementation (#93)

**Context:** User requested complete overhaul of recurring expense system from automatic scheduling to on-demand generation with user-configurable preview settings.

**Decision:**

1. **On-Demand Generation**: Removed all automatic recurring expense generation

    - Eliminated automatic generation from AddExpenseModal
    - Removed "Generate Now" button from RecurringExpenses page
    - Removed GitHub Actions workflow for automated generation

2. **User-Configurable Lookahead**: Added recurring_lookahead_days setting to User model

    - Range: 7-90 days (default 14)
    - Database column with CHECK constraint
    - API endpoints: GET/PUT `/user-data/settings/recurring-lookahead`
    - Settings → Preferences UI for configuration

3. **Dashboard Integration**: Added Transactions/Scheduled toggle

    - Shows upcoming recurring expenses in scheduled view
    - Uses user's lookahead setting for preview window
    - "Confirm Schedule" button generates expenses on-demand

4. **RecurringExpenses Integration**: Added Active/Upcoming toggle
    - Active tab: Manage templates (no Generate Now button)
    - Upcoming tab: Preview and confirm scheduled expenses
    - Bulk selection/deletion for scheduled items

**Implementation:**

-   **Backend Changes**:

    -   User model: Added `recurring_lookahead_days` column with constraint
    -   Routes: Added lookahead setting endpoints in `user_data.py`
    -   Generator: Updated to use user setting as default in `recurring_generation.py`
    -   API: Modified `recurringExpenseAPI` to support null daysAhead (uses user setting)

-   **Frontend Changes**:

    -   Dashboard: Added transactionView state with Transactions/Scheduled toggle
    -   RecurringExpenses: Added view state with Active/Upcoming toggle
    -   Settings: Added Preferences tab with lookahead dropdown (7-90 days)
    -   Removed automatic generation from AddExpenseModal

-   **Database Migration**:
    -   Added `recurring_lookahead_days` INTEGER NOT NULL DEFAULT 14 to users table
    -   Check constraint: `recurring_lookahead_days >= 7 AND recurring_lookahead_days <= 90`

**Rationale:** User feedback indicated automatic generation was intrusive and unpredictable. On-demand model gives users full control over when expenses are created while maintaining the convenience of templates. User-configurable lookahead accommodates different planning horizons (weekly vs monthly expense cycles).

**Impact:** Complete shift from "push" to "pull" model for recurring expenses. Users now intentionally preview and confirm scheduled expenses rather than having them automatically generated. Improved user agency and predictability while maintaining template convenience.

**Status:** ✅ FULLY COMPLETE - All automatic generation removed, on-demand system implemented, user lookahead configuration functional.

---

## 2025-12-22

### Goals & Savings: Complete Feature Implementation (#4)

**Context:** Implemented comprehensive goals and savings tracking system with seamless expense integration, leftover budget allocation, and date-aware progress calculation.

**Final Implementation:**

1. **Core Features:**

    - Goals create/manage subcategories under "Savings & Investments" (without "Goal" suffix)
    - Progress calculation: date-filtered (only past/today expenses count)
    - Expense modal auto-completion: "{Goal Name} Contribution" or "Other Contribution"
    - Recurring expense modal: dynamic goal integration with empty state hints

2. **Leftover Budget Integration:**

    - Users can allocate leftover weekly budget to EITHER debts OR goals
    - Allocation type selector: 💳 Debt Payments or 🎯 Savings Goals
    - Goal selection shows progress bars and target amounts
    - Creates proper expense with goal's subcategory for tracking

3. **UX Refinements:**
    - Only show "Other" subcategory when no goals exist (with creation hint)
    - Show only actual goal names when goals exist (no default categories)
    - Handle NaN display for zero-progress goals ($0.00, 0%)
    - Proper subcategory object-to-string conversion in all modals

**Rationale:** Date-filtering ensures progress reflects actual contributions, not scheduled/future ones. Leftover allocation integration encourages intentional savings. Clean subcategory display reduces cognitive load.

**Impact:** Complete end-to-end savings tracking. Users can create goals, track progress through natural expense flow, and allocate leftover budget meaningfully. System automatically maintains data integrity across goals, expenses, and subcategories.

**Status:** ✅ FULLY COMPLETE - All core functionality + integrations implemented and tested.

---

## 2025-12-22

### Navigation UX Improvements: Settings to User Menu

**Context:** User feedback requested moving Settings from main navigation bar to user menu. Also needed consistent icon styling and experimental features access across all pages.

**Decision:**

1. **Settings Location**: Move Settings from main nav bar to user menu dropdown
2. **Icon Consistency**: Replace all emojis with matching SVG icons throughout UI
3. **Cross-Page Functionality**: Enable all Header features (export, experimental) on every page

**Implementation:**

-   Removed Settings from main navigation links (desktop & mobile)
-   Added Settings to user menu with gear icon (both desktop & mobile versions)
-   Added modal state management to Settings page for Header functionality
-   Replaced beaker emoji with yellow lightning bolt SVG for experimental features
-   Cleaned up "Delete All Data" to use only SVG icon (removed redundant emoji)
-   Fixed Settings page background to match Dashboard styling

**Rationale:** Cleaner main navigation focuses on core features. User menu is logical place for account/settings. Consistent SVG icons provide professional, theme-aware styling. All pages should have same functionality access.

**Impact:** Simplified navigation, improved visual consistency, better user experience across all pages. Settings easily discoverable but doesn't clutter main nav.

---

### Enhanced Subcategories: Force Delete & User Hints

**Context:** User feedback revealed two issues: force delete was destructive (deleted expenses), and new users didn't discover custom subcategory feature.

**Decision:**

1. **Force Delete Behavior**: Instead of permanently deleting expenses, move them to "Other" subcategory with explanatory notes
2. **System "Other" Category**: Make "Other" a system default in all categories as catch-all
3. **User Discovery Hints**: Add UI hints in Settings page and expense modals to guide new users

**Implementation:**

-   Updated force delete to preserve expense data by moving to "Other" + adding auto-generated notes
-   Added "Other" as system subcategory in all 4 categories via migration
-   Added helpful UI hints in Settings (blue info box) and AddExpenseModal (subtle text below dropdown)

**Rationale:** Data preservation is critical for expense tracking. "Other" provides logical fallback category. UI hints improve feature discoverability without cluttering interface.

**Impact:** Users maintain complete expense history during subcategory reorganization. New users naturally discover customization features.

---

## 2025-12-22

### Implemented Custom Subcategories System (Issue #98)

**Context:** Users needed ability to create custom subcategories for expense organization. System previously used hardcoded category/subcategory arrays.

**Decision:**

-   Keep 4 main categories **fixed**: Fixed Expenses, Flexible Expenses, Savings & Investments, Debt Payments
-   Allow users to create/edit/delete custom **subcategories** within each category
-   Store subcategories in database with system defaults + user custom entries
-   System subcategories (`is_system=true`) cannot be edited/deleted by users

**Implementation:**

-   Added `Subcategory` model with user_id (null for system), category, name, is_system, is_active
-   Created `/subcategories` API endpoints (GET, POST, PUT, DELETE)
-   Updated AddExpenseModal to load subcategories from API with fallback to hardcoded
-   Added migration to seed system default subcategories

**Impact:**

-   Users can now customize expense categorization
-   Maintains data integrity with system defaults
-   Backward compatible with existing expense data
-   Foundation for Goals feature (Goal Contribution subcategories)

---

### Clarified Credit Card Terminology: "Available" vs "Balance" (Issue #98)

**Context:** Confusion arose between traditional credit card terminology and Bloom's prepaid card model. Traditional credit cards use "credit balance" to mean "amount owed," but Bloom treats credit cards like prepaid cards where "balance" means "money you have available."

**Problem:**

-   Code used `creditBalance` and `credit_balance` to mean "available money"
-   This conflicts with traditional credit card terminology where "balance" = debt
-   Caused communication issues when explaining calculations
-   Made code harder to understand for new developers

**Solution:**

Renamed all user-facing and internal references to clarify intent:

1. **Backend API:**

    ```python
    # Before
    return {
        "credit_balance": credit_available,  # Ambiguous!
        "credit_available": credit_available  # Duplicate field
    }

    # After
    return {
        "credit_available": credit_available  # Clear: what you can spend
    }
    ```

2. **Frontend State:**

    ```jsx
    // Before
    const [creditBalance, setCreditBalance] = useState(0); // Confusing!

    // After
    const [creditAvailable, setCreditAvailable] = useState(0); // Clear!
    ```

3. **API Response Fields:**
    - `display_credit_balance` → `display_credit_available`
    - Removed duplicate field from salary period responses

**Kept As-Is:**

-   `initial_credit_balance` (database field) - Kept for migration safety
-   `credit_limit` - Already clear
-   `getCreditDebt()` - Already clear (limit - available)

**Rationale:**

-   **Prepaid Model:** Credit card works like a bank account with max capacity (limit)
    -   `creditAvailable` = Money you HAVE (like account balance)
    -   `creditLimit` = Maximum capacity (like max account balance)
    -   `creditDebt` = Money you've SPENT (limit - available)
-   **Eliminates Ambiguity:** "Available" is unambiguous - always means "what you can spend"
-   **Better Communication:** Easier to explain to users and developers
-   **Consistency:** Matches how debit card uses "balance" to mean "money you have"

**Impact:**

-   ✅ All frontend components now use `creditAvailable` state
-   ✅ Backend returns `credit_available` in API responses
-   ✅ Dashboard, Debts, SalaryPeriodWizard, rollover prompt updated
-   ✅ Helper functions `getCreditAvailable()` and `getCreditDebt()` clearly named
-   ⚠️ Database field `initial_credit_balance` kept for backwards compatibility

**Files Changed:**

-   [backend/services/balance_service.py](backend/services/balance_service.py): Return dict key renamed
-   [backend/routes/salary_periods.py](backend/routes/salary_periods.py): API response field renamed
-   [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx): State variable renamed
-   [frontend/src/pages/Debts.jsx](frontend/src/pages/Debts.jsx): API field reference updated
-   [frontend/src/components/SalaryPeriodWizard.jsx](frontend/src/components/SalaryPeriodWizard.jsx): All form fields and state renamed
-   [frontend/src/components/SalaryPeriodRolloverPrompt.jsx](frontend/src/components/SalaryPeriodRolloverPrompt.jsx): Rollover data props renamed

---

### Consolidated Dashboard Header to Use Shared Component (Issue #97)

**Context:** After implementing the collapsible submenu system with experimental features toggle (issue #95), Dashboard.jsx and Header.jsx had duplicate implementations. Changing the header required editing 2 files instead of 1.

**Problem:**

-   Dashboard had 310 lines (753-1063) of custom header code duplicating Header.jsx functionality
-   Dashboard managed its own mobile menu state: `showUserMenu`, `showMobileMenu`, `expandedMobileSubmenu`
-   Adding new header features (like submenu system) required implementing twice:
    -   Header.jsx for Debts and RecurringExpenses pages
    -   Dashboard.jsx custom header
-   Technical debt from previous iterations where Dashboard needed unique period selector placement

**Solution:**

1. **Made Header.jsx flexible with children prop:**

    ```jsx
    // Desktop: Logo | {children} | Nav | UserMenu
    <div className="flex items-center gap-4">
        {children}
        <NavLink to="/debts">Debts</NavLink>
        {/* ... */}
    </div>;

    // Mobile: Added children slot at top of drawer menu
    {
        children && <div className="mb-4">{children}</div>;
    }
    <NavLink to="/debts">💳 Debts</NavLink>;
    ```

2. **Migrated Dashboard to use Header component:**

    ```jsx
    <Header
        setIsAuthenticated={setIsAuthenticated}
        onExport={() => {
            setShowExportModal(true);
            setExportMode("export");
        }}
        onImport={() => {
            setShowExportModal(true);
            setExportMode("import");
        }}
        onBankImport={() => setShowBankImportModal(true)}
        onShowExperimental={() => setShowExperimentalModal(true)}
    >
        <PeriodSelector
            currentPeriod={currentPeriod}
            periods={salaryPeriods}
            onPeriodChange={handlePeriodChange}
            onCreateNew={() => setShowSalaryWizard(true)}
            onEdit={handleEditPeriod}
            onDelete={handleDeletePeriod}
        />
    </Header>
    ```

3. **Removed duplicate state and imports:**
    - Deleted `showUserMenu`, `showMobileMenu`, `expandedMobileSubmenu` state variables
    - Removed `ThemeToggle` import (Header handles it)
    - Cleaned up click-outside event listener

**Rationale:**

-   **Single source of truth:** Header changes now apply to all pages automatically
-   **Reduced code:** Eliminated 310 lines of duplicate header code from Dashboard
-   **Maintainability:** Future header features (new nav items, menu options) only need 1 update
-   **Consistency:** All pages share exact same header behavior and styling
-   **Flexibility:** `children` prop allows page-specific content (PeriodSelector) while keeping header logic centralized

**Impact:**

-   ✅ Dashboard now uses shared Header component (reduced from 310 to ~25 lines)
-   ✅ PeriodSelector appears correctly in both desktop and mobile layouts
-   ✅ All pages (Dashboard, Debts, RecurringExpenses) share same header implementation
-   ✅ Future header changes only need editing Header.jsx
-   ⚠️ If PeriodSelector behavior changes, only Dashboard is affected (good isolation)

**Files Changed:**

-   [frontend/src/components/Header.jsx](frontend/src/components/Header.jsx): Line 308-310 (mobile children slot)
-   [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx): Removed lines 753-1063, added Header import, removed 3 state variables

---

### Fixed Export/Import Bugs for Comprehensive Data Portability (Issue #90)

**Context:** Export/import functionality was designed to transfer all user data between environments, but had two critical bugs preventing full data portability.

**Problems:**

1. **Export Bug:** Only exported `is_active=True` salary periods

    - If user had 2 periods (Nov 20-Dec 19 inactive, Dec 20-Jan 19 active), only current period exported
    - Historical periods lost during migration
    - Made testing with production data incomplete

2. **Import Bug:** No overlap detection for salary periods

    - Used exact match check: `start_date == start_date AND end_date == end_date`
    - Importing overlapping periods (Nov 15-Dec 14 vs Nov 20-Dec 19) created both → invalid state
    - Multiple periods covering same dates broke budget calculations

3. **Missing Version Field:** No compatibility checking
    - Future format changes would break old exports
    - No way to warn users about incomplete imports

**Solutions:**

1. **Export All Periods:**

```python
# Before
salary_periods = SalaryPeriod.query.filter_by(
    user_id=current_user_id, is_active=True  # Only active!
).all()

# After
salary_periods = SalaryPeriod.query.filter_by(
    user_id=current_user_id
).order_by(SalaryPeriod.start_date).all()  # All periods, chronological
```

2. **Overlap Detection:**

```python
# Before: exact match only
existing = SalaryPeriod.query.filter_by(
    start_date=start_date, end_date=end_date
).first()

# After: detect ANY overlap
overlapping = SalaryPeriod.query.filter(
    and_(
        SalaryPeriod.start_date <= import_end_date,
        SalaryPeriod.end_date >= import_start_date
    )
).first()

if overlapping:
    skipped_counts["salary_periods"] += 1
    continue  # Reject overlapping period
```

3. **Version Field:**

```python
export_data = {
    "version": "2.0",
    "exported_at": datetime.now().isoformat(),
    "data": {...}
}
```

**Rationale:**

-   **Export all periods:** Historical data is valuable for analysis and debugging. Inactive periods represent completed budget cycles with full expense/income history.
-   **Reject overlaps:** Allowing overlapping salary periods would break:
    -   Carryover calculations (which week owns the overlap?)
    -   Balance displays (double-counting expenses?)
    -   Period navigation (which period is "active"?)
-   **Future enhancement:** "Smart merge" - import only non-overlapping portion (e.g., Nov 15-19 if user has Nov 20-Dec 19)

**Impact:**

-   ✅ Complete data export (all salary periods, not just current)
-   ✅ Prevents invalid state from overlapping periods
-   ✅ Version field enables future compatibility checking
-   ✅ Clear skip messages when periods overlap
-   ⚠️ Users must manually resolve overlapping periods (delete existing or adjust dates)

**Files Changed:**

-   [backend/routes/export_import.py](backend/routes/export_import.py): Lines 151-158 (version), Lines 195-202 (export all), Lines 566-586 (overlap detection)

---

### Redesigned Experimental Features UX - Inline Toggle (Issue #95)

**Context:** After implementing collapsible submenu system, user tested it and found the experimental features flow too complex: click submenu → expand → click Delete All Data → modal with feature flag toggle → enable flag → finally see delete button.

**Problem:**

-   Too many steps to access experimental features (5 clicks/actions)
-   Feature flag hidden in modal, not discoverable
-   No visual indication of experimental mode status
-   Delete All Data button requires enabling flag first (confusing)

**Solution:**

Replaced submenu with inline toggle switch directly in user menu:

**Desktop** ([frontend/src/components/Header.jsx](frontend/src/components/Header.jsx)):

```jsx
{
    /* Experimental Features Toggle */
}
{
    onShowExperimental && (
        <>
            <div className="px-4 py-2 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>⚗️</span>
                        <span className="text-sm font-medium">
                            Experimental Features
                        </span>
                    </div>
                    <button
                        onClick={() =>
                            toggleFlag("experimentalFeaturesEnabled")
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            flags.experimentalFeaturesEnabled
                                ? "bg-bloom-pink dark:bg-dark-pink"
                                : "bg-gray-200 dark:bg-gray-700"
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                flags.experimentalFeaturesEnabled
                                    ? "translate-x-6"
                                    : "translate-x-1"
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Delete All Data - Only visible when experimental enabled */}
            {flags.experimentalFeaturesEnabled && (
                <button
                    onClick={onShowExperimental}
                    className="w-full text-left px-4 py-2 text-sm text-red-600"
                >
                    <div className="flex items-center gap-2">
                        <span>🗑️</span>
                        Delete All Data
                    </div>
                </button>
            )}
        </>
    );
}
```

**Mobile** ([frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)):

-   Same pattern with touch-friendly py-3 spacing

**Flow:**

1. Click user menu
2. Toggle experimental features ON (inline switch)
3. Delete All Data button appears immediately below
4. Click to open confirmation modal

**Impact:**

-   ✅ Reduced from 5 steps to 3 steps
-   ✅ Clear visual indication of experimental mode (pink toggle when ON)
-   ✅ More discoverable - toggle is always visible
-   ✅ Simpler mental model - toggle controls feature visibility
-   ⚠️ Further improvements planned (user mentioned)

**Related Issues:**

-   #95 - User Menu Redesign (IN PROGRESS)
-   #97 - Consolidate Dashboard header to use shared Header component (CREATED)

---

### Implemented Collapsible Submenu System in User Menu (Issue #95)

**Context:** User menu had flat structure with Import/Export and Experimental Features as top-level items. As features grow, this would clutter the menu. Needed scalable grouping system.

**Problem:**

-   Flat menu structure doesn't scale well
-   Import/Export actions were separate
-   No visual hierarchy for related features
-   Future features would make menu unwieldy

**Solution:**

1. **Created `SubmenuButton` component** with:
    - Collapsible/expandable functionality
    - Animated chevron (rotates 180° on expand)
    - Pink left border accent for expanded submenus
    - Smooth 150ms transitions
    - Only one submenu open at a time
2. **Grouped Import/Export submenu**:
    - Export Financial Data
    - Import Financial Data
    - Import Bank Transactions
3. **Experimental menu approach evolved** (see "Redesigned Experimental Features UX" above):
    - Initially implemented as submenu
    - Later redesigned to inline toggle for better UX
4. **Implemented in two places** (technical debt):
    - Desktop: [frontend/src/components/Header.jsx](frontend/src/components/Header.jsx)
    - Mobile: [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)
5. **Added Experimental menu to all pages**:
    - [frontend/src/pages/Debts.jsx](frontend/src/pages/Debts.jsx) - Added experimental modal
    - [frontend/src/pages/RecurringExpenses.jsx](frontend/src/pages/RecurringExpenses.jsx) - Added experimental modal
    - Now accessible from every page's user menu

**Impact:**

-   ✅ Scalable menu structure for future features
-   ✅ Clear visual grouping of related actions
-   ✅ Consistent design on desktop and mobile
-   ✅ Professional appearance with smooth animations
-   ✅ Experimental features accessible from all pages
-   ⚠️ Created Issue #97 to consolidate duplicate mobile menu code

**Related Issues:**

-   #95 - User Menu Redesign (IN PROGRESS)
-   #97 - Consolidate Dashboard header to use shared Header component (CREATED)

---

### Removed Remaining Frontend Balance Calculations (Issue #96)

**Context:** After implementing `/income/stats` endpoint, one component still had manual balance calculations: `SalaryPeriodRolloverPrompt.jsx` was fetching all transactions and manually calculating period balances.

**Problem:**

-   `SalaryPeriodRolloverPrompt.jsx` used `getAll()` to fetch active period, then fetched ALL expenses/income
-   Manually looped through ~100 lines of code calculating `periodDebitSpent`, `periodCreditSpent`, `periodIncome`
-   Computed `currentDebitBalance` and `currentCreditAvailable` from scratch
-   Duplicated backend logic, maintenance burden, potential inconsistency

**Solution:**

1. **Changed to use `getCurrent()` endpoint**: Gets salary period with backend-calculated balances
2. **Removed manual calculations**: Deleted ~80 lines of forEach loops and balance math
3. **Use backend values directly**:
    - `display_debit_balance` → suggestedDebitBalance
    - `display_credit_balance` → suggestedCreditBalance
4. **Removed unused imports**: `expenseAPI`, `incomeAPI` no longer needed

**Impact:**

-   ✅ All frontend components now use backend-calculated balances
-   ✅ Single source of truth for all financial calculations
-   ✅ Rollover prompt shows accurate real-time balances
-   ✅ Simpler, more maintainable code

---

### Fixed Card Balances Not Updating After Transactions

**Context:** After adding/editing/deleting expenses or income, users had to manually refresh the page to see updated card balances.

**Problem:**

-   Transaction handlers (`handleAddExpense`, `handleEditExpense`, etc.) called `loadExpenses()` or `loadIncome()`
-   These functions only refreshed the transaction list, not the salary period data
-   Card balances (`display_debit_balance`, `display_credit_balance`) come from salary period data
-   Result: stale balance display until page refresh

**Solution:**

Added `loadPeriodsAndCurrentWeek()` call to all transaction handlers:

-   `handleAddExpense` - Reloads period data after creating expense
-   `handleEditExpense` - Reloads period data after updating expense
-   `handleDeleteExpense` - Reloads period data after deleting expense
-   `handleAddIncome` - Reloads period data + income stats after creating income
-   `handleEditIncome` - Reloads period data + income stats after updating income
-   `handleDeleteIncome` - Reloads period data + income stats after deleting income

**Impact:**

-   ✅ Card balances update immediately after any transaction change
-   ✅ No page refresh required
-   ✅ Better UX, real-time feedback
-   ✅ Weekly budget card also refreshes (already had `weeklyBudgetCardRef.current?.refresh()`)

---

### Fixed Initial Balance Duplication Bug

**Context:** System was creating a new "Initial Balance" income entry every time a salary period was created, leading to multiple Initial Balance entries per user. Database had 2 entries (€3072.00 and €2893.74) instead of just 1.

**Problem:**

-   `POST /salary-periods` created Initial Balance for EVERY salary period
-   `PUT /salary-periods/:id` updated Initial Balance date on edit, making it look like a new entry
-   Initial Balance should represent user's starting money ONCE, not be recreated every period

**Root Cause:**

-   [backend/routes/salary_periods.py](backend/routes/salary_periods.py) line 542: Always created Initial Balance if `debit_balance > 0`
-   Line 848: Updated Initial Balance date to new period's start_date, causing it to move in time
-   No check for existing Initial Balance before creation

**Solution:**

1. **CREATE endpoint**: Check if Initial Balance exists before creating

    ```python
    existing_initial_balance = Income.query.filter_by(
        user_id=current_user_id, type="Initial Balance"
    ).first()
    if not existing_initial_balance and debit_balance > 0:
        # Only create if none exists
    ```

2. **UPDATE endpoint**: Never change Initial Balance date, only update amount

    ```python
    if initial_income:
        initial_income.amount = debit_balance  # Update amount only
        # Keep original actual_date and scheduled_date
    ```

3. **Database cleanup**: Deleted duplicate Initial Balance (kept earliest one: €3072.00)

**Rationale:**

-   Initial Balance = user's actual starting money when they first used the app
-   It's a historical record, not a period snapshot
-   Date should never change (represents when user started)
-   Amount can be updated if user realizes they entered wrong starting balance

**Impact:**

-   ✅ Only 1 Initial Balance per user (verified in database)
-   ✅ All-time income now correctly includes just the first Initial Balance
-   ✅ Future salary periods won't create duplicates
-   ✅ Initial Balance date stays constant (historical record)

---

### Fixed All-Time Income Display - Removed Manual Frontend Balance Calculations

**Context:** Frontend was showing "All-time income: €0" despite having €3118.95 in real income (€303.50 + €2815.45). Backend balance calculations were correct, but frontend was duplicating logic.

**Problem:**

-   Frontend had `calculateCumulativeBalances()` function that manually fetched all transactions and calculated balances
-   This duplicated backend logic from `balance_service.py`
-   The manual calculation was complex (~100 lines) and showed €0 for all-time income
-   Maintenance burden: two calculation codebases to keep in sync

**Solution:**

1. **Added `/income/stats` endpoint** ([backend/routes/income.py](backend/routes/income.py)):

    - Returns `total_income` = first Initial Balance + all other income (Salary + Other)
    - Returns `period_income` (current salary period, excluding all Initial Balance)
    - First Initial Balance represents actual starting money when user began using app
    - Subsequent Initial Balance entries are period snapshots (excluded from total)
    - Both in cents, calculated server-side

2. **Replaced `calculateCumulativeBalances()`** with simple `loadIncomeStats()` ([frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)):

    ```jsx
    const loadIncomeStats = async () => {
        const response = await incomeAPI.getStats();
        setTotalIncome(response.data.total_income / 100);
        setCurrentPeriodIncome(response.data.period_income / 100);
    };
    ```

3. **Added useEffect** to load stats when period changes

**Impact:**

-   ✅ All-time income now shows correct value (€3118.95)
-   ✅ Period income shows correct value
-   ✅ Single source of truth (backend calculations)
-   ✅ Simpler, more maintainable code
-   ✅ Frontend trusts backend values

**Related:** Issue #96

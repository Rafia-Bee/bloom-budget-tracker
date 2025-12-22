# Decision Log

Architectural decisions only. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

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

---

## 2025-12-21

### Fixed Debit Card Balance to Be Period-Independent (COMPLETED)

**Context:** Debit card balance was resetting each budget period. Credit card was already fixed to be period-agnostic, but debit still used period boundaries.

**Problem:**

-   Debit calculation filtered by period dates (`income/expenses >= start_date`)
-   Balance reset to 0 at the start of each new salary period
-   "Initial Balance" income entries were being counted as real income, inflating totals
-   Multiple "Initial Balance" entries exist (one per period) but only the first represents actual starting money

**Root Cause:** `_calculate_debit_balance()` summed all income within period, including period snapshot markers.

**Solution:**

Rewrote debit calculation to match credit card logic:

```python
def _calculate_debit_balance():
    """
    Calculate real-time debit balance (period-agnostic).

    1. Find earliest "Initial Balance" income entry = starting money
    2. Exclude ALL "Initial Balance" entries from income sum (period snapshots)
    3. Sum all other income since that date
    4. Subtract all debit expenses since that date
    5. Balance = Starting + Income - Expenses
    """
    earliest_initial = query(Income).filter(type=="Initial Balance").order_by(date).first()
    starting_balance = earliest_initial.amount

    # Sum income EXCLUDING all Initial Balance entries
    total_income = sum(amount WHERE type!="Initial Balance", date>=earliest_initial.date)
    total_expenses = sum(amount WHERE payment_method=="Debit card", date>=earliest_initial.date)

    return starting_balance + total_income - total_expenses
```

**Status:** PARTIALLY WORKING

-   ✅ Available balance now shows correctly (€416.16)
-   ❌ Frontend still shows "All-time income: €0.00" (should show €3118.95)

**Remaining Issue:**
Frontend `calculateCumulativeBalances()` still calculates totals manually from transactions. Should use backend's calculated values instead. Frontend needs refactoring to trust backend balance calculations.

**Impact:**

-   Both debit and credit now period-agnostic (real-time account balances)
-   "Initial Balance" entries treated as snapshots, not income
-   Balances persist across period transitions

---

### Fixed Credit Card Balance Calculation to Be Period-Independent

**Context:** Credit card was showing incorrect available/debt amounts. User's actual balance was €1254.72 available, but Dashboard showed €491.79. Debts page showed negative progress percentages.

**Problem:**

-   Balance calculation was filtering by salary period dates (`date >= start_date`)
-   Periods are just cosmetic budget divisions, not transaction boundaries
-   User had imported historical data from production, creating transactions before current period
-   Dec 19 debt payment (€800) was excluded because period started Dec 20
-   Calculation didn't account for "Pre-existing Credit Card Debt" markers

**Root Cause:** `_calculate_credit_balance()` used period dates as filters, making balance depend on which period was active.

**Solution:**

Rewrote balance calculation to be **period-agnostic**:

```python
def _calculate_credit_balance():
    """
    Calculate real-time credit available (periods are cosmetic only).

    1. Find earliest "Pre-existing Debt" marker (category=Debt, subcategory=Credit Card)
    2. Starting available = Credit Limit - that debt
    3. Available = Starting + All Payments Since - All Expenses Since (excluding Debt markers)
    """
    # Find earliest debt snapshot
    earliest_marker = query(Expense).filter(
        category=="Debt", subcategory=="Credit Card"
    ).order_by(date).first()

    starting_available = credit_limit - earliest_marker.amount

    # Sum ALL transactions since that date
    expenses = sum(payment_method=="Credit card", category!="Debt", date>=earliest_marker.date)
    payments = sum(category=="Debt Payments", subcategory=="Credit Card", date>=earliest_marker.date)

    return starting_available + payments - expenses
```

**Result:**

-   Correct real-time balance: €1254.72 available, €245.28 debt (16.4% used)
-   Debt payments on period boundaries now count properly
-   Balance survives period transitions without resetting

**Impact:**

-   Fixes: Credit card display, Debts page auto-calculation, progress tracking
-   Clarifies: Periods are for budgeting only, not transaction accounting
-   **Important:** "Pre-existing Debt" entries (category=Debt) are now treated as balance snapshots, excluded from expense totals

---

### Fixed Test Suite Database Isolation Issue

**Context:** Development database kept getting wiped repeatedly when VSCode auto-test-discovery was enabled.

**Problem:**

-   VSCode Python extension with "auto test discovery on save" enabled
-   Test discovery imports `conftest.py` to find fixtures
-   `conftest.py` sets `DATABASE_URL=sqlite:///:memory:` inside fixture, but test discovery happens BEFORE fixture runs
-   Test discovery connected to real `instance/bloom.db` and called `db.drop_all()` during cleanup
-   Database wiped every time a file was saved

**Root Cause:** Environment variable set too late (inside fixture) instead of at module import time

**Solution:**

```python
# SAFETY: Force DATABASE_URL to in-memory DB IMMEDIATELY when conftest is imported
# This prevents test discovery from accidentally using the real database
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
```

**Impact:**

-   ✅ Tests ALWAYS use in-memory database, even during discovery phase
-   ✅ Development database never touched by test suite
-   ✅ Safe to use VSCode auto-test-discovery
-   Future-proof against similar issues

**Files Changed:**

-   `backend/tests/conftest.py`: Lines 32-35 (added module-level environment variable)

---

### Fixed Production Balance and Debt Calculation Issues

**Context:** Four critical bugs reported in production affecting balance calculations and debt tracking.

**Problems:**

1. **Credit Card Debt Display:** Debt page showing incorrect progress (€501.78 / €1500) instead of actual debt paid off
2. **Future Payments Showing:** Payment history displaying scheduled future transactions that haven't occurred yet
3. **Debt Progress Not Updating:** Recurring debt payments visible in transactions but not updating debt balance
4. **Today's Expenses Missing:** Expenses added today (Dec 21) not appearing in dashboard balance calculations

**Root Causes:**

1. **Debt Calculation Inconsistency:** Debts.jsx was recalculating credit card balance from scratch starting with `initial_credit_balance`, missing transactions that occurred before salary period. Dashboard.jsx used backend's `display_credit_balance` (correct real-time value).
2. **No Future Filter:** `loadDebtTransactions` didn't filter out payments with dates > today
3. **Same as #1:** Backend correctly calculated all debt payments, but frontend Debts page wasn't using that value
4. **Date Comparison Precision:** Using `new Date()` with timestamp compared against midnight dates caused off-by-one issues

**Solution:**

```javascript
// Debts.jsx - Use backend's authoritative balance
const currentBalance = salaryPeriod.display_credit_balance; // Already in cents

// Filter future payments
const today = new Date();
today.setHours(23, 59, 59, 999); // End of today
const realizedPayments = allPayments.filter((payment) => {
    const paymentDate = new Date(payment.date_iso || payment.date);
    return paymentDate <= today;
});

// Dashboard.jsx - Normalize date for comparisons
const today = new Date();
today.setHours(23, 59, 59, 999); // End of today for accurate comparisons
```

**Impact:**

-   ✅ Credit card debt now shows correct paid amount / limit
-   ✅ Payment history only shows realized payments
-   ✅ Debt progress updates immediately when payments made
-   ✅ Today's expenses appear in balances instantly
-   Single source of truth: backend calculates balances, frontend displays them

**Files Changed:**

-   `frontend/src/pages/Debts.jsx`: Lines 100-150 (use backend balance), Lines 205-225 (filter future payments)
-   `frontend/src/pages/Dashboard.jsx`: Lines 406-410 (normalize date comparison)

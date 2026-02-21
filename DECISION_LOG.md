# Decision Log

Session continuity for AI context + architectural decisions. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-02-21: Global Balances Include Future Transactions Bug

**Session Summary:**

1. Fixed production bug: debit balance showed €2,466.38 instead of correct ~€1,302.67
2. Root cause: `get_global_balances` endpoint (used when no current period) had **no date filtering** — it summed ALL income and expenses including future recurring transactions (March salary +€2,817.46, March bills -€1,652.95 = net +€1,164.51 inflation)
3. Added `<= today` date filters to all 6 queries in the endpoint (income, debit expenses, credit expenses, credit payments, all-time spent, total income)

**Branch:** `fix/february-2026-fixes`

**Changes:**

- `backend/routes/user_data.py`:
    - Added `from datetime import date` import
    - `get_global_balances()`: All 6 queries now filter `<= date.today()` to exclude future scheduled/recurring transactions
    - Income queries use `func.coalesce(Income.actual_date, Income.scheduled_date) <= today`
    - Expense queries use `Expense.date <= today`

**What's Next:** Merge PR #193, deploy to production

**Files to Note:** `backend/routes/user_data.py` — global-balances endpoint (lines ~490-620)

---

## 2026-02-18: February 2026 Fixes (PR #193)

**Session Summary:**

1. Changed GitHub Actions backup and cleanup jobs from daily to weekly (Sundays 2 AM UTC)
2. Implemented Issue #167 — balance calculations now exclude future/scheduled transactions for the current period

**Branch:** `fix/february-2026-fixes`

**Changes:**

- `.github/workflows/backup.yml`: Daily → weekly cron schedule
- `.github/workflows/cleanup.yml`: Daily → weekly cron schedule
- `backend/services/balance_service.py`:
    - Added `_get_effective_end_date()` helper: caps date filters at today for current period
    - Applied to all 6 query locations (budget/sync modes, debit/credit, past/cumulative)
- `backend/tests/test_balance_service.py`:
    - 5 unit tests for `_get_effective_end_date()`
    - 4 integration tests for future transaction exclusion

**What's Next:** Merged into global-balances fix above

**Files to Note:** `backend/services/balance_service.py` — core balance logic

---

## 2026-01-26: Issue #187 - Mobile UI Fixes (Complete)

**Session Summary:** Comprehensive mobile UI fixes for Issue #187 covering all pages: Dashboard, Wizard, Modals, Menu, Goals, Reports, Recurring, Debts, Settings, and Trash.

**Branch:** `fix/issue-187-mobile-ui` (22 commits)

### Issues Fixed:

| Issue | Page      | Fix                                                             |
| ----- | --------- | --------------------------------------------------------------- |
| 1     | Dashboard | Budget card header responsive layout                            |
| 2     | Dashboard | Debit card total spent alignment                                |
| 3     | Dashboard | Scheduled amounts no-wrap                                       |
| 4     | Wizard    | Step 2 input sizes consistent                                   |
| 5     | Wizard    | Step 3 text responsive                                          |
| 6     | Dashboard | Leftover modal min alignment grid                               |
| 7     | Dashboard | Goals progress bug fix (object access)                          |
| 8     | Wizard    | Slider step=100 (€1 increments) + editable input                |
| 9     | Modals    | Amount input width fix                                          |
| 10    | Modals    | Filter button text centering                                    |
| 11    | Dashboard | FAB hidden when hamburger menu open                             |
| 12    | Menu      | Logout button bottom padding                                    |
| 13    | Goals     | Header stacked layout, edit/delete buttons match Dashboard      |
| 14-16 | Reports   | Date selectors stacked, pie chart smaller, merchants responsive |
| 17-20 | Recurring | Tabs below content, uniform width 110px, "Incomes" renamed      |
| 23-24 | Debts     | Progress/Paid off alignment, trailing ")" bug fix               |
| 25-28 | Settings  | 2x2 grid tabs, dropdowns stacked, SVG icons, borders on buttons |
| 29    | Settings  | Dropdowns stacked layout (label, dropdown, save)                |
| 31-32 | Trash     | Dropdown menu on mobile, responsive cards                       |

### Additional Improvements:

- Credit allowance editable input box
- Settings subcategory tabs uniform height with borders
- All grids use proper 2x2 layout on mobile

### Technical Patterns:

- **2x2 Grid:** `grid grid-cols-2 sm:flex` for tab groups
- **Stacked Layouts:** `flex-col gap-3` for dropdowns
- **Uniform Buttons:** `min-h-[48px] flex items-center justify-center`
- **Mobile Dropdown:** Native select for complex tab navigation (Trash)
- **SVG Icons:** Consistent icon buttons replacing emojis

### Remaining Issues (deferred for future work):

- **Issue 21:** Recurring Income cards (complex refactor)
- **Issue 22:** Scroll shortcuts (new feature)
- **Issue 30:** App-wide emoji removal (extensive)

---

## 2026-01-26: Issue #180 - Bug #5 Frontend Fix (Recurring Income Export/Import)

**Session Summary:**
Added "Recurring Income" checkbox to Export Data modal. Backend was already fixed in previous session but frontend was missing the UI option.

**Branch:** `fix/issue-180-frontend-export-import`

**Changes:**

- `frontend/src/components/ExportImportModal.jsx`:
    - Added `recurring_income: true` to exportTypes state
    - Added to typeAbbreviations for filename generation
    - Added to import/skipped message handlers
    - Added UI checkbox after "Recurring Expenses"
- `frontend/src/test/ExportImportModal.test.jsx`:
    - Added test expectation for "Recurring Income" checkbox
    - Updated API call assertion to include `recurring_income`

**Status:** All 20 ExportImportModal tests pass

---

## 2026-01-26: Issue #180 - Credit Limit Preservation Fix + Bug #9 Implemented

**Session Summary:**

1. Implemented "Balance Difference Detected" modal for current periods in sync mode (Bug #9)
2. Fixed credit limit resetting to €1500 instead of preserving user's value

**Branch:** `fix/issue-180-remaining-bugs`

### Bug #9 Implementation (Balance Difference Prompt)

When user creates a current period (start date ≤ today, ≥ anchor date) in sync mode, and the entered balance differs from tracked balance, a prompt now shows:

- **Entered > Tracked**: Offers to create "Balance Reconciliation" income
- **Entered < Tracked**: Warning that dashboard will show tracked balance

**Edge Cases Handled:** edit, rollover, past period, future period, first period, no difference

### Credit Limit Fix (Bug #10)

**Problem:** User sets credit limit to 0, but when creating new period, credit limit resets to €1500.

**Root Cause:** Hardcoded default `creditLimit = '1500'` in SalaryPeriodWizard.jsx

**Fix:**

1. Changed default from `'1500'` to `''` (empty string)
2. Always set `creditLimit` from `getGlobalBalances()` API response, even if 0
3. Updated test mock to return proper `credit_limit` field from API
4. Updated test to expect `'1500.00'` (formatted value from API)

**Files Changed:**

- `frontend/src/components/SalaryPeriodWizard.jsx` - Both implementations
- `frontend/src/test/setup.js` - Fixed API mock for getGlobalBalances
- `frontend/src/test/SalaryPeriodWizard.test.jsx` - Updated test expectation

**Status:** Both committed. All 1025 frontend tests pass.

---

## 2026-01-23: Issue #180 - Bug #9 Enhancement Planned

**Session Summary:** Investigated sync mode balance calculation, found it's by design. Identified UX enhancement needed.

**Branch:** `fix/issue-180-remaining-bugs` (Bug #8 committed by user)

**Bug #9 Investigation Result:**

- **Initial Report**: User creates two periods (€1,000 + €1,100), expected €2,100 balance, got €1,000
- **Finding**: This is **by design** in sync mode
- **Sync mode concept**: Anchor balance (from first period) + income - expenses = cumulative balance
- **Period's `initial_debit_balance`** is informational - doesn't add to cumulative balance

**UX Gap Identified:**

- ✅ **Future periods**: Have "Future Budget Period Detected" modal asking to create income
- ❌ **Current periods (starting in past)**: No equivalent prompt

**Enhancement Needed:** "Balance Difference Detected" modal for current periods

**Implementation Plan:** (Full details in GitHub Issue #180 comment)

1. Store tracked balances from `getGlobalBalances()` for comparison
2. Add `hasBalanceDifference()` check for current/past periods
3. Add modal: if entered > tracked → offer income creation; if entered < tracked → just warn
4. Apply same logic for edit flow
5. Handle both debit AND credit balances

**Edge Cases Covered:**

- First period (no anchor) → Skip
- PAST period (before anchor) → Skip (different flow)
- Future period → Skip (existing flow)
- Rollover → Skip (pre-filled values match)
- Editing period → Same logic applies

**Reference:** See GitHub Issue #180 comment for full implementation details

**Files to Modify (when implementing):**

- `frontend/src/components/SalaryPeriodWizard.jsx` - Main implementation
- Backend (if needed) - Accept income amount in create payload

**What's Next:** Implement Balance Difference prompt in future session

---

## 2026-01-23: Issue #180 Remaining Bug Fixes (Part 2)

**Session Summary:** Fixed stale pre-filled balance bug in salary period wizard.

**Branch:** `fix/issue-180-remaining-bugs` (continued)

**Bug Fixed:**

1. **Bug #8: Stale Pre-filled Balance in Wizard**
    - **Problem**: When user edits a transaction date and then opens the wizard to create a new period, the pre-filled balance shows the OLD value instead of the updated balance
    - **Scenario**: User has past periods but NO current period. Dashboard shows updated balance, but wizard shows stale data.
    - **Root Cause**: Browser HTTP caching the GET `/settings/global-balances` response
    - **Fix**:
        - Backend: Added `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0` headers to global-balances endpoint
        - Frontend: Added timestamp cache-buster param `?_t=Date.now()` to API call
    - **Test**: Added `test_global_balances_has_cache_control_headers` to verification suite

**Files Changed:**

- `backend/routes/user_data.py` - Cache-control headers on global-balances response (lines ~473, ~605)
- `frontend/src/api.js` - Timestamp cache-buster on getGlobalBalances call
- `backend/tests/test_issue_180_verification.py` - Added cache header test (8 tests total)

**Status:** Committed by user

---

## 2026-01-23: Issue #180 Remaining Bug Fixes

**Session Summary:** Fixed remaining bugs from Issue #180 that weren't addressed by PR #182.

**Branch:** `fix/issue-180-remaining-bugs`

**Bugs Fixed:**

1. **Bug #3: Null anchor_date TypeError** - `balance_service.py`
    - **Problem**: `TypeError: '<' not supported between 'datetime.date' and 'NoneType'` when `user.balance_start_date` is None
    - **Root Cause**: Code set `anchor_date = user.balance_start_date` which could be None, then compared against it
    - **Fix**: Added fallback `anchor_date = user.balance_start_date or salary_period.start_date` for both debit and credit calculations
    - Also wrapped `past_period_balances` query in `if anchor_date is not None` guard

2. **Bug #5: RecurringIncome Missing from Export/Import** - `export_import.py`
    - **Problem**: Recurring income templates not included in data export/import
    - **Fix**: Added `RecurringIncome` to imports, export handler (after recurring_expenses), import handler with duplicate detection, and skipped counts display

3. **Bug #6: Delete-All Missing RecurringIncome** - `user_data.py`
    - **Problem**: "Delete All Data" endpoint didn't clear recurring income
    - **Fix**: Added `RecurringIncome` to imports, count, total_records sum, and delete statement

**Test Verification:** Created `backend/tests/test_issue_180_verification.py` with 7 tests confirming all bugs are fixed

**Files Changed:**

- `backend/services/balance_service.py` - Null anchor_date handling (lines ~153, ~170, ~225, ~361)
- `backend/routes/export_import.py` - RecurringIncome export/import support
- `backend/routes/user_data.py` - RecurringIncome deletion in delete-all
- `backend/tests/test_issue_180_verification.py` - Verification test suite

**Status:** Committed

---

## 2026-01-20: Production Issues - No Period Mode & Wizard Fixes

**Session Summary:** Fixed multiple production issues for scenario where user's last period ended and needs to create a new one.

**Commits on branch `fix/production-issues-jan-2026`:**

1. Show transactions when no current period
2. Fix recurring badge for income
3. Exclude soft-deleted recurring income from wizard
4. Pre-fill balances in wizard
5. Pre-existing expenses warning
6. Fix budget calculation (expected_income)
7. Fix soft-delete filter in budget spent calculation

**Key Fixes:**

- Budget creation: Added `expected_income` handling
- Budget spent: Added `deleted_at.is_(None)` to 11 queries

**Status:** Merged

---

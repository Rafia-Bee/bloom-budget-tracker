# Decision Log

Session continuity for AI context + architectural decisions. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-26: Issue #187 - Mobile UI Fixes (Dashboard + Wizard + Modals + Menu)

**Session Summary:** Fixed Dashboard, Wizard, Add Modals, Filter Modal, and Hamburger Menu mobile UI issues from Issue #187.

**Branch:** `fix/issue-187-mobile-ui`

### Dashboard Issues Fixed:

1. **Issue #1: Budget Card Header Cluttered** - Redesigned header with unified responsive layout using Tailwind sm: breakpoints. Cleaner spacing, compact date format, smaller controls on mobile while maintaining good desktop experience.

2. **Issue #2: Debit Card Total Spent Alignment** - Changed from `flex justify-between` to separate rows so "Total spent" is now right-aligned, matching Credit Card styling.

3. **Issue #3: Scheduled Amounts Line Break** - Added `whitespace-nowrap` and responsive text size (`text-base sm:text-lg`) to prevent minus sign wrapping to separate line.

4. **Issue #6: Leftover Modal Min Alignment** - Changed from `flex justify-between` to `grid grid-cols-[1fr_auto]` layout so "Min:" column aligns consistently regardless of debt name length.

5. **Issue #7: Goals Show Wrong Progress (BUG)** - Fixed bug where `goal.progress` was treated as a number but is actually an object with `current_amount`, `percentage`, etc. Now correctly accesses `goal.progress?.current_amount` and `goal.progress?.percentage`.

6. **Issue #11: FAB Visible When Hamburger Open** - Added `mobileMenuToggle` custom event from Header.jsx, Dashboard.jsx listens and sets `isMobileMenuOpen` state, FAB is hidden when hamburger menu is open.

### Wizard Issues Fixed:

7. **Issue #4: Step 2 Input Sizes Vary** - Fixed bill amount inputs to consistent width (`w-24 sm:w-28`) with `flex-shrink-0`. Added responsive text sizes and `truncate` for long bill names.

8. **Issue #5: Step 3 Text Wrapping** - Made budget breakdown fully responsive: text labels (`text-sm sm:text-base`), amounts (`text-lg sm:text-xl` to `text-2xl sm:text-3xl`), padding (`p-4 sm:p-6`), and spacing (`space-y-2 sm:space-y-3`).

9. **Issue #8: Credit Slider Bug** - Changed slider `step` from 1000 (€10 increments) to 100 (€1 increments) for proper fine-grained credit allowance selection. Also made the middle value an editable input box.

### Modal Issues Fixed:

10. **Issue #9: Amount Box Too Wide** - Fixed AddExpenseModal and AddIncomeModal amount inputs. Added `w-full` to flex container, `min-w-0` to input, and responsive sizing (`w-20 sm:w-24` for CurrencySelector, `px-3 sm:px-4` for input).

11. **Issue #10: Expenses Button Text Misaligned** - Added `text-center`, responsive text sizes (`text-sm sm:text-base`), and responsive padding (`px-2 sm:px-4`) to FilterTransactionsModal transaction type buttons.

### Menu Issues Fixed:

12. **Issue #12: Logout Button Too Close to Navigation** - Added `pb-16` (64px) bottom padding to mobile menu content, ensuring Logout button sits higher above phone navigation buttons.

**Files Changed:**

- `frontend/src/components/WeeklyBudgetCard.jsx` - Cleaner responsive header
- `frontend/src/components/dashboard/BalanceCards.jsx` - Total spent alignment
- `frontend/src/components/dashboard/TransactionList.jsx` - Amount no-wrap
- `frontend/src/components/LeftoverBudgetModal.jsx` - Min alignment + goals bug fix
- `frontend/src/components/Header.jsx` - mobileMenuToggle event + menu bottom padding
- `frontend/src/pages/Dashboard.jsx` - Listen for menu toggle, hide FAB
- `frontend/src/components/SalaryPeriodWizard.jsx` - Step 2 inputs, Step 3 text, slider step fix + editable input
- `frontend/src/components/AddExpenseModal.jsx` - Amount row width fix
- `frontend/src/components/AddIncomeModal.jsx` - Amount row width fix
- `frontend/src/components/FilterTransactionsModal.jsx` - Button text centering

**What's Next:** Settings page (13-15), Reports (14-16), Recurring (17-22), Debts (23-24), Goals (13), Trash (31-32), App-wide emoji removal (30)

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

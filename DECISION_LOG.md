# Decision Log

Session continuity for AI context + architectural decisions. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

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

# Decision Log

Quick reference for decisions made during development. Newest entries at top.

---

## 2025-12-15

### Issue #70 - Recurring Expense Day of Month Bugs (COMPLETED)

**Context:** User reported recurring expenses not respecting the selected day of month for monthly recurrence, both during creation and editing.

**Problems Identified:**

1. **Creation Bug:** User selects day 15 in "Due Date" field, but recurring expense shows "Recurring on day 1 of each month"
2. **Editing Bug:** Changing day of month in edit modal doesn't update next_due_date
3. **Display Bug:** Generation log shows incomplete info ("$ on") for skipped expenses
4. **Display Bug:** Generation log shows wrong date (next due instead of generated date)

**Root Cause Analysis:**

**Bug 1 - Day of Month Not Set During Creation:**

-   Modal has two date fields: "Due Date (Day of Month)" and "Start Date"
-   "Due Date" field correctly updates both `dayOfMonth` state and `startDate`
-   "Start Date" field only updates `startDate`, not `dayOfMonth`
-   User interaction with "Start Date" overwrites without syncing `dayOfMonth`

**Bug 2 - Next Due Date Not Recalculated on Edit:**

-   Backend update endpoint updates `day_of_month` field
-   But doesn't recalculate `next_due_date` based on new value
-   Results in outdated `next_due_date` persisting

**Bug 3 & 4 - Generation Log Display Issues:**

-   Skipped expenses don't include `amount` or `date` in response object
-   Generated expenses log the UPDATED `next_due_date` instead of the date that was just generated

**Solution Implemented:**

1. **Frontend Fix (AddRecurringExpenseModal.jsx):**

    ```jsx
    onChange={(e) => {
      setStartDate(e.target.value)
      // For monthly frequency, also update day_of_month
      if (frequency === 'monthly') {
        const selectedDate = new Date(e.target.value)
        setDayOfMonth(selectedDate.getDate())
      }
    }}
    ```

2. **Backend Fix (recurring_expenses.py - update endpoint):**

    ```python
    # Recalculate next_due_date if frequency-related fields changed
    if any(key in data for key in ["day_of_month", "day_of_week", "frequency", "start_date"]):
        today = datetime.now().date()
        if re.frequency == "monthly" and re.day_of_month:
            day = re.day_of_month
            if today.day < day:
                re.next_due_date = datetime(today.year, today.month, day).date()
            else:
                # Calculate next month
                next_month = today.month + 1
                next_year = today.year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                re.next_due_date = datetime(next_year, next_month, day).date()
    ```

3. **Generator Display Fixes (recurring_generator.py):**
    - Store `generation_date` before updating `next_due_date`
    - Include `amount` and `date` in skipped expense log entries

**Files Changed:**

-   `frontend/src/components/AddRecurringExpenseModal.jsx`
-   `backend/routes/recurring_expenses.py`
-   `backend/utils/recurring_generator.py`

**Testing:**

-   ✅ Create monthly recurring with day 15 → shows "Recurring on day 15 of each month"
-   ✅ Edit existing recurring from day 1 to day 15 → next_due updates correctly
-   ✅ Generation log shows correct dates and amounts for all entries

**Impact:** Recurring expense scheduling now works correctly for monthly frequencies.

---

### Issue #66 - Mobile UI Issues: Viewport Zoom, Button Positioning & Click Detection (COMPLETED)

**Context:** Multiple mobile UX issues reported on OnePlus 13 Chrome browser

**Problems Identified:**

1. App required manual zoom out to view full content
2. Floating + button randomly repositioned during scroll
3. Menu didn't show on tap (inconsistent, required scrolling then tapping)
4. Desktop clicks required drag gesture instead of simple click

**Root Cause Analysis:**

**Issue 1 - Viewport Zoom:**

-   Default viewport meta tag allowed user scaling and zoom
-   Mobile browsers require explicit zoom prevention

**Issue 2 - Random Repositioning:**

-   Touch events triggered drag mode with any tiny movement (< 5px)
-   Scrolling page caused micro-movements that activated drag
-   No threshold to distinguish intentional drag from accidental touch

**Issue 3 - Inconsistent Menu Opening:**

-   `e.preventDefault()` on `touchstart` blocked click events
-   Touch duration not validated (long press vs quick tap)
-   Missing fallback click handler

**Issue 4 - Desktop Click Issues:**

-   `handleClick` checked `!isDragging`, but `mouseDown` set `isDragging=true` immediately
-   Click event fired after drag state was set, blocking menu toggle

**Solution Implemented:**

1. **Viewport Zoom Prevention:**

    ```html
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    ```

2. **Drag Threshold Implementation:**

    - Increased threshold from 5px to **10px** minimum movement
    - Added `hasMoved` state tracking
    - Only call `e.preventDefault()` **after** threshold is met
    - Removed `e.preventDefault()` from `touchstart` to allow normal clicks

3. **Touch Duration Validation:**

    - Added timestamp tracking in `handleTouchStart`
    - Only trigger menu if touch duration < 300ms (quick tap)
    - Long press (>300ms) ignored as potential drag start

4. **Improved Click Detection:**

    - Added `handleClick` fallback handler
    - Removed `!isDragging` check that was blocking clicks
    - Added `setTimeout(() => onToggleMenu(), 0)` to ensure state updates complete
    - Used `e.stopPropagation()` to prevent event bubbling

5. **Safe Zone Adjustment:**

    - Increased from 80px to 100px from screen edges
    - Prevents button from being cut off on devices with notches/curves
    - Changed default position from 32px to 100px bottom

6. **Z-Index Boost:**

    - Container: 100 → 9999
    - Menu popup: 101 → 10000
    - Ensures button always visible above other content

7. **Development Network Access:**
    - Updated `backend/app.py` to allow all CORS origins in development mode
    - Enables testing on actual mobile devices via local network
    - Created comprehensive mobile testing documentation

**Testing Workflow Created:**

**Local Network Mobile Testing:**

1. Find computer's IP address: `ipconfig | Select-String "IPv4"`
2. Create `.env.local` with backend IP: `VITE_API_URL=http://192.168.x.x:5000`
3. Start backend with network access: `python run.py --host=0.0.0.0`
4. Start frontend with network access: `npm run dev -- --host`
5. Access from phone on same WiFi: `http://192.168.x.x:3000`

**Files Changed:**

-   `frontend/index.html` - Viewport meta tag
-   `frontend/src/components/DraggableFloatingButton.jsx` - Complete touch/click rewrite
-   `backend/app.py` - CORS configuration for development
-   `docs/MOBILE_DEV.md` - New mobile testing guide
-   `docs/README.md` - Added mobile dev reference

**Impact:**

-   ✅ No accidental zoom on mobile
-   ✅ Button stays fixed during scroll
-   ✅ Menu opens reliably on first tap (mobile)
-   ✅ Menu opens on click (desktop)
-   ✅ Drag still works for repositioning (>10px movement)
-   ✅ Documented workflow for mobile testing

**Testing Confirmed:**

-   OnePlus 13 Chrome: All issues resolved ✅
-   Desktop browsers: Click detection works ✅
-   Touch gestures: Tap and drag both work correctly ✅

**Commits:**

-   `fix: mobile UI improvements - viewport zoom, button positioning, and click detection (#66)`

---

## 2025-12-15

### Issue #67 - Add Tests to CI/CD Pipeline (COMPLETED)

**Context:** Backend had 28 tests but they weren't running in CI/CD, risking regressions

**Problem Discovered:** Tests were sending real emails to SendGrid despite mock attempts

**Root Cause Analysis:**

-   `email_service` singleton created at module import with real API key
-   Mock patches applied after import, so real SendGrid client already initialized
-   Tests sent 20+ emails to SendGrid during development

**Solution Implemented:**

1. **Email Service Protection (3-layer approach):**

    ```python
    # Layer 1: Remove API key from environment before app creation
    @pytest.fixture(autouse=True)
    def disable_sendgrid():
        if "SENDGRID_API_KEY" in os.environ:
            del os.environ["SENDGRID_API_KEY"]

    # Layer 2: Patch email_service at all usage points
    with patch("backend.routes.auth.email_service") as mock_auth_email, \
         patch("backend.routes.password_reset.email_service") as mock_pwd_email, \
         patch("backend.services.email_service.email_service") as mock_service:

    # Layer 3: TestConfig explicitly sets SENDGRID_API_KEY = None
    ```

2. **Rate Limiter Fix:**

    - Added `RATELIMIT_ENABLED` config check in decorator
    - Clear rate limiter state between tests
    - Prevents 429 errors during test runs

3. **CI/CD Integration:**
    - Added backend tests to `.github/workflows/ci.yml`
    - Install from `backend/requirements.txt` (not root)
    - Set empty env vars: `SENDGRID_API_KEY=""`, `DATABASE_URL=""`
    - Removed `continue-on-error: true` - tests now block failing builds

**Test Coverage:**

-   28 tests (11 auth, 7 business logic, 10 CRUD)
-   All tests use in-memory SQLite (no Neon DB)
-   All emails mocked (zero SendGrid usage)
-   ~60% feature coverage (sufficient for core functionality)

**Files Changed:**

-   `backend/tests/conftest.py` - 3-layer email protection
-   `backend/utils/rate_limiter.py` - Added config check
-   `.github/workflows/ci.yml` - Added test job

**Impact:**

-   ✅ Zero service quota consumption during tests
-   ✅ Tests run on every push to main
-   ✅ GitHub Actions: ~5 min/run, ~150 min/month (7.5% of free quota)
-   ✅ Catches regressions before production
-   ✅ Safe to run unlimited times locally

**Commits:**

-   `feat: add comprehensive test suite to CI/CD pipeline (#67)`
-   `fix: use backend/requirements.txt for CI/CD dependencies`

---

## 2025-12-12

### Balance Calculation Bug Fix - Salary Period Rollover (COMPLETED) #55

**Context:** Production bug where rollover prompt showed incorrect balances for next salary period

-   **Expected:** Debit €358.48, Credit Available €596.67
-   **Actual:** Debit €1403.17, Credit Available €1191.16
-   **Root Cause:** Double-counting initial balance by calculating cumulative totals from ALL transactions

**Decision:** Changed from cumulative calculation to period-specific calculation

**Problem Analysis:**
The rollover prompt was calculating balances like this:

```javascript
// OLD LOGIC (WRONG)
cumulativeIncome = SUM(ALL income ever)  // Includes initial balance from previous period
cumulativeDebit = SUM(ALL debit expenses ever)
currentBalance = cumulativeIncome - cumulativeDebit  // Double counts initial balance!
```

This caused:

1. Initial balance of €1000 was added as "Initial Balance" income when creating period
2. Rollover calculation included that €1000 in cumulative income
3. But the initial balance was already the STARTING point, not new income
4. Result: Balance was €1000+ too high

**Solution:**
Start from initial balances and only count transactions WITHIN current period:

```javascript
// NEW LOGIC (CORRECT)
periodIncome = SUM(income within current period) - exclude "Initial Balance" type
periodDebitSpent = SUM(debit expenses within current period)
currentBalance = initial_debit_balance + periodIncome - periodDebitSpent
```

**File Changed:** `frontend/src/components/SalaryPeriodRolloverPrompt.jsx`

**Key Changes:**

-   Added `startDate` filter for all transaction queries
-   Excluded "Initial Balance" type income from period income calculation
-   Changed credit calculation to start from `initial_credit_balance` instead of `credit_limit`
-   Only processes transactions where `date >= startDate && date <= endDate`

**Rationale:**

-   ✅ Fixes double-counting bug
-   ✅ Aligns with salary period balance-based architecture
-   ✅ Each period is self-contained (initial → final balance)
-   ✅ Prevents cumulative drift across multiple periods

**Impact:**

-   **Accuracy:** Rollover balances now match actual account balances
-   **User Trust:** Fixed critical bug affecting budget planning
-   **Architecture:** Reinforces period-based isolation design

**Testing:**

-   Frontend build successful
-   Logic verified against expected values
-   Ready for production deployment

---

### Database Safety - Automatic Backup System (COMPLETED)

**Context:** User discovered empty database after running utility scripts, needed protection against accidental data loss

**Decision:** Implemented automatic backup system for all destructive operations

**Implementation:**

-   **Created:** `scripts/backup_helper.py` - Reusable backup and confirmation functions
-   **Protected Scripts:**
    -   `clear_user_data.py` - Auto-backup before deleting user data
    -   `clean_duplicate_income.py` - Auto-backup before deleting duplicates
    -   `drop_budget_period_id.py` - Auto-backup before table modifications

**Backup System Features:**

-   **Automatic Creation:** Timestamped backups (`bloom.backup_YYYYMMDD_HHMMSS.db`)
-   **Storage Location:** `instance/` directory (same as main database)
-   **Confirmation Prompts:** Clear warning + user confirmation before any destructive operation
-   **Failure Protection:** Scripts abort if backup fails (safety-first)
-   **Restore Instructions:** Displayed with every backup

**Rationale:**

-   ✅ Prevents accidental data loss from utility scripts
-   ✅ Zero-effort safety (automatic, no manual steps)
-   ✅ Timestamped backups allow multiple snapshots
-   ✅ Confirmation prompts ensure intentional operations
-   ❌ Skipped auto-cleanup of old backups (manual cleanup preferred for safety)

**Impact:**

-   **Safety:** Complete protection against utility script data loss
-   **Storage:** ~150KB per backup (minimal, manual cleanup as needed)
-   **UX:** Clear warnings and restore instructions for all destructive operations
-   **Coverage:** All 3 dangerous scripts now protected

**Audit Results:**

-   **7 dangerous operations** identified across codebase
-   **3 high-risk scripts** now protected with auto-backup
-   **Tests** confirmed safe (use in-memory DB)
-   **Archive scripts** low risk (one-time migrations)

**Documentation:**

-   Updated `scripts/README.md` with safety levels and backup info
-   Added ⚠️ warnings to all protected script docstrings

---

## Format

Each entry should include:

-   **Date:** When decision made
-   **Issue/Context:** What prompted it
-   **Decision:** What was decided
-   **Rationale:** Why this approach
-   **Impact:** What changed, files affected

---

## GitHub Issues Tracker

Track all GitHub issues with their current status. Update this section when creating new issues or completing existing ones.

### Active Issues

| Issue                                                              | Title                                                                          | Status  | Opened     | Labels                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------- | ---------- | ---------------------------------------------- |
| [#71](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/71) | Transaction cards overflow on mobile - redesign needed                         | 🟡 Open | 2025-12-15 | bug, frontend, ui-ux, mobile                   |
| [#69](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/69) | Check why transparent bg isn't actually transparent on loading cats            | 🟡 Open | 2025-12-15 | bug, frontend, ui-ux                           |
| [#68](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/68) | Fix transaction edit/delete buttons overflowing on mobile                      | 🟡 Open | 2025-12-15 | bug, frontend, ui-ux                           |
| [#65](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/65) | Enhanced Export: Add Weekly Budget Breakdown for Better Financial Transparency | 🟡 Open | 2025-12-14 | enhancement, feature, backend                  |
| [#64](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/64) | Implement cleanup job for expired password reset tokens                        | 🟡 Open | 2025-12-12 | enhancement, backend                           |
| [#63](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/63) | Add audit trail columns to track data modifications                            | 🟡 Open | 2025-12-12 | enhancement, backend                           |
| [#62](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/62) | Add composite index for expenses query optimization                            | 🟡 Open | 2025-12-12 | backend                                        |
| [#61](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/61) | Implement soft delete pattern for expenses and recurring expenses              | 🟡 Open | 2025-12-12 | enhancement, backend                           |
| [#60](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/60) | Add ON DELETE behavior to foreign key relationships                            | 🟡 Open | 2025-12-12 | backend                                        |
| [#59](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/59) | Replace generic exception handling with specific SQLAlchemy exceptions         | 🟡 Open | 2025-12-12 | backend                                        |
| [#58](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/58) | Add database CHECK constraints for data integrity                              | 🟡 Open | 2025-12-12 | backend                                        |
| [#57](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/57) | Fix transaction handling in multi-step database operations                     | 🟡 Open | 2025-12-12 | backend                                        |
| [#56](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/56) | Implement database migration system (Flask-Migrate)                            | 🟡 Open | 2025-12-12 | backend                                        |
| [#54](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/54) | Habit-aware Conservative Budgets & End-of-Period Savings Nudges                | 🟡 Open | 2025-12-04 | -                                              |
| [#38](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/38) | Add Error Tracking (Sentry Integration)                                        | 🟡 Open | 2025-11-30 | enhancement, backend, frontend                 |
| [#37](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/37) | Separate Debit/Credit Spending Visualization                                   | 🟡 Open | 2025-11-30 | enhancement, ui-ux, analytics, frontend        |
| [#34](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/34) | Implement Account Lockout After Failed Logins                                  | 🟡 Open | 2025-11-30 | enhancement, backend, security                 |
| [#33](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/33) | Add Email Verification Flow                                                    | 🟡 Open | 2025-11-30 | enhancement, backend, security                 |
| [#32](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/32) | Migrate Rate Limiting to Redis                                                 | 🟡 Open | 2025-11-30 | enhancement, backend, security                 |
| [#25](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/25) | Feature: Google Calendar Integration                                           | 🟡 Open | 2025-11-28 | enhancement, feature, backend, frontend        |
| [#10](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/10) | Cross-browser Testing & Compatibility                                          | 🟡 Open | 2025-11-17 | enhancement, ui-ux, frontend                   |
| [#9](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/9)   | Flexible Sub-Period Division - User Chooses Budget Split                       | 🟡 Open | 2025-11-17 | enhancement, feature, ui-ux, backend, frontend |
| [#8](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/8)   | Receipt Upload & OCR Integration                                               | 🟡 Open | 2025-11-17 | feature, ui-ux, backend, frontend              |
| [#7](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/7)   | Multi-currency Support                                                         | 🟡 Open | 2025-11-17 | feature, backend, frontend                     |
| [#6](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/6)   | Notifications & Reminders System                                               | 🟡 Open | 2025-11-17 | feature, ui-ux, backend, frontend              |
| [#4](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/4)   | Goals & Savings Tracking                                                       | 🟡 Open | 2025-11-17 | feature, ui-ux, backend, frontend              |
| [#3](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/3)   | Reports & Analytics Dashboard                                                  | 🟡 Open | 2025-11-17 | feature, ui-ux, analytics, backend, frontend   |
| [#2](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/2)   | Budget Categories & Spending Limits                                            | 🟡 Open | 2025-11-17 | feature, ui-ux, backend, frontend              |
| [#1](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/1)   | End-of-Period Suggestions - Smart Budget Assistant                             | 🟡 Open | 2025-11-17 | feature, ui-ux, backend, frontend              |

### Recently Completed Issues (Last 30 Days)

| Issue                                                              | Title                                                | Status                      | Completed  | Summary                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------- | ---------- | ---------------------------------------------------------------------- |
| [#70](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/70) | Recurring Expense Day of Month Bugs                  | ✅ Completed                | 2025-12-15 | Fixed day_of_month not updating from start_date and generation display |
| [#67](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/67) | Add tests to CI/CD                                   | ✅ Completed                | 2025-12-15 | Integrated 28 backend tests with 3-layer email mock protection         |
| [#66](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/66) | Mobile UI Issues                                     | ✅ Completed                | 2025-12-15 | Fixed viewport zoom, button positioning, and click detection on mobile |
| [#55](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/55) | Balance Calculation Bug - Salary Period Rollover     | ✅ Completed                | 2025-12-12 | Fixed double-counting of initial balance in rollover calculations      |
| [#50](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/50) | Overhaul budget_period_id system                     | ✅ Completed                | 2025-12-06 | Removed budget_period_id columns, switched to date-based queries       |
| [#28](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/28) | Remove Legacy Budget Period System                   | ✅ Completed                | 2025-12-06 | Removed CreatePeriodModal and EditPeriodModal                          |
| [#46](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/46) | Credit Card Debt Display Bug                         | ✅ Completed                | 2025-12-06 | Fixed debt display by fetching all expenses                            |
| [#47](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/47) | CI/CD Pipeline Implementation                        | ✅ Completed                | 2025-12-06 | Implemented GitHub Actions CI/CD                                       |
| [#43](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/43) | Staging Environment                                  | ❌ Closed (Won't Implement) | 2025-12-06 | Not needed for solo developer workflow                                 |
| [#11](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/11) | Performance Optimization for Large Transaction Lists | ✅ Completed                | 2025-12-06 | Added database indexes, debounced search, component memoization        |
| [#41](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/41) | Database Backup Automation                           | ✅ Completed                | 2025-11-30 | GitHub Actions daily backups                                           |
| [#42](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/42) | API Versioning                                       | ✅ Completed                | 2025-11-30 | Added /api/v1 endpoints                                                |
| [#40](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/40) | Input Length Validation                              | ✅ Completed                | 2025-11-30 | Added maxLength to all text inputs                                     |
| [#39](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/39) | CSP Headers                                          | ✅ Completed                | 2025-11-30 | Implemented Content Security Policy                                    |
| [#24](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/24) | Dark Mode Implementation                             | ✅ Completed                | 2025-12-02 | Full dark mode across all pages and components                         |

### Format for Updates

When adding a new issue:

```markdown
| [#XX](link) | Issue Title | 🟡 In Progress | YYYY-MM-DD | Brief description |
```

When completing an issue:

-   Move from Active to Recently Completed
-   Change status to ✅ Completed or ❌ Closed
-   Add completion date and summary

Status Icons:

-   🟡 In Progress
-   ✅ Completed
-   ❌ Closed (Won't Implement)
-   🔴 Blocked

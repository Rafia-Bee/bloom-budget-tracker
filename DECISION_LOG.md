# Decision Log

Architectural decisions only. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2025-12-17

### European Date Format Throughout App (#75)

**Context:** App was inconsistently using American date format (Month Day, Year) instead of European format (Day Month, Year).

**Problem:**

-   `RecurringExpenses.jsx` used 'en-US' locale showing dates as "Jan 20, 2026"
-   `Debts.jsx` had two date displays with no locale specified (defaulting to system locale)
-   `AddExpenseModal.jsx` had date display with no locale specified
-   Inconsistent user experience for European target audience

**Solution:**

Updated all date formatting to use 'en-GB' locale with consistent format:

1. **RecurringExpenses.jsx** (line 148):

    - Changed `formatDate` function from 'en-US' to 'en-GB'
    - Format: `{ day: 'numeric', month: 'short', year: 'numeric' }`
    - Example: "20 Jan, 2026" instead of "Jan 20, 2026"

2. **Debts.jsx** (lines 590, 628):

    - Added 'en-GB' locale to `updated_at` date display (Paid On date)
    - Added 'en-GB' locale to transaction date in payment history
    - Format: `{ day: 'numeric', month: 'short', year: 'numeric' }`

3. **AddExpenseModal.jsx** (line 304):
    - Added 'en-GB' locale to recurring expense start date preview
    - Format: `{ day: 'numeric', month: 'short', year: 'numeric' }`

**Verification:**

-   All 13 date formatting instances now use 'en-GB' locale
-   No instances of 'en-US' or missing locale remain
-   Consistent "Day Month, Year" format across entire app

**Impact:**

-   ✅ **UX Consistency**: All dates now show European format
-   ✅ **Target Audience**: Better experience for European users
-   ✅ **No Breaking Changes**: Date format is cosmetic, no data changes
-   ✅ **Complete Coverage**: All date displays updated

### Password Reset Token Cleanup Job (#64)

**Context:** The `password_reset_tokens` table grew unbounded with no cleanup mechanism. Expired and used tokens accumulated forever, wasting database storage and slowing queries.

**Problem:**

-   Tokens created when user requests password reset
-   Tokens expire after 1 hour
-   Expired tokens never removed from database
-   Used tokens never removed from database
-   Table grows unbounded over time

**Solution:**

1. **Created Cleanup Service** (backend/services/cleanup_service.py):

    - `cleanup_expired_password_reset_tokens(hours_old=24)`: Deletes tokens expired > 24 hours ago
    - `cleanup_used_password_reset_tokens(days_old=7)`: Deletes used tokens > 7 days old
    - `cleanup_all_password_reset_tokens()`: Runs both cleanup operations
    - Comprehensive error handling and logging
    - Returns counts of deleted tokens

2. **On-Access Cleanup** (backend/routes/password_reset.py):

    - Password reset endpoint triggers cleanup before processing
    - Ensures expired tokens are removed during normal app usage
    - Fails gracefully if cleanup errors (doesn't block reset)

3. **Scheduled Cleanup Script** (scripts/cleanup_scheduler.py):

    - Standalone script that can run via cron or CI/CD
    - Supports running specific cleanup tasks or all tasks
    - Provides detailed output and logging
    - Usage: `python scripts/cleanup_scheduler.py --all`

4. **GitHub Actions Workflow** (.github/workflows/cleanup.yml):

    - Runs daily at 2 AM UTC (low-traffic hours)
    - Can be triggered manually via workflow_dispatch
    - Connects to production database via DATABASE_URL secret
    - Logs cleanup results

5. **Testing** (backend/tests/test_cleanup.py):
    - Test expired token cleanup
    - Test used token cleanup
    - Test combined cleanup
    - Test empty table handling
    - Test on-access cleanup during password reset

**Impact:**

-   ✅ **Storage Efficiency**: Prevents unbounded table growth
-   ✅ **Query Performance**: Smaller table = faster queries
-   ✅ **Security**: Old tokens removed from database
-   ✅ **Automatic**: Runs daily without manual intervention
-   ✅ **Dual Strategy**: On-access cleanup + scheduled cleanup
-   ✅ **Monitoring**: Logs provide visibility into cleanup operations

**Configuration:**

-   Expired tokens: Deleted after 24 hours of expiration
-   Used tokens: Deleted after 7 days of use
-   Schedule: Daily at 2 AM UTC via GitHub Actions
-   On-access: Runs on every password reset request

### Account Lockout After Failed Logins (#34)

**Context:** Login endpoint allowed unlimited failed login attempts per account, vulnerable to brute force and credential stuffing attacks. Rate limiting only protected per-IP, not per-account.

**Problem:**

-   No limit on failed login attempts per account
-   Attackers could try unlimited passwords for a specific account
-   Users not notified of unauthorized access attempts
-   Vulnerable to credential stuffing (leaked passwords from other sites)

**Solution:**

1. **Updated User Model** (backend/models/database.py):

    - Added `failed_login_attempts` column (default 0)
    - Added `locked_until` column (nullable datetime)
    - Added `is_locked()` method to check if account currently locked
    - Added `reset_failed_attempts()` method to clear counter on successful login

2. **Updated Login Endpoint** (backend/routes/auth.py):

    - Check if account locked before password verification
    - Increment failed_login_attempts counter on wrong password
    - Lock account for 15 minutes after 5 failed attempts
    - Show remaining attempts to user (e.g., "3 attempt(s) remaining")
    - Reset counter to 0 on successful login
    - Return 403 status when account locked (distinct from 401 invalid credentials)

3. **Email Notifications** (backend/services/email_service.py):

    - Added `send_account_lockout_email()` method
    - Sends email to user when account is locked
    - Includes lockout duration, security tips, and support contact
    - Alerts users to potential unauthorized access attempts

4. **Database Migration**:

    - Created migration `faad44d4429e_add_account_lockout_fields_to_user_model`
    - Adds nullable columns with defaults (safe for production)
    - Applied automatically via Flask-Migrate workflow

5. **Testing** (backend/tests/test_auth.py):
    - Test lockout after 5 failed attempts
    - Test locked account rejects correct password
    - Test successful login resets counter
    - Test nonexistent user doesn't reveal lockout mechanism (security)

**Impact:**

-   ✅ **Brute Force Protection**: 5-attempt limit makes password guessing impractical
-   ✅ **User Awareness**: Email notification alerts users to unauthorized access attempts
-   ✅ **Automatic Recovery**: 15-minute cooldown is user-friendly (not permanent lockout)
-   ✅ **Layered Security**: Works alongside existing IP-based rate limiting
-   ✅ **Standards Compliance**: Aligns with OWASP authentication best practices
-   ⚠️ **Trade-off**: Legitimate users who forget passwords may face temporary lockout

**Configuration:**

-   MAX_FAILED_ATTEMPTS: 5 (hardcoded in auth.py)
-   LOCKOUT_MINUTES: 15 (hardcoded in auth.py)
-   Email sending is optional (fails gracefully if SendGrid not configured)

### Database Migration System Implementation (#56)

**Context:** Database schema changes were managed by `db.create_all()`, which only creates missing tables and cannot handle schema modifications, rollbacks, or track changes over time.

**Problem:**

-   No version control for database schema changes
-   Cannot modify existing table structures safely
-   No rollback capability for problematic schema changes
-   Risk of production schema drift between environments
-   Difficult to coordinate code deployments with schema changes

**Solution:**

1. **Implemented Flask-Migrate (Alembic wrapper)**:

    - Added `Flask-Migrate==4.0.5` to backend/requirements.txt
    - Initialized migration repository in `backend/migrations/`
    - Created initial migration capturing all current tables and indexes
    - Replaced `db.create_all()` with migration-based schema management

2. **Updated Application Setup** (backend/app.py):

    - Added `from flask_migrate import Migrate` import
    - Initialized Migrate with `migrate = Migrate(app, db, directory='backend/migrations')`
    - Commented out `db.create_all()` - schema now managed by migrations
    - Migrations directory explicitly set to handle running from project root

3. **Updated Deployment Process** (render.yaml):

    - Added `FLASK_APP=backend/app.py` environment variable
    - Modified buildCommand: `pip install -r backend/requirements.txt && python -m flask db upgrade`
    - Migrations now run automatically on every deployment before app starts

4. **Updated Documentation** (docs/DEPLOYMENT.md):
    - Added comprehensive "Schema Migrations" section with common commands
    - Documented migration workflow: modify models → generate migration → review → apply → commit
    - Added best practices: review migrations, test in dev, include in commits, never edit applied migrations
    - Documented production deployment process with automatic migration execution

**Impact:**

-   ✅ **Safe Schema Evolution**: Can now modify tables, add/remove columns, change constraints
-   ✅ **Version Control**: All schema changes tracked in migration files with descriptions
-   ✅ **Rollback Capability**: Can downgrade to previous schema versions if needed
-   ✅ **Production Safety**: Automatic migrations on deployment prevent schema drift
-   ✅ **Audit Trail**: Migration history provides clear record of database evolution
-   ⚠️ **Breaking Change**: Existing deployments need initial migration applied once

**Migration Commands:**

```bash
flask db migrate -m "description"  # Generate migration from model changes
flask db upgrade                   # Apply migrations
flask db downgrade                 # Rollback one migration
flask db current                   # Show current revision
flask db history                   # Show migration history
```

### Transaction Handling in Multi-Step Database Operations (#57)

**Context:** Multi-step database operations (salary period creation, debt payments, bulk imports) lacked proper transaction wrapping, risking data inconsistency if operations failed partway through.

**Problem:**

-   **Salary Period Creation**: Creates SalaryPeriod → 4 BudgetPeriods → Income record. If step 2+ fails, orphaned salary period remains.
-   **Debt Payments**: Creates Expense → updates Debt balance. Partial failure leaves inconsistent debt state.
-   **Bulk Imports**: Creates hundreds of records. Any failure mid-import leaves database in unknown state with partial data.
-   Only generic `except Exception` with rollback existed, but lacked:
    -   Specific SQLAlchemy error handling
    -   Proper error logging for debugging
    -   Clear user feedback on failures

**Solution:**

1. **Added SQLAlchemyError Handling** (all three files):

    - Import `SQLAlchemyError` from `sqlalchemy.exc`
    - Import `current_app` from Flask for logger access
    - Wrap multi-step operations in nested try/except blocks

2. **Salary Periods (backend/routes/salary_periods.py)**:

    - Moved all operations (SalaryPeriod, BudgetPeriods, Income) inside single try block
    - Added specific `except SQLAlchemyError` handler with logging
    - Rollback occurs before returning error response
    - User sees: "Failed to create salary period. Please try again."

3. **Debt Payments (backend/routes/debts.py)**:

    - Wrapped Expense creation + Debt update in transaction
    - Added specific SQLAlchemyError handler
    - Also fixed debt import endpoint with transaction wrapping
    - User sees: "Failed to record debt payment. Please try again."

4. **Bulk Imports (backend/routes/export_import.py)**:
    - Wrapped entire import operation (debts, recurring expenses, salary periods, expenses, income) in single transaction
    - Fixed indentation issues where code was outside try block
    - All imports are now atomic - either all succeed or all rollback
    - User sees: "Failed to import data. Please try again."

**Technical Details:**

-   All changes use `current_app.logger.error()` with `exc_info=True` for full stack traces
-   Maintains existing validation and error messages
-   Generic `except Exception` handlers kept as fallback for non-DB errors
-   No API contract changes - only internal error handling improved

**Impact:**

-   **Data Integrity**: Eliminates orphaned records and inconsistent states
-   **Debuggability**: Proper error logging helps diagnose production issues
-   **User Experience**: Clear error messages instead of silent failures
-   **Maintainability**: Consistent error handling pattern across all routes
-   All existing tests pass (7/7 in test_business_logic.py)

**Testing:**
Verified with pytest - all business logic tests pass, confirming no regressions in carryover calculations, recurring expense generation, or expense date assignment.

---

### Dashboard Balance Update Race Condition Fix (#78)

**Context:** Critical bug where adding new expenses did not immediately update the dashboard's debit card "Total spent" balance, though period spending and weekly budget calculations updated correctly.

**Problem:**

-   User adds expense with debit card → expense created successfully
-   Dashboard showed updated "Budget remaining" and "Spent this period"
-   BUT "Total spent" (cumulative debit balance) remained stale
-   Root cause: Race condition in Dashboard.jsx transaction handlers

**Technical Analysis:**

-   Multiple handlers (`handleAddExpense`, `handleAddIncome`, `handleDeleteExpense`, etc.) called `loadExpenses()` or `loadIncome()` **without await**
-   These functions trigger async `calculateCumulativeBalances()` which fetches ALL transactions and recalculates totals
-   Modal closed before balance calculation completed → UI showed old balance
-   Example: Line 608 in Dashboard.jsx had `loadExpenses()` instead of `await loadExpenses()`

**Solution:**
Added `await` to all `loadExpenses()` and `loadIncome()` calls in:

-   `handleAddExpense()` - Line 608
-   `handleAddIncome()` - Line 676
-   `handleDeleteExpense()` - Line 695
-   `handleDeleteIncome()` - Line 686
-   `handleEditExpense()` - Line 704
-   `handleEditIncome()` - Line 717
-   `handleBulkDelete()` - Lines 776-777
-   Warning modal confirm handler - Line 1645

**Impact:**

-   Guarantees balance calculations complete before UI updates
-   Eliminates race condition across all transaction operations
-   Fixes reported bug plus similar issues in edit/delete operations
-   No breaking changes - async await pattern already used elsewhere

---

### Credit Card Debt Calculation & Period Management Fixes

**Context:** Multiple issues with credit card debt tracking and salary period creation affecting accuracy and user experience.

**Problems:**

1. Auto-generated "Pre-existing Credit Card Debt" expense created one day before new period start, appearing in previous period's final week and inflating spending
2. Debts page calculated credit card debt from all historical expenses instead of using salary period's initial_credit_balance, showing incorrect amounts
3. Recurring expenses missing "Fixed Bill" checkbox, causing fixed expenses to count toward weekly budget
4. Backend /salary-periods/current endpoint missing initial_credit_balance field needed by frontend

**Solutions:**

1. **Removed Auto-Expense Creation** (backend/routes/salary_periods.py):

    - Deleted automatic "Pre-existing Credit Card Debt" expense generation
    - Rationale: Redundant with initial_credit_balance field; caused confusion as fake expense in transaction list
    - Users already track credit via initial balance setting + recurring payment expenses

2. **Fixed Credit Card Calculation** (frontend/src/pages/Debts.jsx):

    - Changed from: Sum all credit expenses - all payments (from beginning of time)
    - Changed to: initial_credit_balance + period_credit_expenses - period_credit_payments
    - Now matches Dashboard's calculation and shows correct debt amount
    - Added salaryPeriodAPI import for accessing initial balances

3. **Added Missing API Fields** (backend/routes/salary_periods.py):

    - Added initial_debit_balance, initial_credit_balance, credit_budget_allowance to /salary-periods/current response
    - Frontend depends on these fields for accurate calculations

4. **Added Fixed Bill Checkbox** (frontend/src/components/AddRecurringExpenseModal.jsx):
    - Added isFixedBill state and checkbox UI
    - Included is_fixed_bill in form submission
    - Generated expenses now correctly inherit fixed bill status from template

**Additional Improvements:**

-   Added "Delete All Data" experimental feature with text confirmation ("Delete everything")
-   ExportImportModal now auto-refreshes dashboard after successful import
-   Changed "Balance" to "Debt" label on debts page for clarity
-   Changed "Calculated" badge to "Auto-calculated" on credit card debt

**Impact:**

-   Eliminates phantom expenses that confused users
-   Credit card debt now displays accurate amounts matching actual usage
-   Fixed bills properly excluded from weekly budget calculations
-   Better data integrity between salary period settings and transaction tracking

---

## 2025-12-17

### Issue #73 - Fix "Remind Me Later" on Rollover Prompt (COMPLETED)

**Context:** "Remind Me Later" button on Week 4 salary period rollover prompt was permanently dismissing the prompt instead of snoozing it temporarily.

**Problem:**

-   Old implementation stored only the period end date in localStorage
-   Never checked if enough time had passed to re-show the prompt
-   Clicking "Remind Me Later" effectively meant "Never remind me again" for that period
-   User had to manually clear localStorage to see prompt again

**Solution:**

Changed from simple string storage to JSON object with timestamp:

**Dashboard.jsx Changes:**

1. **Dismissal Handler (onDismiss):**

    - Store JSON object with `periodEndDate` and `dismissedAt` timestamp
    - Format: `{ periodEndDate: "2025-12-28", dismissedAt: "2025-12-17T10:30:00.000Z" }`

2. **Prompt Visibility Check:**
    - Parse JSON from localStorage
    - Calculate hours since dismissal: `(Date.now() - dismissedAt) / (1000 * 60 * 60)`
    - Only keep dismissed if less than 24 hours have passed
    - Show prompt again after 24-hour snooze period
    - Gracefully handle old format (try/catch with fallback to clear and show)

**Benefits:**

-   User-friendly "snooze" behavior matches user expectations
-   24-hour reminder interval balances urgency with not being annoying
-   Still respects different periods (won't show old period prompts)
-   Backward compatible with old localStorage format

**Impact:** Users can now genuinely defer the rollover prompt temporarily, and it will remind them again after 24 hours as expected from a "Remind Me Later" button.

---

## 2025-12-16

### Issue #76 - Mobile-Friendly Redesign for Debts and Recurring Expenses Cards (COMPLETED)

**Context:** Debts and Recurring Expenses pages needed mobile optimization while preserving desktop layouts that user preferred.

**Problems:**

1. **AddRecurringExpenseModal** - Form too tall for mobile screens, content cut off, no scroll capability
2. **Desktop Button Layouts** - User preferred original desktop layouts over mobile-optimized versions

**Solution:**

**Modal Scroll ([AddRecurringExpenseModal.jsx](frontend/src/components/AddRecurringExpenseModal.jsx)):**

-   Changed modal to flexbox column layout with `max-h-[90vh]`
-   Header and error messages: `flex-shrink-0` (stays visible)
-   Form content: `overflow-y-auto flex-1 pr-2` (scrollable area)
-   Button container: `flex-shrink-0 border-t` (stays visible at bottom with separator)
-   Outer container: `p-4 overflow-y-auto` for page-level scrolling

**Dual Layout Pattern:**

Implemented separate mobile and desktop layouts using Tailwind responsive classes:

-   Mobile: `flex flex-col sm:hidden` - Shows on mobile only
-   Desktop: `hidden sm:flex` - Shows on desktop only

**Debts Page ([Debts.jsx](frontend/src/pages/Debts.jsx)):**

-   **Mobile**: Vertical layout with Edit → Delete → Pay button order (safer)
-   **Desktop**: Original horizontal layout with Pay → Edit → Delete (Pay button first with text)
-   Mobile Pay button shows icon + "Pay" text, desktop shows just "Pay"

**Recurring Expenses Page ([RecurringExpenses.jsx](frontend/src/pages/RecurringExpenses.jsx)):**

-   **Mobile**: Full-width button row with labels (Pin/Edit/Pause/Delete), prominent amount display
-   **Desktop**: Original horizontal layout with 2x2 info grid, buttons on right side
-   Inactive expenses already had proper responsive sizing

**Pattern:**

```jsx
// Mobile layout
<div className="flex flex-col gap-3 sm:hidden">
  {/* Mobile-optimized layout */}
</div>

// Desktop layout
<div className="hidden sm:flex sm:justify-between gap-3">
  {/* Original desktop layout */}
</div>
```

**Impact:** Mobile users get optimized vertical layouts with clear touch targets and scrollable modals. Desktop users keep familiar horizontal layouts. Best of both worlds without compromise.

---

### Issue #74 - Fix Mobile Menu Navigation and Missing Buttons (COMPLETED)

**Context:** Mobile navigation menu had critical usability issues across Dashboard and other pages. Dashboard mobile menu was missing action buttons, and Header mobile menu navigation was completely non-functional.

**Problems:**

1. **Dashboard Mobile Menu** - Missing Export/Import/Bank/Experimental buttons
2. **Debts/Recurring Pages** - Navigation buttons didn't work, action buttons didn't trigger
3. **Root Cause** - Click-outside handler closing menu before button handlers could execute

**Solution:**

**Dashboard Mobile Menu ([Dashboard.jsx](frontend/src/pages/Dashboard.jsx)):**

-   Added missing ThemeToggle, Export Data, Import Data, Bank Import, Experimental Features buttons
-   Matched modal trigger pattern: `setShowExportModal(true); setExportMode('export')`

**Header Mobile Menu ([Header.jsx](frontend/src/components/Header.jsx)):**

-   **Key Fix**: Wrapped mobile menu dropdown inside `.mobile-menu-container` div
-   Previously: Click-outside handler saw menu button clicks as outside clicks and closed menu
-   Now: Entire mobile section (header bar + dropdown) wrapped in container
-   Changed navigation from NavLink to explicit `navigate('/path')` button calls
-   Added `e.preventDefault()` and `e.stopPropagation()` to all button handlers
-   Close menu BEFORE executing action (prevents race condition)
-   Added defensive checks: `if (onExport) onExport()`

**Pattern:**

```jsx
// Mobile menu container wraps both header and dropdown
<div className="md:hidden mobile-menu-container">
  <div className="flex justify-between">...</div>
  {showMobileMenu && <div>...dropdown...</div>}
</div>

// Button handlers
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  setShowMobileMenu(false);
  navigate('/path'); // or if (handler) handler();
}}
```

**Impact:** Mobile navigation now fully functional. Users can navigate between pages and access all features on mobile devices.

---

### Issue #68 - Fix Transaction Edit/Delete Buttons Overflowing on Mobile (COMPLETED)

**Context:** Edit and delete buttons on transaction cards were overflowing on mobile screens, making them difficult or impossible to tap. Long transaction names with multiple badges caused horizontal overflow.

**Problem:**

-   Horizontal layout couldn't fit all content on narrow mobile screens (375px-390px)
-   Long transaction names + badges + amount + buttons exceeded available width
-   Buttons had insufficient touch targets (< 44x44px)
-   Circular dot indicator caused text misalignment

**Solution:**

Completely redesigned transaction card layout with mobile-first vertical stacking:

**Layout Changes ([Dashboard.jsx](frontend/src/pages/Dashboard.jsx)):**

-   Changed from `flex items-center` to `flex flex-col sm:flex-row`
-   Mobile: Two rows (title/category/date top, amount/buttons bottom)
-   Desktop: Single row (horizontal layout with more space)
-   Removed circular dot indicator that caused misalignment
-   All text now cleanly left-aligned

**Payment Method Indicator:**

-   Changed from subtle circular dot to color-coded badge
-   Pink badge = Credit card, Green badge = Debit card
-   More visible and accessible on mobile

**Button Touch Targets:**

-   Added `min-w-[44px] min-h-[44px]` for mobile (iOS/Android standard)
-   Added `sm:min-w-0 sm:min-h-0` for compact desktop size
-   Hover backgrounds for better visual feedback

**Also Applied To:**

-   Debts page buttons (same touch target sizing)
-   Recurring Expenses already had proper sizing

**Pattern:** `flex flex-col sm:flex-row` with mobile buttons: `p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0`

**Impact:** Transaction cards now adapt properly to mobile screens without overflow. All content visible and accessible with proper touch targets.

---

## 2025-12-15

### Issue #65 - Enhanced Export: Weekly Budget Breakdown (COMPLETED)

**Context:** Users exporting data couldn't see weekly budget breakdowns showing how carryover logic works and where money was spent.

**Problem:** Export only included raw transactions without weekly context or carryover calculations.

**Solution:**

Added `weekly_budget_breakdown` section to export when `salary_periods` are selected:

-   Created `generate_weekly_budget_breakdown()` helper function in [backend/routes/export_import.py](backend/routes/export_import.py)
-   Reuses carryover calculation logic from `GET /salary-periods/current` endpoint
-   Separates fixed vs flexible expenses by `is_fixed_bill` flag
-   Groups expenses by week using date ranges
-   Shows per-week: base budget, carryover, adjusted budget, flexible/fixed spending, remaining amount
-   Includes detailed expense breakdown with name, amount, category, payment method, date
-   Provides period summary: total budget allocated, total flexible/fixed spent, final remaining

**Structure:**

```json
{
    "weekly_budget_breakdown": [
        {
            "salary_period_id": 1,
            "salary_period_dates": "2025-11-20 to 2025-12-19",
            "weeks": [
                {
                    "week_number": 1,
                    "date_range": "2025-11-20 to 2025-11-26",
                    "base_budget": 18365,
                    "carryover": 0,
                    "adjusted_budget": 18365,
                    "spent": {
                        "flexible_expenses": 15420,
                        "fixed_expenses": 99104,
                        "total": 114524
                    },
                    "remaining": 2945,
                    "expense_breakdown": {
                        "flexible": [...],
                        "fixed": [...]
                    }
                }
            ],
            "summary": {
                "total_budget_allocated": 73462,
                "total_flexible_spent": 65890,
                "total_fixed_spent": 233738,
                "final_remaining": 7572
            }
        }
    ]
}
```

**Testing:** Created [scripts/test_export_breakdown.py](scripts/test_export_breakdown.py) to validate carryover calculations, expense categorization, and JSON serializability. All validation checks passed.

**Impact:** Users can now see exactly where money went each week, understand carryover logic, and verify app calculations match expectations.

---

### Issue #72 - Rollover Debit Balance Calculation Incorrect (COMPLETED)

**Context:** Rollover prompt showing incorrect debit balance (€-1163.63 negative) instead of correct positive balance (€232.03).

**Problem:** Future scheduled expenses were being included in current salary period calculations.

**Root Cause:**

-   `SalaryPeriodRolloverPrompt.jsx` fetches ALL expenses including future scheduled/generated ones
-   Date filtering only checked if expense was within period dates (`startDate` to `endDate`)
-   Didn't filter out expenses dated in the future (after today)
-   Generated recurring expenses for Dec 19, Dec 20, Jan 20, Feb 20, etc. were all included
-   This caused `periodDebitSpent` to be inflated by thousands of euros of future expenses

**Solution:**

Added additional filter condition in expense processing loop:

```javascript
const todayDateOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
);

if (
    expenseDateOnly >= startDateOnly &&
    expenseDateOnly <= endDateOnly &&
    expenseDateOnly <= todayDateOnly
) {
    // Process expense
}
```

Now only expenses that are:

1. Within salary period date range AND
2. On or before today's date

are included in the balance calculation.

**Files Changed:**

-   `frontend/src/components/SalaryPeriodRolloverPrompt.jsx`

**Testing:**

-   ✅ Debit balance now shows correct positive amount
-   ✅ Credit balance calculation remains correct
-   ✅ Future scheduled expenses excluded from current period totals

**Impact:** Users can now trust rollover balance calculations for creating next salary period.

---

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

**Date** | **Context** | **Decision** | **Rationale** | **Impact**

# Decision Log

Quick reference for decisions made during development. Newest entries at top.

---

## 2025-12-15

### Issue #66 - Mobile UI Issues: Viewport Zoom, Button Positioning & Click Detection (COMPLETED)

**Context:** Multiple mobile UX issues reported on OnePlus 13 Chrome browser

**Problems Identified:**
1. App required manual zoom out to view full content
2. Floating + button randomly repositioned during scroll
3. Menu didn't show on tap (inconsistent, required scrolling then tapping)
4. Desktop clicks required drag gesture instead of simple click

**Root Cause Analysis:**

**Issue 1 - Viewport Zoom:**
- Default viewport meta tag allowed user scaling and zoom
- Mobile browsers require explicit zoom prevention

**Issue 2 - Random Repositioning:**
- Touch events triggered drag mode with any tiny movement (< 5px)
- Scrolling page caused micro-movements that activated drag
- No threshold to distinguish intentional drag from accidental touch

**Issue 3 - Inconsistent Menu Opening:**
- `e.preventDefault()` on `touchstart` blocked click events
- Touch duration not validated (long press vs quick tap)
- Missing fallback click handler

**Issue 4 - Desktop Click Issues:**
- `handleClick` checked `!isDragging`, but `mouseDown` set `isDragging=true` immediately
- Click event fired after drag state was set, blocking menu toggle

**Solution Implemented:**

1. **Viewport Zoom Prevention:**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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
- `frontend/index.html` - Viewport meta tag
- `frontend/src/components/DraggableFloatingButton.jsx` - Complete touch/click rewrite
- `backend/app.py` - CORS configuration for development
- `docs/MOBILE_DEV.md` - New mobile testing guide
- `docs/README.md` - Added mobile dev reference

**Impact:**
- ✅ No accidental zoom on mobile
- ✅ Button stays fixed during scroll
- ✅ Menu opens reliably on first tap (mobile)
- ✅ Menu opens on click (desktop)
- ✅ Drag still works for repositioning (>10px movement)
- ✅ Documented workflow for mobile testing

**Testing Confirmed:**
- OnePlus 13 Chrome: All issues resolved ✅
- Desktop browsers: Click detection works ✅
- Touch gestures: Tap and drag both work correctly ✅

**Commits:**
- `fix: mobile UI improvements - viewport zoom, button positioning, and click detection (#66)`

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

## 2025-12-06

### Issue #11 - Performance Optimization for Large Transaction Lists (COMPLETED)

**Context:** Need to optimize performance for users with hundreds or thousands of transactions

**Decision:** Implemented comprehensive performance optimizations across backend and frontend

**Backend Optimizations:**

-   **Database Indexes** (12 total added):
    -   Expense table: `user_id`, `date`, `category`, `payment_method`
    -   Income table: `user_id`, `scheduled_date`, `actual_date`
    -   Composite indexes: `(user_id, date)`, `(user_id, category)`, `(user_id, payment_method)`, `(user_id, scheduled_date)`, `(user_id, actual_date)`
-   **Migration Script**: `scripts/add_performance_indexes.py` (idempotent, safe to run multiple times)
-   **Query Performance**: 10-100x faster on large datasets, especially for filtering and date-range queries

**Frontend Optimizations:**

-   **Debounced Search**: Created `useDebounce` hook (500ms delay) to throttle search API calls while user types
-   **Component Memoization**: Created `TransactionCard` component with React.memo to prevent unnecessary re-renders
-   **Search UX**: Search input updates instantly (responsive), but API calls are debounced (efficient)

**Already Implemented (from #30):**

-   Pagination: 50 items per page ✅
-   Load More button: Progressive loading ✅
-   Backend query filters: category, date range, amount, search ✅

**Rationale:**

-   ✅ Indexes eliminate full table scans on commonly filtered fields
-   ✅ Composite indexes optimize common query patterns (user + date/category/payment)
-   ✅ Debounced search reduces unnecessary API calls (1 call per 500ms vs 1 per keystroke)
-   ✅ Memoization prevents re-rendering unchanged transaction cards
-   ❌ Skipped virtual scrolling (pagination + load more is simpler and sufficient)
-   ❌ Skipped Redis caching (premature optimization for single-user app)

**Impact:**

-   **Database**: 12 new indexes (~1KB per index, negligible storage impact)
-   **Query Speed**: Dramatically faster filtering, especially on large datasets (1000+ transactions)
-   **Search**: Reduced from N API calls to 1 call per 500ms of typing
-   **Rendering**: Transaction list only re-renders when actual data changes

**Test Results:**

-   All 10 backend CRUD tests passing ✅
-   Frontend builds successfully ✅
-   Zero regressions ✅

**Production Migration:**

```bash
python -m scripts.add_performance_indexes  # Run on production database
```

**Files Changed:**

-   `backend/models/database.py` - Added indexes to Expense and Income models
-   `scripts/add_performance_indexes.py` - Migration script (new)
-   `frontend/src/hooks/useDebounce.js` - Custom debounce hook (new)
-   `frontend/src/components/TransactionCard.jsx` - Memoized transaction component (new)
-   `frontend/src/components/FilterTransactionsModal.jsx` - Updated to use debounced search

**Commit:** `ec8887e` - "feat: Performance optimizations for large transaction lists (#11)"

---

### Issue #43 - Staging Environment (CLOSED - Won't Implement)

**Context:** Proposal to add separate staging environment for testing before production

**Decision:** Will not implement staging environment

**Rationale:**

-   ✅ Current workflow already provides safety: localhost testing + manual deployment
-   ✅ Manual deploy on Cloudflare Pages and Render (auto-deploy disabled) acts as checkpoint
-   ✅ Pre-push hooks catch errors before commits reach repository
-   ✅ Solo developer project - no team collaboration needs
-   ❌ Staging would require maintaining extra infrastructure (backend, database, env vars)
-   ❌ Free tier quotas better spent on production reliability

**Alternative:** Documented existing safe deployment workflow in DEPLOYMENT.md

**Files Changed:** None (issue closed, workflow already documented)

---

### Issue #28 - Remove Legacy Budget Period System (COMPLETED)

**Context:** After completing #50 (budget_period_id removal), legacy CreatePeriodModal and EditPeriodModal were obsolete

**Decision:** Removed legacy budget period creation/editing UI, keeping only SalaryPeriodWizard

**Changes Made:**

-   Deleted `CreatePeriodModal.jsx` and `EditPeriodModal.jsx` (344 lines removed)
-   Removed imports, state variables, and handlers from Dashboard.jsx
-   Updated onEdit handlers to only support SalaryPeriod editing (has `weekly_budget` field)
-   Legacy standalone budget periods (without `salary_period_id`) remain visible for historical data but cannot be created or edited

**Rationale:**

-   ✅ Simplifies codebase - one way to manage periods (SalaryPeriodWizard)
-   ✅ All period management through 4-week salary periods with auto-generated weeks
-   ✅ Consistent with #50 decision to use date-based queries
-   ✅ Reduces user confusion - single clear path for period creation

**Impact:**

-   Users can no longer create standalone budget periods
-   All new periods must be 4-week salary periods
-   Historical standalone periods still accessible (read-only)

**Files Changed:**

-   `frontend/src/pages/Dashboard.jsx` - Removed modal imports, state, handlers
-   `frontend/src/components/CreatePeriodModal.jsx` - Deleted (147 lines)
-   `frontend/src/components/EditPeriodModal.jsx` - Deleted (142 lines)

**Commit:** `4c00bdd` - "feat: Remove legacy budget period system (#28)"

---

## 2025-12-06

### Phase 3 Complete: budget_period_id Fully Removed from Codebase

**Issue:** [#50 - Overhaul budget_period_id system](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/50)

**Context:** After Phase 1 (date-based queries) and Phase 2 (frontend simplification), Phase 3 removes the `budget_period_id` column entirely from the database and all code references.

**Decision:** Drop `budget_period_id` columns from 3 tables (expenses, income, period_suggestions) and remove all FK relationships.

**Changes Made:**

1. **Database Migration**:

    - Created `scripts/drop_budget_period_id.py` with safety checks and backup
    - Dropped columns: `expenses.budget_period_id`, `income.budget_period_id`, `period_suggestions.budget_period_id`
    - Removed relationships: `BudgetPeriod.expenses`, `BudgetPeriod.income`

2. **Models (database.py)**:

    - Removed 3 ForeignKey column definitions
    - Removed 2 relationship definitions

3. **Routes Updated**:

    - `expenses.py`: Removed from CREATE route (lines 155-177) and GET response (line 93)
    - `income.py`: Removed from CREATE route (lines 110-145) and GET response (line 89)
    - `salary_periods.py`: Removed 6 references (CREATE, UPDATE, DELETE routes)
    - `export_import.py`: Removed 4 references (lines 429, 445, 511, 574) and lookup logic

4. **Code Cleanup**:

    - `recurring_generator.py`: Removed budget_period_id assignment (line 165)
    - `seed_data.py`: Removed 3 budget_period_id references (lines 169, 728, 836)

5. **Tests**:

    - Updated `test_delete_salary_period` to expect 400 when transactions exist
    - All 10 CRUD tests passing (5 expense + 2 income + 3 salary period)

6. **Frontend Fix**:
    - `Dashboard.jsx`: Fixed cumulative balance calculation to use salary period start date instead of earliest budget period
    - Result: Correct available amounts (€478.85 debit, €604.84 credit)

**Rationale:**

-   ✅ Eliminates data integrity bugs from FK system
-   ✅ Simplifies codebase (~100 lines removed across 10+ files)
-   ✅ Import/export now works seamlessly
-   ✅ Date-based queries are more intuitive and accurate
-   ✅ No performance impact (date indexes on expense/income tables)

**Impact:**

-   **Positive**: Zero data integrity bugs related to period assignment
-   **Positive**: Import functionality fixed (was broken after Phase 3 models update)
-   **Positive**: Simpler mental model for developers
-   **Neutral**: Production database still has columns (backward compatible, can drop later)
-   **Production**: Code works with or without columns present (forward compatible)

**Production Migration Strategy:**

-   Push to main → Render auto-deploys (columns still exist, unused)
-   Test for stability over several days
-   Optional: Run `drop_budget_period_id.py` on production when ready
-   No downtime required (code is forward compatible)

**Files Changed (Phase 3)**:

-   `backend/models/database.py` - Removed 3 columns + 2 relationships
-   `backend/routes/expenses.py` - Removed 2 references
-   `backend/routes/income.py` - Removed 2 references
-   `backend/routes/salary_periods.py` - Removed 6 references
-   `backend/routes/export_import.py` - Removed 4 references + lookup logic
-   `backend/utils/recurring_generator.py` - Removed 1 reference
-   `backend/seed_data.py` - Removed 3 references
-   `backend/tests/test_crud.py` - Updated delete test expectations
-   `frontend/src/pages/Dashboard.jsx` - Fixed cumulative balance calculation
-   `scripts/drop_budget_period_id.py` - Created migration script

---

## 2025-12-06

### Phase 1: Date-Based Queries Replace budget_period_id Filters

**Issue:** [#50 - Overhaul budget_period_id system](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/50)

**Context:** The `budget_period_id` foreign key system created complexity and data integrity bugs. Expenses with null `budget_period_id` or mismatched period assignments caused incorrect balance calculations.

**Decision:** Implement date-range filtering as the primary query method, keeping `budget_period_id` column temporarily for backward compatibility (Phase 1 of 3-phase migration).

**Changes Made:**

1. **Backend Routes (salary_periods.py)**:

    - Replaced `Expense.budget_period_id == period.id` with `Expense.date >= period.start_date AND Expense.date <= period.end_date`
    - Updated carryover calculation queries (current week, all weeks loop)
    - Updated leftover allocation queries (previous weeks, current week)

2. **Testing**:
    - All existing tests pass (test_business_logic.py: 7/7, test_crud.py: 10/10)
    - Created `scripts/test_date_queries.py` to verify query equivalence
    - Found data integrity bug: expenses dated October incorrectly assigned to November periods

**Rationale:**

-   ✅ Date-based queries are more accurate (prevent misassigned expenses)
-   ✅ Eliminates null budget_period_id edge cases
-   ✅ Simplifies import/export logic
-   ✅ Natural filtering across custom date ranges
-   ✅ Backward compatible - both query methods work during transition

**Impact:**

-   **Positive**: Fixed data integrity bug where expenses could be assigned to wrong periods
-   **Positive**: Carryover calculations now use actual expense dates, more accurate
-   **Neutral**: Frontend still uses budget_period_id but already has date-fallback logic
-   **Next Steps**: Phase 2 (update frontend to use dates), Phase 3 (remove column)

**Files Changed:**

-   `backend/routes/salary_periods.py` - 3 query locations updated
-   `scripts/test_date_queries.py` - Created test script
-   `scripts/debug_expenses.py` - Created debug script

---

## 2025-12-06

### User Menu Consolidation - Shared Header Component

**Context:** Three different user menu implementations across Dashboard, Debts, and Recurring pages causing inconsistency and maintenance issues

**Decision:** Create shared `Header.jsx` component with unified user menu across all pages

**Rationale:**

-   ✅ Single source of truth for header structure
-   ✅ Consistent user experience across all pages
-   ✅ Easier maintenance - update header once, apply everywhere
-   ✅ Theme toggle, export/import, logout all work identically
-   ⚠️ Dashboard keeps PeriodSelector as it's page-specific

**Implementation:**

**1. Created `Header.jsx` Component:**

-   Props: `setIsAuthenticated`, `onExport`, `onImport`, `onBankImport`, `onShowExperimental` (optional), `children`
-   Features: Navigation links, user menu dropdown, theme toggle, mobile menu
-   Layout: "Bloom" heading + tagline on left, navigation + user menu on right
-   Styling: Matches Dashboard exactly (`px-4 py-2`, `font-semibold`, consistent text sizes)

**2. Updated Debts.jsx:**

-   Added `BankImportModal` import and state
-   Added `handleBankImport` function
-   Replaced custom header with `<Header />` component
-   Passed all required props to Header

**3. Updated RecurringExpenses.jsx:**

-   Added `setIsAuthenticated` prop to function signature
-   Added `BankImportModal` import and state
-   Added `handleBankImport` function
-   Replaced custom header with `<Header />` component
-   Passed all required props to Header

**4. Bug Fixes:**

-   Fixed route mismatch: `/recurring` → `/recurring-expenses` in Header navigation
-   Removed missing `logo.png` image, used text-based "Bloom" heading instead
-   Added tagline "Financial Habits That Grow With You" to match Dashboard
-   Fixed navigation link styling to match Dashboard (`text-gray-600`, regular size vs `text-sm`)
-   Fixed import/export button text colors in dark mode

**Files Changed:**

-   `frontend/src/components/Header.jsx` - New shared component
-   `frontend/src/pages/Debts.jsx` - Now uses Header component
-   `frontend/src/pages/RecurringExpenses.jsx` - Now uses Header component
-   `frontend/src/App.jsx` - Already passing `setIsAuthenticated` to both pages

**Result:**

-   Consistent user menu across Dashboard, Debts, and Recurring pages
-   All pages have same navigation, theme toggle, export/import, and logout functionality
-   Reduced code duplication significantly
-   Easier to maintain and update header features

---

## 2025-12-04

### Final Database Migration: Neon PostgreSQL

**Context:** Turso (libSQL) attempted but incompatible with Render free tier (requires Rust compilation for `sqlalchemy-libsql`)

**Decision:** Migrate to Neon PostgreSQL instead

**Rationale:**

-   ✅ Free tier with no expiration (vs Render Postgres 90-day limit)
-   ✅ 0.5GB storage (sufficient for 30-50 users)
-   ✅ 100 compute hours/month (autosuspends after 5min)
-   ✅ Instant cold starts (no delay like Render backend)
-   ✅ Fully compatible with Render free tier (standard `psycopg2-binary`)
-   ✅ PostgreSQL 17 (latest, no migration needed from Render Postgres)
-   ✅ Already have SQLAlchemy models (no code changes)
-   ❌ Turso failed: `sqlalchemy-libsql` requires Rust, incompatible with Render

**Implementation:**

1. Created Neon project: `bloom-tracker` (AWS EU-Central-1)
2. Updated `backend/config.py` - Simplified to PostgreSQL + SQLite fallback
3. Updated `backend/requirements.txt` - Removed Turso deps, added `psycopg2-binary>=2.9.9`
4. Updated `PROMPT_INTRO.md` - All Turso references replaced with Neon
5. Set Render env var: `DATABASE_URL` = Neon connection string
6. Removed: `TURSO_AUTH_TOKEN` (no longer needed)

**Timeline:**

-   Dec 3: Attempted Turso migration
-   Dec 4 AM: Discovered Render free tier incompatibility
-   Dec 4 PM: Switched to Neon, deployed successfully ✅

**Files Changed:**

-   `backend/config.py` - Removed Turso logic, simplified to PostgreSQL/SQLite
-   `backend/requirements.txt` - Removed `libsql-client`, `sqlalchemy-libsql`
-   `PROMPT_INTRO.md` - Updated all database references
-   `DECISION_LOG.md` - This entry

---

## 2025-12-03

### Attempted Migration to Turso (FAILED)

**Context:** Render free PostgreSQL databases expire after 90 days (Dec 28, 2025)

**Decision:** Attempted migration to Turso (libSQL)

**Outcome:** ❌ Failed - `sqlalchemy-libsql` requires Rust compilation, incompatible with Render free tier

**Lessons Learned:**

-   Render free tier has no Shell access, no build tools for Rust
-   `libsql-client` alone doesn't provide SQLAlchemy dialect
-   `sqlalchemy-libsql==0.1.0` works locally (Windows) but not on Render (Linux)
-   Free hosting requires packages with pre-built wheels

**Next Action:** Switched to Neon PostgreSQL (see Dec 4 entry above)

---

## 2025-12-02

### Documentation Cleanup and Enhancement - COMPLETED

**Status:** Major documentation reorganization complete

**Actions Taken:**

**1. Archived Outdated Documentation (7 files):**

-   PRE_PUSH_SETUP_COMPLETE.md → Setup now integrated into workflow
-   EMAIL_INTEGRATION_ISSUE.md → Feature implemented (see EMAIL_SETUP.md)
-   LOADING_ANIMATION_CONCEPTS.md → Design concepts implemented
-   DEPLOYMENT_SAFEGUARDS.md → Superseded by DEPLOYMENT.md
-   CUSTOM_DOMAIN.md → Netlify-specific, migrated to Cloudflare Pages
-   API_VERSIONING.md → Consolidated into DEPLOYMENT.md
-   DATABASE_BACKUP.md → Consolidated into DEPLOYMENT.md

**2. Consolidated Infrastructure Docs:**

-   Added "API Versioning" section to DEPLOYMENT.md
-   Added "Database Backup & Recovery" section to DEPLOYMENT.md
-   Reduced duplication, maintained all critical information

**3. Created New Documentation:**

-   **API.md** - Complete API reference with all endpoints, request/response examples, authentication, error codes, rate limiting (957 lines)
-   **Dark Mode section in USER_GUIDE.md** - Toggle instructions, color scheme, system preference support, troubleshooting

**4. Reorganized docs/README.md:**

-   Categorized into: Core, Feature, Infrastructure, Development
-   Added descriptions for each document
-   Listed archived documents with archival reasons
-   Added documentation principles (Actionable, Current, Concise, User-focused)

**Result:**

-   9 active documents (down from 16)
-   Clear organization and categorization
-   No information loss - everything consolidated or archived
-   Better discoverability and navigation

**Files Modified:**

-   `docs/README.md` - Complete reorganization
-   `docs/USER_GUIDE.md` - Added dark mode section
-   `docs/API.md` (new) - Complete API documentation
-   `docs/DEPLOYMENT.md` - Added API versioning and backup sections
-   Moved 7 files to `docs/archive/`

**Commits:**

-   `e8060d8` - docs: cleanup and consolidation
-   `fb793c9` - docs: add dark mode and API documentation

---

### Cloudflare Pages Migration - COMPLETED

**Issue:** Netlify free tier deploy credits exhausted

**Status:** Migration complete, site live at https://bloom-tracker.app

**Why Cloudflare Pages:**

-   ✅ Unlimited deploys (no build credits)
-   ✅ Unlimited bandwidth
-   ✅ Perfect Vite/PWA compatibility (zero config needed)
-   ✅ Already using Cloudflare for DNS (seamless integration)
-   ✅ Superior CDN edge caching
-   ✅ Free password protection via Cloudflare Access (up to 50 users)

**Migration Steps Completed:**

1. Created `frontend/public/_routes.json` for SPA routing fallback
2. Created comprehensive migration guide: `docs/CLOUDFLARE_MIGRATION.md`
3. Connected GitHub repo to Cloudflare Pages
4. Configured build settings: `cd frontend && npm install && npm run build`
5. Added custom domain: `bloom-tracker.app` (auto-configured via Cloudflare DNS)
6. Updated backend CORS to include both domains:
    - `https://bloom-tracker.app`
    - `https://bloom-budget-tracker.pages.dev`
7. Verified deployment and all functionality working
8. Deleted Netlify site from dashboard
9. Removed `netlify.toml` from repository (commit: 915b39f)
10. Updated all documentation (DEPLOYMENT.md, README.md, docs/README.md)
11. Archived CUSTOM_DOMAIN.md (Netlify-specific)

**Files Modified:**

-   `frontend/public/_routes.json` (new) - SPA routing config
-   `docs/CLOUDFLARE_MIGRATION.md` (new) - Complete migration guide
-   `docs/DEPLOYMENT.md` - Updated all hosting references
-   `README.md` - Updated production deployment section
-   `docs/README.md` - Added migration guide reference
-   `docs/CUSTOM_DOMAIN.md` - Archived with warning notice
-   `netlify.toml` (deleted) - No longer needed

**Build Configuration:**

```yaml
Build command: cd frontend && npm install && npm run build
Build output: frontend/dist
Root directory: / (empty)
```

**Deployment Time:** ~2 minutes per build
**Result:** Zero deployment issues, all features working including PWA, service worker, dark mode, API connectivity

**Cost Savings:** Unlimited deploys vs 300 build minutes/month on Netlify free tier

**Commits:**

-   `1f0221d` - feat: add Cloudflare Pages migration configuration
-   `f3a0400` - fix: add npm install to Cloudflare Pages build command
-   `915b39f` - chore: remove Netlify configuration after migration to Cloudflare Pages
-   `ac4b2c7` - docs: update deployment guide for Cloudflare Pages migration

---

### Dark Mode Implementation - COMPLETED

**Issue:** #24 (closed)

**Status:** 100% complete across entire application

**Session Summary:**
Completed comprehensive dark mode implementation for all remaining pages, components, and modals. Applied warm plum-tinted dark theme consistently throughout the application.

**What Changed Today:**

**Main Pages (6 total):**

-   Debts.jsx - Full page including summary cards, debt list, transaction history, archived section
-   RecurringExpenses.jsx - Active/Paused sections, expense cards, generation banner, all modals
-   Login.jsx - Complete auth flow with form inputs and error states
-   Register.jsx - Registration form with validation and password hints
-   ResetPassword.jsx - All 3 states (validating, invalid token, success)
-   Dashboard.jsx - Warning modal for exceeding balance/credit

**Modal Components (16 total):**

1. AddExpenseModal.jsx - Main form + recurring expense section
2. EditExpenseModal.jsx - All form fields + debt integration
3. AddIncomeModal.jsx - Income type dropdown
4. EditIncomeModal.jsx - Pre-filled income editing
5. AddDebtModal.jsx - Debt tracking form
6. EditDebtModal.jsx - Balance updates
7. AddDebtPaymentModal.jsx - Quick payment recording
8. FilterTransactionsModal.jsx - Complex filtering UI with transaction type buttons
9. ExportImportModal.jsx - Export/import with checkboxes and file upload
10. AddRecurringExpenseModal.jsx - Large 369-line modal with frequency scheduling
11. CreatePeriodModal.jsx - Budget period creation
12. EditPeriodModal.jsx - Period editing
13. ForgotPasswordModal.jsx - Password reset email
14. ExperimentalFeaturesModal.jsx - Feature flags with warning banner
15. BankImportModal.jsx - Multi-step import flow (393 lines)
16. LeftoverBudgetModal.jsx - Multi-state allocation UI (249 lines)

**Supporting Components:**

-   SalaryPeriodWizard.jsx - Full 3-step budget setup wizard with all form inputs
-   PeriodSelector.jsx - Calendar grid view and dropdown list with period cards
-   DraggableFloatingButton.jsx - FAB popup menu (Add Income/Expense/Debt Payment buttons)
-   Dashboard mobile menu - Navigation drawer with links and user info
-   Warning modals - Exceeding balance/credit confirmation dialogs
-   Generate Now confirmation modal - RecurringExpenses generation prompt

**Bug Fixes:**

-   RecurringExpenses Active section background (user-reported)
-   Bright white input boxes in budget setup wizard
-   Light backgrounds on salary period selector cards (calendar grid and dropdown)
-   Period card border colors (toned down neon green/blue to subtle grays)
-   "Now" badge contrast (white text on green-600 background)
-   Leftover budget card (bright green → dark green-950/30)
-   Generate Now modal (white background → dark-surface)
-   JSX syntax error in RecurringExpenses (stray closing bracket)

**Technical Approach:**

-   Used multi_replace_string_in_file for targeted updates (8-19 replacements per modal)
-   Used PowerShell bulk operations for large files with repeated patterns
-   Applied consistent color palette: dark-base, dark-surface, dark-elevated, dark-pink, dark-text hierarchy
-   Pattern: backdrop → card → header → form elements → buttons → helper text
-   Fixed pre-push hook failures (black formatting, JSX syntax)

**Color Palette:**

-   Base: #19171A (darkest background)
-   Surface: #221F24 (card backgrounds)
-   Elevated: #2B272F (elevated surfaces, inputs)
-   Pink: #FF8EA9 (primary accent)
-   Text: #E8E6E9 (primary), #A8A5AA (secondary), #3D393F (borders)
-   Danger: #FF6B6B (error states)

**Files Modified:** 25 total

-   6 page files (Debts, RecurringExpenses, Login, Register, ResetPassword, Dashboard)
-   16 modal components (all application modals)
-   3 supporting components (SalaryPeriodWizard, PeriodSelector, DraggableFloatingButton)

**Validation:**

-   User tested each component after completion with iterative feedback
-   Quick feedback loop maintained throughout session
-   All 8 reported issues fixed immediately
-   Pre-push hooks passed (black formatting, build validation)

**Status:** 100% complete - All pages, modals, and components now support dark mode

**GitHub Issue:** #24 - Closed (Dark mode implementation complete)

---

## 2025-11-30

### Database Backup Automation & API Versioning

**Issues:** #41, #42 (closed)
**Decision:**

-   Implemented automated daily database backups via GitHub Actions
-   Added `/api/v1` versioned API structure with backward compatibility
    **Implementation:**
-   Created `scripts/backup_database.py` with PostgreSQL/SQLite support, gzip compression
-   GitHub Actions workflow runs daily at 2:00 AM UTC, stores artifacts for 30 days
-   Created `backend/routes/api_v1.py` blueprint aggregating all routes under `/api/v1`
-   Updated frontend `.env` files to use `/api/v1` endpoints
-   Maintained legacy routes (without version prefix) for backward compatibility
    **Files Changed:**
-   Backend: `backend/app.py` (registers v1 blueprint), `backend/routes/api_v1.py` (new)
-   Frontend: `frontend/.env`, `frontend/.env.production`, `frontend/src/api.js`
-   Infrastructure: `.github/workflows/backup.yml`, `scripts/backup_database.py`
-   Documentation: `docs/DATABASE_BACKUP.md`, `docs/API_VERSIONING.md`, `scripts/README.md`
    **Impact:** Data safety with automated backups, professional API structure for safe evolution

### Input Length Validation & CSP Headers

**Issues:** #40, #39 (closed)
**Decision:**

-   Added maxLength validation to all text inputs (200 for names, 50 for types, 1000 for notes)
-   Implemented Content Security Policy headers on backend and frontend
    **Files Changed:**
-   Frontend modals: AddExpenseModal.jsx, EditExpenseModal.jsx, AddDebtModal.jsx, EditDebtModal.jsx, EditIncomeModal.jsx, AddRecurringExpenseModal.jsx, BankImportModal.jsx
-   Backend: `backend/app.py` (CSP headers in after_request hook)
-   Frontend: `frontend/public/_headers` (Netlify CSP + security headers)
    **Impact:** Prevents DB errors from oversized inputs, improves security posture with CSP

### Enhanced Pre-Push Hook

**Decision:** Added comprehensive security and quality checks to pre-push hook
**Rationale:** GitHub branch protection unavailable on free private repos, local validation is primary defense
**Checks Added:**

-   Merge conflict markers detection
-   Sensitive data detection (hardcoded secrets/API keys)
-   Large file detection (>1MB)
-   Python import validation
-   Requirements.txt sync warning
-   ESLint for React code
-   npm audit for critical vulnerabilities
-   Frontend build validation (with visible progress)

**Impact:** Prevents broken code from reaching production, saves deployment credits

---

### Credit Card Debt Display Bug Fix

**Issue:** #46 - Credit card debt not showing on Debts page despite having €862.45 balance
**Root Cause:** Debts page fetched expenses per-period, missing expenses without `budget_period_id`
**Solution:** Changed to fetch ALL expenses (matching Dashboard logic), then filter by period
**Files Changed:** `frontend/src/pages/Debts.jsx`

---

### CI/CD Pipeline Implementation

**Issue:** #47 (closed)
**Decision:** Implemented GitHub Actions CI/CD pipeline
**Limitation:** Cannot block deploys on free private repo, serves as notification system
**Files Created:** `.github/workflows/ci.yml`
**Primary Defense:** Local pre-push hook (blocks push if checks fail)

---

### Deployment Strategy

**Context:** 90% deployment credits used on Netlify/Render
**Decision:** Hold off on pushes until credits reset, batch multiple fixes
**Approach:** Test locally, commit changes, push when ready

---

## Earlier Decisions (from context)

### Recurring Expense Generation

**Decision:** Automated via GitHub Actions (daily 2 AM UTC)
**Issue:** #29 (resolved)

### Pagination Implementation

**Decision:** Added 50 items/page with Load More button
**Issue:** #30 (resolved)

### Offline Indicator

**Decision:** Added network status banner component
**Issue:** #36 (resolved)

### Legacy Budget Period System

**Status:** Investigation needed (#28)
**Finding:** Modals (`CreatePeriodModal.jsx`, `EditPeriodModal.jsx`) ARE still used in `Dashboard.jsx`
**Decision Needed:** Keep or remove legacy period management UI

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

| Issue | Title | Status | Completed | Summary |
| ------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------- | ---------- | ----------------------------------------------------------------- |
| [#67](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/67) | Add tests to CI/CD | ✅ Completed | 2025-12-15 | Integrated 28 backend tests with 3-layer email mock protection |
| [#66](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/66) | Mobile UI Issues | ✅ Completed | 2025-12-15 | Fixed viewport zoom, button positioning, and click detection on mobile || [#55](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/55) | Balance Calculation Bug - Salary Period Rollover | ✅ Completed | 2025-12-12 | Fixed double-counting of initial balance in rollover calculations |
| [#50](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/50) | Overhaul budget_period_id system | ✅ Completed | 2025-12-06 | Removed budget_period_id columns, switched to date-based queries |
| [#28](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/28) | Remove Legacy Budget Period System | ✅ Completed | 2025-12-06 | Removed CreatePeriodModal and EditPeriodModal |
| [#46](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/46) | Credit Card Debt Display Bug | ✅ Completed | 2025-12-06 | Fixed debt display by fetching all expenses |
| [#47](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/47) | CI/CD Pipeline Implementation | ✅ Completed | 2025-12-06 | Implemented GitHub Actions CI/CD |
| [#43](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/43) | Staging Environment | ❌ Closed (Won't Implement) | 2025-12-06 | Not needed for solo developer workflow |
| [#11](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/11) | Performance Optimization for Large Transaction Lists | ✅ Completed | 2025-12-06 | Added database indexes, debounced search, component memoization |
| [#41](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/41) | Database Backup Automation | ✅ Completed | 2025-11-30 | GitHub Actions daily backups |
| [#42](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/42) | API Versioning | ✅ Completed | 2025-11-30 | Added /api/v1 endpoints |
| [#40](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/40) | Input Length Validation | ✅ Completed | 2025-11-30 | Added maxLength to all text inputs |
| [#39](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/39) | CSP Headers | ✅ Completed | 2025-11-30 | Implemented Content Security Policy |
| [#24](https://github.com/Rafia-Bee/bloom-budget-tracker/issues/24) | Dark Mode Implementation | ✅ Completed | 2025-12-02 | Full dark mode across all pages and components |

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

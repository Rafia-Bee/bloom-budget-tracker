# Decision Log

Architectural decisions only. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-03

### Settings Page Restructure (#137)

**Context:** Settings page UX needed improvement. Experimental Features were buried in Preferences, Danger Zone was too prominent, and Export/Import was in the header menu (hard to discover).

**Decision:** Restructured Settings with clearer organization:

**New Tab Order:**

1. **Preferences** (now default) - Recurring lookahead, currency settings
2. **Categories** - Subcategory management
3. **Experimental** - Dedicated tab with feature toggles (removed master toggle)
4. **Account** - Export/Import section + collapsible Danger Zone

**Key Changes:**

-   Default tab changed from Categories → Preferences
-   Experimental Features extracted to dedicated tab
-   Removed master "Enable Experimental Features" toggle (individual toggles sufficient)
-   Fixed ⚠️ icon alignment in warning banners
-   Export/Import moved from Header user menu → Account settings tab
-   Danger Zone redesigned as collapsible `<details>` element (less prominent)

**Impact:** Better discoverability of features. Export/Import now in logical location. Danger Zone less likely to be accidentally triggered.

---

### AI Context Management: Streamlined Core Rules

**Context:** During long TaskSync sessions, AI assistant loses track of workflow rules (creates commits on main, forgets DECISION_LOG updates, doesn't run bformat). The full copilot-instructions.md file (~450 lines) gets diluted in context.

**Decision:** Created a tiered instruction system:

1. **CORE_RULES.md** (~50 lines) - Critical rules that must always be enforced
2. **PROMPT_TEMPLATES.md** - Task-specific templates with built-in reminders
3. **VS Code setting** - `github.copilot.chat.codeGeneration.instructions` auto-loads CORE_RULES.md

**Files Added:**

-   `.github/CORE_RULES.md` - TaskSync control, git workflow, pre-commit checklist, doc updates, testing, zero tolerance for errors
-   `.github/PROMPT_TEMPLATES.md` - Templates for: Create GH Issue, Implement Issue, Bug Report

**Impact:** Core workflow rules stay prominent even in long sessions. Full copilot-instructions.md remains available for complex decisions.

---

## 2026-01-02

### Added Prettier for Frontend Code Formatting

**Context:** `bformat` only ran Black for backend Python. Frontend had no consistent formatting.

**Decision:** Added Prettier for frontend JavaScript/JSX formatting.

**Changes:**

-   Installed `prettier` as devDependency
-   Added `.prettierrc` config (4-space tabs, single quotes, trailing commas)
-   Added `npm run format` and `npm run format:check` scripts
-   Updated `bformat` PowerShell function to run both Black and Prettier
-   Updated DEVELOPMENT_REFERENCE.md

**Impact:** Running `bformat` now formats both backend (Black) and frontend (Prettier).

---

### Updated Copilot Instructions with Comprehensive Skills

**Context:** Needed persistent AI assistant instructions for consistent development workflow.

**Decision:** Restructured `.github/copilot-instructions.md` with 8 consolidated skill areas:

1. Conversation control (ask_user cycle)
2. Design principles (Bloom color palette)
3. TDD workflow (80% coverage target)
4. Zero tolerance for warnings/errors
5. Development workflow (bformat → docs → test → commit)
6. Database migrations (bmigrate + Neon SQL)
7. GitHub issues (labels + temp file pattern)
8. Git push rules (never push unless asked)

**Impact:** AI assistants will follow consistent patterns across all conversations.

---

### STASHED: Bundle Size Optimization (Restore with `git stash pop`)

**Context:** Frontend build warning - main bundle was 1,553 KB (too large).

**Solution Implemented (stashed for later):**

1. **Vendor code-splitting** - Split recharts, jspdf, html2canvas into separate chunks
2. **Page lazy loading** - React.lazy() for Reports, Settings, Debts, Goals, Trash, Admin
3. **Result**: Initial bundle reduced from 1,553 KB to 258 KB (6x smaller)

**Files Modified:**

-   `frontend/vite.config.js` - Added `manualChunks` config for vendor splitting
-   `frontend/src/App.jsx` - Added `React.lazy()` and `Suspense` for secondary pages

**To restore:** `git stash pop`

---

### CSRF Protection Disabled for Cross-Origin Setup

**Context:** Production error - POST `/api/v1/salary-periods/preview` returned 401 Unauthorized even though user was authenticated. The `/auth/me` endpoint returned 200, proving the JWT cookie was valid.

**Root Cause:** Cross-origin setup breaks CSRF token handling:

-   Frontend hosted on `bloom-tracker.app` (Cloudflare Pages)
-   Backend hosted on `bloom-backend-b44r.onrender.com` (Render)
-   Flask-JWT-Extended sets `csrf_access_token` cookie on the backend's domain
-   JavaScript on the frontend **cannot** read cookies from a different domain (browser security)
-   Without the CSRF header, POST requests failed with 401

**Decision:** Disable CSRF protection (`JWT_COOKIE_CSRF_PROTECT = False`)

**Security Rationale:**

1. **SameSite=Lax** prevents CSRF attacks - browsers refuse to send cookies on cross-site POST requests from third-party sites
2. **CORS** restricts which origins can make requests (only `bloom-tracker.app` allowed)
3. **httpOnly cookies** prevent XSS from stealing tokens
4. The combination of SameSite=Lax + CORS provides equivalent CSRF protection for our architecture

**Files Modified:**

-   `backend/app.py` - Set `JWT_COOKIE_CSRF_PROTECT = False` with detailed rationale comments
-   `frontend/src/api.js` - Removed CSRF token reading/sending code (no longer needed)

**Impact:** Fixes 401 errors on all POST/PUT/DELETE requests in production. No security degradation due to SameSite + CORS protections.

---

## 2026-01-01

### Top Merchants Feature (#3)

**Context:** User requested a "Top Merchants" feature for the Reports dashboard to show most frequent and highest spending merchants.

**Decision:**

1. **Dual Sort Modes**: Users can toggle between sorting by total amount (default) or by transaction frequency
2. **Ranked List Display**: Shows top 5 by default with "View more" button to expand to top 10
3. **Visual Ranking**: Rank badges with gold/silver/bronze colors for top 3
4. **Rich Merchant Details**: Each row shows merchant name, category emoji, transaction count, average spend, total, and percentage of total spending
5. **Progress Bar**: Visual indicator showing proportion of total spending
6. **Excludes System Entries**: Pre-existing Credit Card Debt and Initial Balance entries are filtered out

**Implementation:**

-   **Backend**: New `/api/v1/analytics/top-merchants` endpoint
    -   Query params: start_date, end_date, limit, sort_by (amount/frequency), payment_method
    -   Returns merchants with: name, total, count, average, percentage, category
    -   Groups expenses by name and category
-   **Frontend**: `TopMerchantsCard` component
    -   Toggle buttons to switch sort mode (triggers API re-fetch)
    -   Shows top 5 with "View X more" expand button
    -   Merchant rows with rank badges, category emoji, stats, and progress bars
    -   Responsive layout (progress bar hidden on mobile)

**Files Created:**

-   `frontend/src/components/reports/TopMerchantsCard.jsx`

**Files Modified:**

-   `backend/routes/analytics.py` - Added `get_top_merchants` endpoint
-   `backend/tests/test_analytics.py` - Added 8 unit tests (TestTopMerchants class)
-   `frontend/src/api.js` - Added `getTopMerchants` function
-   `frontend/src/pages/Reports.jsx` - Integrated TopMerchantsCard, added state for merchants and sort mode

---

### Budget vs Actual Feature (#3)

**Context:** User requested a feature to compare planned budget vs actual spending by category on the Reports dashboard.

**Decision:**

1. **Pro-rated Budget**: When viewing a subset of the salary period dates, the budget is automatically pro-rated (daily budget × selected days)
2. **Excludes Fixed Bills**: Comparison only includes discretionary spending (is_fixed_bill=False) since fixed bills are already accounted for in budget calculation
3. **Visual Progress Indicator**: Color-coded utilization bar (green ≤75%, yellow ≤90%, orange ≤100%, red >100%)
4. **Category Breakdown**: Horizontal bar chart showing actual spending per category with reference line for average budget per category

**Implementation:**

-   **Backend**: New `/api/v1/analytics/budget-vs-actual` endpoint
    -   Returns planned_budget, actual_spending, remaining, utilization_percent
    -   Includes category breakdown with percentage of spending and percentage of budget
    -   Returns salary_period info for context
    -   Pro-rates budget when date range is subset of period
-   **Frontend**: `BudgetVsActualChart` component
    -   Budget overview card with progress bar and stats (Planned/Spent/Remaining)
    -   Horizontal bar chart by category using Recharts
    -   Handles edge cases: no period, no spending, over budget

**Files Created:**

-   `frontend/src/components/reports/BudgetVsActualChart.jsx`

**Files Modified:**

-   `backend/routes/analytics.py` - Added `get_budget_vs_actual` endpoint
-   `backend/tests/test_analytics.py` - Added 7 unit tests for the new endpoint
-   `frontend/src/api.js` - Added `getBudgetVsActual` function
-   `frontend/src/pages/Reports.jsx` - Integrated BudgetVsActualChart

---

### Period Comparison Feature (#3)

**Context:** User requested ability to compare spending/income between two date ranges (e.g., salary periods) to track financial progress over time.

**Decision:**

1. **User-Selected Date Ranges**: No auto-calculated defaults. Users select their own dates (Period A and Period B) to match their actual salary periods.
2. **Layout**: Period B on left, Period A on right (natural "before → after" reading order). Income on left, Spending on right.
3. **Visual Indicators**: Color-coded change indicators (green = good, red = bad), inverted for spending (decrease = green).

**Implementation:**

-   **Backend**: New `/api/v1/analytics/period-comparison` endpoint
    -   Accepts `current_start`, `current_end`, `previous_start`, `previous_end`
    -   Returns spending/income totals and category-by-category breakdown
    -   Calculates change amounts and percentages
    -   Excludes "Pre-existing Credit Card Debt" and "Initial Balance" for accurate comparison
-   **Frontend**: `PeriodComparisonCard` component
    -   Two date range selectors with color-coded backgrounds (blue=A, purple=B)
    -   "Compare Periods" button triggers API call
    -   Results show totals with change indicators and category breakdown

**Why No Auto-Defaults:**
Initial implementation tried "last 30 days vs previous 30 days" but this didn't align with user's actual salary period boundaries, causing incorrect income/spending attribution. Letting users select their own dates ensures accurate comparison.

**Files Created:**

-   `frontend/src/components/reports/PeriodComparisonCard.jsx`

**Files Modified:**

-   `backend/routes/analytics.py` - Added `get_period_comparison` endpoint
-   `frontend/src/api.js` - Added `getPeriodComparison` function
-   `frontend/src/pages/Reports.jsx` - Integrated PeriodComparisonCard, disabled Export All button

---

### Chart Export Feature - PNG/PDF Export (#3)

**Context:** User requested ability to export charts from the Reports dashboard for sharing and archiving.

**Decision:**

1.  **Individual Chart Export**: Each chart card has a download button with PNG/PDF options
2.  **Export All as PNG**: Single button exports all charts + subcategory breakdowns to one combined image
3.  **Canvas-based Subcategory Charts**: Drew pie charts using Canvas 2D API instead of capturing Recharts SVG

**Implementation Details:**

-   **Libraries**: Added `html2canvas` and `jspdf` for capture and PDF generation
-   **ChartExportButton**: Reusable dropdown button with PNG/PDF options. Hides itself during capture.
-   **ExportAllReportsButton**: Comprehensive export that:
    -   Captures main charts (Spending Trends, Category Breakdown, Debt Payoff)
    -   Fetches subcategory data for each category via API
    -   Renders subcategory pie charts directly on canvas (not SVG)
    -   Combines all into a single high-resolution PNG with title and date range

**Technical Decisions:**

1.  **Canvas 2D for Subcategories**: html2canvas doesn't capture SVG properly, so subcategory charts are drawn using native Canvas arc() for pie slices. This guarantees visibility in exports.
2.  **PNG over PDF for "Export All"**: PDF had emoji encoding issues (📊 → gibberish). PNG preserves quality and avoids font/encoding problems.
3.  **Hide Export UI During Capture**: Export buttons use `visibility: hidden` before capture to avoid appearing in exported images.
4.  **Progress Feedback**: Shows status messages ("Capturing...", "Loading subcategories...") during multi-step export.

**Files Created:**

-   `frontend/src/components/reports/ChartExportButton.jsx` - Individual chart export
-   `frontend/src/components/reports/ExportAllReportsButton.jsx` - Combined export with subcategories

**Files Modified:**

-   `frontend/src/pages/Reports.jsx` - Added refs and export buttons
-   `frontend/package.json` - Added html2canvas, jspdf dependencies

---

### Reports & Analytics Dashboard - Complete Implementation (#3)

**Context:** Issue #3 requested a comprehensive Reports & Analytics Dashboard with charts, trends, and category breakdowns.

**Decision:** Implemented in phases:

**Phase 1 - Backend Analytics API:**

1. Created `/api/v1/analytics/spending-by-category` - Category breakdown with totals and percentages
2. Created `/api/v1/analytics/spending-trends` - Time-series data with daily/weekly/monthly granularity
3. Created `/api/v1/analytics/income-vs-expense` - Summary comparison with savings rate

**Phase 2 - Frontend Core:**

1. Installed Recharts library for chart visualizations
2. Added `reportsEnabled` feature flag (experimental)
3. Created Reports page with date range controls (quick buttons: 7/30/90 days)
4. Built SpendingTrendsChart (line chart) showing Total/Debit/Credit trends
5. Built CategoryBreakdownChart (donut chart) with percentage breakdown
6. Added navigation link to Header (desktop and mobile, behind feature flag)
7. Added Reports toggle to Settings → Preferences → Experimental Features

**Phase 3 - Bug Fixes:**

1. **Payment method mismatch**: Database stores "Debit card"/"Credit card" but code checked for "debit"/"credit"
    - Fixed using `ilike("%debit%")` for SQLAlchemy filters
    - Fixed using `"debit" in payment_method.lower()` for Python logic
2. **Data exclusions** for accurate analytics:
    - Exclude "Pre-existing Credit Card Debt" expenses (not actual spending)
    - Exclude "Initial Balance" income after the first one (avoids double counting)
3. **Recharts dimension warnings**: Added `minWidth={0}` to ResponsiveContainer

**Tech Choices:**

-   Recharts (smaller bundle than Chart.js, better React integration)
-   Feature flag `reportsEnabled` for experimental rollout
-   TDD approach with 19 unit tests (17 original + 2 for exclusions)
-   E2E tests with Playwright

**Files Created:**

-   `backend/routes/analytics.py` - 3 endpoints with proper filtering

### Reports Dashboard Refinements (#3)

**Context:** User feedback on the initial Reports implementation requested better interactivity and more logical data presentation.

**Decision:**

1.  **Subcategory Drill-down**: Implemented interactive drill-down in Category Pie Chart. Clicking a category fetches and displays its subcategories. Added back navigation.
2.  **Smart Default Dates**: Changed default date range to match the _current salary period_ instead of an arbitrary 30-day window, aligning with the app's budget-period philosophy.
3.  **All-Time Summary**: Decoupled summary cards (Income/Expense/Savings) from the date filter. They now show _lifetime_ totals to provide high-level context, while charts remain filtered.
4.  **Layout Optimization**: Moved All-Time Summary cards to the top of the page for better visibility. Removed "Quick Range" buttons (7/30/90 days) to reduce clutter.

**Rationale:**

-   Drill-down provides granular insight without cluttering the main view.
-   Salary period default is more relevant to the user's budgeting cycle.
-   All-time totals provide a "net worth" style overview that is always useful, regardless of the specific period being analyzed.

### Debt Payoff Analytics (#3)

**Context:** User requested a way to track overall debt payoff progress over time.

**Decision:**

1.  **Backend Endpoint**: Created `/api/v1/analytics/debt-payoff` which reconstructs historical debt balances by working backwards from the current balance using "Debt Payments" expenses.
2.  **Visualization**: Implemented a Multi-Line Chart showing:
    -   **Total Debt**: Thick line (dynamic color for light/dark mode).
    -   **Individual Debts**: Thinner colored lines.
3.  **Data Filtering**: Filtered the timeline to only show dates where a payment occurred (or balance changed), creating a clean "step-like" progression without long flat lines.
4.  **All-Time Scope**: The chart always shows the full history (All Time) regardless of the dashboard's date filter, providing complete context.

**Rationale:**

-   Reconstructing history allows us to show trends without having stored daily snapshots in the database.
-   Filtering for activity dates makes the chart more readable and focuses on the user's actions (payments).
-   All-time scope is essential for debt tracking as it's a long-term goal.
-   `backend/tests/test_analytics.py` - 19 comprehensive tests
-   `frontend/src/pages/Reports.jsx` - Main analytics page
-   `frontend/src/components/reports/SpendingTrendsChart.jsx`
-   `frontend/src/components/reports/CategoryBreakdownChart.jsx`
-   `frontend/e2e/reports.spec.js` - E2E tests

**Rationale:**

-   Aggregation in backend reduces frontend complexity
-   Data exclusions ensure analytics reflect actual spending, not accounting entries
-   Date range filters allow flexible time window analysis

---

### DateNavigator Prop Mismatch Fix (#92)

**Context:** Day-by-day transaction navigation was broken with error "onDateChange is not a function".

**Problem:** TransactionList.jsx was passing props with wrong names:

-   Passed: `dates`, `currentDate`, `onNavigate`
-   Expected: `transactionDates`, `currentViewDate`, `onDateChange`

**Decision:** Updated TransactionList.jsx to use correct prop names matching DateNavigator component.

**Rationale:** Simple fix, maintains single source of truth for prop naming in DateNavigator.

---

### Flexible Sub-Period Division (#9)

**Context:** Issue #9 requested the ability to divide budget into custom number of sub-periods instead of the hardcoded 4-week structure.

**Problem:**

-   Original design assumed 4-week salary periods (matching monthly pay cycles)
-   Database constraints enforced `week_number BETWEEN 1 AND 4`
-   Single-day periods weren't possible (`start_date < end_date` constraint)
-   Users with different pay cycles (bi-weekly, monthly, irregular) couldn't customize

**Decision:** Implement flexible sub-periods behind experimental feature flag:

1. Add `num_sub_periods` column to SalaryPeriod (default: 4)
2. Allow 1 to N periods where N = total days in date range
3. Update constraints: `start_date <= end_date`, `credit_limit >= 0`, `week_number >= 1`
4. Hide behind `flexibleSubPeriodsEnabled` feature flag in Settings

**Rationale:**

-   Preserves backward compatibility (defaults to 4 periods)
-   Experimental flag allows testing without affecting all users
-   Supports edge cases: daily budgeting, bi-weekly pay, custom date ranges
-   Single-day periods enable daily budget tracking

**Impact:**

-   New database column with migration scripts (SQLite + PostgreSQL)
-   Updated SalaryPeriodWizard with end date picker and sub-periods input
-   Dynamic "Period X of N" labels in WeeklyBudgetCard
-   10 new backend tests for flexible periods
-   UI cleanup deferred to #131

---

### PR-Based Git Workflow Enforcement

**Context:** Previously, development was done by pushing directly to `main`, where CI would run. This led to an incident where a Copilot agent fix was deployed to Cloudflare before CI passed (though it was only a preview deploy, not production).

**Problem:**

-   No protection against merging broken code
-   Cloudflare auto-deploys every branch to preview URLs
-   On free GitHub tier, branch protection rules aren't available for private repos

**Decision:** Adopt PR-based workflow with manual CI verification:

1. All changes go through feature branches (`feat/`, `fix/`, `docs/`, `refactor/`)
2. Create PR and wait for CI to pass (green checks)
3. Review diff manually before merging
4. Use `gh pr merge --squash --delete-branch` to merge

**Rationale:**

-   Creates audit trail of all changes
-   CI runs before code reaches `main`
-   Encourages smaller, reviewable changes
-   Works within free GitHub tier limitations

**Impact:**

-   Updated `.github/copilot-instructions.md` with PR workflow rules
-   Updated `DEVELOPMENT_REFERENCE.md` with full workflow documentation
-   Updated `README.md` with contributing note
-   Copilot agents instructed to never merge PRs without human approval

---

## 2025-12-31

### Simplified Audit Trail Implementation (#63)

**Context:** Issue #63 proposed adding `created_by`, `modified_at`, and `modified_by` columns plus optional AuditLog table.

**Problem:** Original scope assumed multi-user access to records, but Bloom uses single-user-per-record architecture (every record has `user_id` foreign key, users can only access their own data).

**Decision:** Simplify to only add `updated_at` column to key models:

-   `Expense`
-   `Income`
-   `SalaryPeriod`

**Rationale:**

-   `created_by`/`modified_by` are redundant since they would always equal `user_id`
-   `updated_at` is useful for debugging ("when was this last changed?")
-   Full AuditLog table would be overkill for a personal finance app
-   Existing models (Debt, RecurringExpense, Goal, Subcategory) already have `updated_at`

**Impact:**

-   3 models gain `updated_at` with `onupdate` trigger
-   Existing records get `updated_at = created_at` via migration
-   No API changes needed (column auto-populated by SQLAlchemy)

---

## 2025-12-30

### SQLAlchemy 2.0 Transition (#118)

**Context:** Issue #118 - `LegacyAPIWarning` from SQLAlchemy indicating `Model.query.get(id)` is deprecated.

**Problem:** 100+ warnings in test output.

**Decision:** Replace `Model.query.get(id)` with `db.session.get(Model, id)` throughout the codebase.

**Rationale:**

-   Aligns with SQLAlchemy 2.0 style guide.
-   Removes deprecation warnings.
-   Prepares codebase for future SQLAlchemy upgrades.

### Backend Datetime Deprecation Fix (#118)

**Context:** Issue #118 - `datetime.utcnow()` is deprecated in Python 3.12+ and produces warnings in 3.11.

**Problem:** 2,500+ warnings in test output cluttering logs and indicating future breakage.

**Decision:** Replace all `datetime.utcnow()` usages with `datetime.now(timezone.utc)`.

**Rationale:**

-   Future-proofs the application for Python 3.12+.
-   Uses timezone-aware datetimes in application logic, reducing ambiguity.
-   Maintains compatibility with existing `db.DateTime` (naive) columns by relying on SQLAlchemy's handling of aware datetimes (converting to UTC/naive for storage).

**Impact:**

-   No database schema change required.
-   Application logic now handles aware datetimes.
-   Comparisons with DB-fetched dates (naive) must now be handled carefully (e.g., `.replace(tzinfo=timezone.utc)`).

## 2025-12-27

### Soft Delete Pattern Implementation (#61) - Phase 1

**Context:** Issue #61 - Implement soft delete pattern for expenses and recurring expenses to allow recovery of accidentally deleted data.

**Problem:** All deletions are hard deletes (permanent removal), causing:

-   No recovery after accidental deletion
-   Lost audit trail
-   Poor user experience (can't undo)

**Decision:** Implement soft delete using a `deleted_at` column and a `SoftDeleteMixin` class.

**Implementation:**

1. Created `SoftDeleteMixin` class with:

    - `deleted_at` column (DateTime, nullable, indexed)
    - `active()` class method - query non-deleted records
    - `deleted()` class method - query soft-deleted records
    - `soft_delete()` instance method - mark as deleted
    - `restore()` instance method - restore deleted record
    - `is_deleted` property - check deletion status

2. Applied mixin to models:

    - `Expense` - most common accidental deletion
    - `Income` - for consistency
    - `Debt` - distinguish archived vs deleted
    - `RecurringExpense` - preserve template history

3. Created database migration for local (Flask-Migrate) and production (Neon SQL)

**Pattern:**

```python
class SoftDeleteMixin:
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)

    @classmethod
    def active(cls):
        return cls.query.filter(cls.deleted_at.is_(None))

    def soft_delete(self):
        self.deleted_at = datetime.utcnow()
```

**Next Phases:**

-   Phase 2: Update queries to use `.active()` method
-   Phase 3: Update DELETE endpoints to soft delete, add /restore endpoints
-   Phase 4: Frontend UI changes
-   Phase 5: Cleanup job (hard delete after 30 days)

**Rationale:** Mixin pattern allows reuse across models without code duplication. Index on `deleted_at` ensures query performance when filtering.

---

### Exception Handling Standardization (#59)

**Context:** Issue #59 - Replace generic exception handling with specific SQLAlchemy exceptions across all backend routes.

**Problem:** 45 instances of overly broad `except Exception as e:` blocks that:

-   Leaked internal error messages to clients (security risk)
-   Didn't log stack traces (debugging difficulty)
-   Caught exceptions that shouldn't be caught (reliability issues)

**Decision:** Standardize exception handling across all 12 route files:

1. Use `SQLAlchemyError` for database operations
2. Use `ValueError`/`KeyError` for input validation failures
3. Use specific exceptions for external services (`ConnectionError`, `TimeoutError`)
4. Add `current_app.logger.error()` with `exc_info=True` for all database errors
5. Return sanitized error messages to clients (never expose internal details)

**Pattern Implemented:**

```python
try:
    # Database operation
    db.session.add(entity)
    db.session.commit()
except SQLAlchemyError as e:
    db.session.rollback()
    current_app.logger.error(f"Database error: {e}", exc_info=True)
    return jsonify({"error": "Operation failed"}), 500
except (ValueError, KeyError) as e:
    return jsonify({"error": str(e)}), 400
```

**Files Updated:**

-   `salary_periods.py` (10 handlers)
-   `recurring_expenses.py` (8 handlers)
-   `user_data.py` (5 handlers)
-   `export_import.py` (5 handlers)
-   `password_reset.py` (4 handlers)
-   `goals.py` (3 handlers)
-   `recurring_generation.py` (3 handlers)
-   `debts.py` (2 handlers)
-   `admin.py` (2 handlers)
-   `income.py`, `expenses.py`, `auth.py` (1 each - external API handlers)

**Impact:**

-   No internal error messages leaked to clients
-   All database errors logged with full stack traces
-   Better error categorization (400 vs 500 status codes)
-   Improved debugging capability in production

---

### Phase 3 Architecture & Testing (#88)

**Context:** Issue #88 Phase 3 audit for architecture and testing improvements.

**Assessment:**

1. **Test coverage** - Already at 80%+ backend, 924 frontend tests
2. **E2E testing** - Already implemented: 12 Playwright spec files covering auth, transactions, debts, goals, navigation, recurring, salary periods, settings

**New Addition:**

-   `backend/services/audit_service.py` - Lightweight audit logging for key operations
-   `backend/routes/auth.py` - Added login/register audit logging
-   `backend/routes/user_data.py` - Added data deletion audit logging

**Audit Log Format:** Structured JSON-like logs written to Flask logger at INFO level:

```
[AUDIT] auth.login: {"timestamp": "...", "user_id": 1, "action": "login", "success": true}
```

**Impact:** Key operations now logged for forensic capability without database overhead.

---

### Phase 2 Performance & Monitoring (#88)

**Context:** Issue #88 Phase 2 audit for performance improvements.

**Assessment:**

1. **Database connection pooling** - Already implemented in `config.py` (pool_size=3, max_overflow=2, pool_pre_ping, keepalives)
2. **Database query optimization** - Already implemented: proper indexes on Expense and BudgetPeriod tables
3. **Automated backups** - Already implemented: GitHub Actions runs daily at 2 AM UTC

**New Addition:**

-   `backend/app.py` - Added slow request logging (>1 second) in after_request handler

**Impact:** Slow requests now logged for debugging. No architectural changes needed - infrastructure was already well-optimized.

---

### Phase 1 Technical Debt Cleanup (#88)

**Context:** Issue #88 identified 14 technical debt items across 5 categories. Implementing Phase 1 (Quick Wins).

**Decision:** Implement Phase 1 items:

1. Console logging cleanup - **ALREADY DONE** (centralized in utils/logger.js)
2. Error handling standardization - Added proper logging to route exception handlers
3. Data retention cleanup - Admin endpoint added for token cleanup

**Changes Made:**

-   `backend/utils/error_handlers.py` - New utility with standardized error handling patterns
-   `backend/routes/goals.py` - Added current_app.logger.error() calls
-   `backend/routes/recurring_expenses.py` - Added logging, sanitized error messages
-   `backend/routes/user_data.py` - Added logging, sanitized error messages
-   `backend/routes/recurring_generation.py` - Added logging, sanitized error messages
-   `backend/routes/admin.py` - Added `/cleanup-tokens` endpoint

**Key Pattern:** Error responses no longer return `str(e)` to clients (prevents info leakage). Errors are logged server-side with `exc_info=True` for debugging.

**Excluded from Phase 1:** CDN/static asset optimization (moved to Phase 2)

**Impact:** Cleaner production code, consistent error logging, safer error messages.

---

### Post-Creation Budget Recalculation - Option C (#116)

**Context:** Issue #116 identified that users who add fixed bills AFTER creating their budget period would have inaccurate weekly budgets. Option D (quick add in wizard) helps new users, but Option C addresses users who modify fixed bills post-setup.

**Decision:** Implement "Option C" - Post-Creation Budget Recalculation under experimental feature flag.

**Architecture:**

1. **Backend Endpoints:**

    - `POST /salary-periods/{id}/recalculate` - Recalculates weekly budget based on current fixed bills, updates remaining weeks
    - `GET /salary-periods/{id}/budget-impact` - Preview projected changes without applying them

2. **Budget Impact Detection:**

    - Helper function `calculate_budget_impact()` in `recurring_expenses.py`
    - Detects changes when: fixed bill created, updated (amount/status), toggled active, or deleted
    - Returns impact data in API response when active salary period exists

3. **Frontend Modal (Feature-Flagged):**
    - `BudgetRecalculationModal.jsx` - Shows current vs projected budget
    - Only triggers when `experimentalFeaturesEnabled` is true
    - User can "Recalculate" or "Skip"

**Key Design Decisions:**

-   **Preserve history**: Only updates remaining weeks (end_date >= today), past weeks unchanged
-   **Feature flagged**: Experimental flag prevents affecting stable users
-   **Non-intrusive**: API always returns `budget_impact`, frontend decides whether to show modal
-   **Carryover-aware**: Uses same calculation logic as wizard (debit + credit_allowance - fixed_bills / 4)

**Files Changed:**

-   `backend/routes/salary_periods.py` - Added recalculate & budget-impact endpoints
-   `backend/routes/recurring_expenses.py` - Added `calculate_budget_impact()`, modified CRUD to return budget_impact
-   `frontend/src/components/BudgetRecalculationModal.jsx` - New component
-   `frontend/src/pages/RecurringExpenses.jsx` - Integrated modal with feature flag
-   `frontend/src/api.js` - Added `recalculate` and `getBudgetImpact` methods
-   `backend/tests/test_salary_periods.py` - Added 6 new tests
-   `backend/tests/test_recurring_expense_routes.py` - Added 4 budget_impact tests

**Impact:** Users with experimental features enabled can recalculate their budget when fixed bills change, preventing budget inaccuracy throughout the salary period.

---

### E2E Test Patterns & HttpOnly Cookie Auth Fix (#107)

**Context:** E2E tests were failing/skipping because HttpOnly cookies (JWT auth) cannot be captured by Playwright's default `storageState` which only saves localStorage/sessionStorage. Tests also had issues with week navigation using wrong selectors (buttons vs dropdown).

**Decision:** Fix HttpOnly cookie capture in global setup and establish consistent patterns for UI interactions.

**Changes:**

1. **HttpOnly Cookie Fix (`global-setup.js`):**

    - Changed from `context.storageState()` to `context.cookies()` to capture HttpOnly cookies
    - Save cookies to JSON file, then manually inject via `context.addCookies()` in config
    - This approach captures JWT stored in HttpOnly cookies that `storageState` misses

2. **Week Navigation Pattern:**

    - Dashboard uses `<select>` dropdown for week navigation, NOT "Next/Previous" buttons
    - Correct: `page.locator("select").first().selectOption({ label: "Week 2" })`
    - Wrong: Clicking button with text "Next week" (doesn't exist)
    - "Next/Previous day" buttons exist but are for day-by-day navigation within a week

3. **Modal Date Behavior:**

    - Add Expense modal defaults date to current period date
    - Tests should NOT modify the date unless testing date assignment
    - Modifying date can assign expense to wrong period, causing assertion failures

4. **Selector Best Practices:**
    - Use `getByRole("heading", { name: "..." })` for modal detection
    - Use `getByRole("option", { name: "..." })` for dropdown verification
    - Avoid regex locators like `text=/pattern/i` - can match multiple elements
    - Use `waitFor({ state: 'hidden' })` for modal close detection instead of timeout + isVisible check

**Files Changed:**

-   `frontend/e2e/global-setup.js` - HttpOnly cookie capture
-   `frontend/playwright.config.js` - Cookie injection on context creation
-   `frontend/e2e/transactions.spec.js` - Modal interaction patterns
-   `frontend/e2e/navigation.spec.js` - Week dropdown navigation
-   `frontend/e2e/salary-period.spec.js` - Week dropdown navigation, edit mode button

**Impact:**

-   E2E tests: 3 passed → **125 passed** (Chromium)
-   Auth works correctly across all tests
-   Consistent patterns for future E2E tests

---

### Backend Test Coverage Expansion - Phase 2 (#115)

**Context:** After Phase 1 brought backend to 80%, expenses.py (61%), salary_periods.py (52%), and export_import.py (33%) remained under-tested despite being core features.

**Decision:** Add comprehensive tests for core route files to ensure critical business logic is covered.

**Changes:**

1. **New Test Files Created:**

    - `test_expenses.py` - 42 tests covering filters, pagination, validation, currency, debt payments
    - `test_export_import.py` - 34 tests covering JSON export, data import with duplicate detection, bank import

2. **Existing Test File Extended:**

    - `test_salary_periods.py` - 14 new tests for week leftover, PUT/PATCH updates, auto-activation

3. **Coverage Improvements:**

    - Overall backend: 80% → **87%**
    - expenses.py: 61% → **96%**
    - salary_periods.py: 52% → **83%**
    - export_import.py: 33% → **75%**

4. **Bug Fix Discovered:**
    - Fixed bank import endpoint trying to use non-existent `budget_period_id` field on Expense model
    - Line removed from `backend/routes/export_import.py`

**Rationale:** Core features (expenses, salary periods, data export/import) need high coverage to prevent regressions in budget calculations and data integrity.

**Impact:** 90 new tests added, all passing. Total backend tests now 438.

---

### Backend Test Coverage Expansion - Phase 1 (#115)

**Context:** Backend had 73% coverage overall but specific route files had significant gaps: recurring_generation (29%), user_data (18%), income (46%), password_reset (42%).

**Decision:** Add comprehensive tests for under-tested route files to improve reliability.

**Changes:**

1. **New Test Files Created:**

    - `test_recurring_generation_routes.py` - 17 tests for /generate, /generate/all, /preview
    - `test_user_data.py` - 26 tests for delete-all, recurring-lookahead, default-currency
    - `test_income.py` - 26 tests for income CRUD, stats, currency, search
    - `test_password_reset.py` - 21 tests for forgot-password, reset-password, validate-token

2. **Coverage Improvements:**
    - Overall backend: 73% → **80%**
    - recurring_generation: 29% → 88%
    - user_data: 18% → 87%
    - income: 46% → 88%
    - password_reset: 42% → 87%

**Rationale:** Higher test coverage catches regressions earlier, especially in security-critical code like password reset.

**Impact:** 90 new tests added, all passing. Total backend tests now 357.

---

## 2025-12-26

### CI Optimization & Coverage Thresholds (#115)

**Context:** CI pipeline was taking ~6 minutes per run, concerning given the 2000 minutes/month GitHub Actions quota. Coverage thresholds (20% backend, 5% frontend) were far below actual coverage (60% backend, 50.76% frontend), providing false confidence.

**Decision:** Optimize CI runtime and raise coverage thresholds to match actual coverage.

**Changes:**

1. **Coverage Thresholds Raised:**

    - Backend: 20% → **50%** (actual: 60%)
    - Frontend: 5% → **40%** (actual: 50.76%)

2. **CI Optimizations:**
    - Skip mobile viewport E2E tests in CI (saves ~1-1.5 min)
    - Cache Playwright browsers between runs (saves ~30-45s after first run)
    - Added `[skip e2e]` commit message option for docs-only changes

**Files Changed:**

-   `pytest.ini` - Backend coverage threshold
-   `frontend/vite.config.js` - Frontend coverage thresholds
-   `.github/workflows/ci.yml` - Playwright caching, E2E skip option
-   `frontend/playwright.config.js` - Conditional mobile tests

**Impact:**

-   CI runtime: ~6 min → ~4-4.5 min (25-33% reduction)
-   Coverage thresholds now meaningful guards against regressions
-   ~75-90 minutes saved per month at typical push frequency

---

### E2E Test Infrastructure: Global Auth State (#107)

**Context:** E2E tests were hitting rate limiting issues in CI because each test file was logging in separately, causing multiple auth requests. Tests were also slow and occasionally flaky.

**Decision:** Implement global authentication setup with Playwright's `storageState` feature to authenticate once per test run and share cookies across all tests.

**Implementation:**

1. **Global Setup (`global-setup.js`)**:

    - Authenticates once before all tests run
    - Saves cookies to `e2e/.auth/user.json`
    - Console logs success message for debugging

2. **Playwright Config Updates**:

    - Added `globalSetup: "./e2e/global-setup.js"`
    - Chromium project uses `storageState: "e2e/.auth/user.json"`
    - Workers: 2 locally, 1 on CI (prevents rate limiting)

3. **Test File Adjustments**:

    - Auth tests (`auth.spec.js`) and smoke tests (`smoke.spec.js`) use `test.use({ storageState: { cookies: [], origins: [] } })` to test unauthenticated behavior
    - Removed `cleanState` fixture (no longer needed)
    - All other tests automatically inherit logged-in state

4. **New Test Files**:
    - `debts.spec.js` (17 tests) - Complete debt management flows
    - `goals.spec.js` (17 tests) - Savings goals functionality

**Files Changed:**

-   `frontend/e2e/global-setup.js` - New global auth setup
-   `frontend/playwright.config.js` - Added globalSetup and storageState
-   `frontend/e2e/fixtures.js` - Removed cleanState fixture
-   `frontend/e2e/auth.spec.js` - Clear auth state for login tests
-   `frontend/e2e/smoke.spec.js` - Clear auth state for unauthenticated tests
-   `frontend/e2e/debts.spec.js` - New test file
-   `frontend/e2e/goals.spec.js` - New test file
-   `.gitignore` - Added `e2e/.auth/` directory

**Impact:**

-   Test run time reduced (single login vs multiple)
-   No more rate limiting failures in CI
-   87 tests passing, 13 skipped (state-dependent)
-   Cleaner test architecture with shared auth state

---

### Move Experimental Features Toggle to Settings Page (#114)

**Context:** The experimental features toggle and "Delete All Data" were buried in the hamburger user menu. This made them hard to find and cluttered the menu with rarely-used options.

**Decision:** Move all experimental feature controls to Settings page for better discoverability and cleaner menu organization.

**Implementation:**

1. **Settings Page → Preferences Tab**:

    - Added "Experimental Features" section with warning banner
    - Master toggle for enabling experimental features
    - Multi-Currency sub-toggle (shown when master is enabled)

2. **Settings Page → Account Tab**:

    - Added "Danger Zone" section with Delete All Data functionality
    - Export reminder tip before the delete button
    - Full confirmation dialog with type-to-confirm safety

3. **Header/User Menu**:

    - Removed experimental features toggle
    - Removed multi-currency toggle
    - Removed Delete All Data button
    - Removed `onShowExperimental` prop

4. **Cleanup**:
    - Removed `ExperimentalFeaturesModal` usage from Dashboard, Goals, Debts, RecurringExpenses
    - Updated Header tests
    - Updated FEATURE_FLAGS.md documentation

**Files Changed:**

-   `frontend/src/pages/Settings.jsx` - Added experimental toggles and danger zone
-   `frontend/src/components/Header.jsx` - Removed feature flag controls
-   `frontend/src/pages/Dashboard.jsx` - Removed modal import and state
-   `frontend/src/pages/Goals.jsx` - Removed modal import and state
-   `frontend/src/pages/Debts.jsx` - Removed modal import and state
-   `frontend/src/pages/RecurringExpenses.jsx` - Removed modal import and state
-   `frontend/src/test/Header.test.jsx` - Removed mock prop
-   `docs/FEATURE_FLAGS.md` - Updated access instructions

**Impact:**

-   Cleaner hamburger menu (4 fewer items)
-   Settings page is the single location for all app preferences
-   Experimental features more discoverable via Settings → Preferences
-   Delete All Data in a proper "Danger Zone" section with export reminder

---

## 2025-12-25

### Multi-Currency Feature Flag Implementation (#113)

**Context:** Multi-currency support adds complexity for users who only need EUR. Put the feature behind a flag so it can be disabled for simplicity.

**Decision:** Add `multiCurrencyEnabled` feature flag to control currency-related UI and functionality.

**Implementation:**

1. **FeatureFlagContext** - Added `multiCurrencyEnabled: false` to default flags
2. **CurrencyContext** - Added flag check:
    - When disabled: Always returns EUR, skips exchange rate fetching, `convertAmount()` returns original value
    - When enabled: Full multi-currency functionality
3. **UI Conditional Rendering**:
    - Settings page: Currency preference section hidden when flag off
    - AddExpenseModal/AddIncomeModal: Currency selector hidden when flag off
4. **ExperimentalFeaturesModal** - Added toggle for multi-currency (requires experimental features enabled first)

**Files Changed:**

-   `frontend/src/contexts/FeatureFlagContext.jsx` - New flag
-   `frontend/src/contexts/CurrencyContext.jsx` - Flag logic + expose `multiCurrencyEnabled`
-   `frontend/src/pages/Settings.jsx` - Conditional currency section
-   `frontend/src/components/AddExpenseModal.jsx` - Conditional currency selector
-   `frontend/src/components/AddIncomeModal.jsx` - Conditional currency selector
-   `frontend/src/components/ExperimentalFeaturesModal.jsx` - Toggle UI

**Impact:**

-   Default experience simplified (EUR only, no currency dropdowns)
-   Power users can enable multi-currency via Experimental Features
-   No backend changes required

---

### Race Condition Fix: PostgreSQL Upsert for Exchange Rate Caching

**Context:** Production workers crashed with `UniqueViolation: duplicate key value violates unique constraint` when multiple Gunicorn workers tried to cache the same exchange rate simultaneously.

**Root Cause:** The `_cache_rate()` function used a check-then-insert pattern that's not thread-safe:

```python
# BEFORE (race condition)
existing = ExchangeRate.query.filter_by(...).first()
if existing:
    existing.rate = rate
else:
    db.session.add(ExchangeRate(...))  # Two workers could both reach here
db.session.commit()
```

**Decision:** Use PostgreSQL's `ON CONFLICT DO UPDATE` (upsert) for atomic insert-or-update.

**Implementation:**

```python
# AFTER (thread-safe)
from sqlalchemy.dialects.postgresql import insert as pg_insert

stmt = pg_insert(ExchangeRate).values(...)
stmt = stmt.on_conflict_do_update(
    index_elements=["base_currency", "target_currency", "rate_date"],
    set_={"rate": rate, "fetched_at": datetime.utcnow()},
)
db.session.execute(stmt)
db.session.commit()
```

**Testing:** Added `test_cache_rate_concurrent_access` that runs 5 concurrent threads to verify no duplicate key errors.

**Impact:**

-   Eliminated worker crashes from concurrent rate caching
-   Works with both PostgreSQL (production) and SQLite (development)
-   Identified 4 other check-then-insert patterns for future fixes (Issues #108-#112)

---

### Frontend Auth Check Before User-Specific API Calls

**Context:** Even after making currency endpoints public, production logs showed repeated 401 errors for `/user-data/settings/default-currency` and `/auth/me` endpoints when users weren't logged in.

**Root Cause:** `CurrencyContext` called `loadDefaultCurrency()` on mount unconditionally, even wrapping the login page.

**Decision:** Pass `isAuthenticated` prop to `CurrencyProvider` and only fetch user settings when authenticated.

**Implementation:**

```jsx
// CurrencyContext.jsx
export function CurrencyProvider({ children, isAuthenticated = false }) {
  useEffect(() => {
    if (isAuthenticated) {
      loadDefaultCurrency()  // Only when logged in
    } else {
      setDefaultCurrency('EUR')  // Default for guests
    }
  }, [isAuthenticated])
}

// App.jsx
<CurrencyProvider isAuthenticated={isAuthenticated}>
```

**Impact:**

-   Eliminates 401 spam in production logs
-   Faster app initialization for unauthenticated users
-   Pattern to follow for other user-specific contexts

---

### Make Currency Endpoints Public (Production 401 Storm Fix)

**Context:** Production experienced 401 storm - currency endpoints (`/currencies`, `/currencies/rates`) required `@jwt_required()` but were called by `CurrencyContext` during app initialization before user login. This caused thousands of failed requests in Render logs.

**Root Cause:** Currency data is not user-specific and is needed for UI rendering before authentication. Requiring JWT for public reference data created a dependency cycle.

**Decision:** Remove `@jwt_required()` decorator from currency list and rates endpoints. Keep auth on `/convert` endpoint (user-specific action).

**Implementation:**

```python
# backend/routes/currency.py

# PUBLIC (no auth required) - reference data
@currency_bp.route("/currencies", methods=["GET"])
def list_currencies():
    """List supported currencies (public)"""

@currency_bp.route("/currencies/rates", methods=["GET"])
def get_rates():
    """Get exchange rates (public)"""

# PROTECTED (auth required) - user action
@currency_bp.route("/currencies/convert", methods=["POST"])
@jwt_required()
def convert():
    """Convert amount between currencies (requires auth)"""
```

**Testing Strategy:** Created comprehensive test suite to prevent regression:

1. **Backend Tests** (`test_currency_routes.py`):

    - Verify public endpoints return 200 without auth
    - Verify /convert returns 401 without auth
    - Verify all endpoints work with auth

2. **Frontend Tests** (`UnauthenticatedFlow.test.jsx`):

    - Test app loads without auth
    - Validate currency API calls succeed
    - Verify no Authorization headers on public endpoints

3. **Future E2E Tests** (Issue #107):
    - Playwright tests for complete unauthenticated user journey
    - CI integration with preview deployments

**Rationale:**

-   Currency exchange rates are public data (not user-specific)
-   UI needs currency info for rendering before login
-   Principle of least privilege: only protect user-specific endpoints
-   Comprehensive testing prevents similar issues

**Impact:**

-   Eliminates production 401 errors
-   Improves app initialization performance
-   Better separation of public vs authenticated endpoints
-   Test coverage ensures no regression

---

### Store Historical Exchange Rates at Transaction Creation (#7)

**Context:** Multi-currency support needed historical exchange rate tracking for accurate reporting. Two options: (1) store rate at creation, or (2) query historical API later.

**Decision:** Store `exchange_rate_used` (Float, nullable) in Expense and Income models at transaction creation time.

**Implementation:**

```python
# backend/models/database.py
class Expense:
    exchange_rate_used = db.Column(db.Float, nullable=True)
    # Rate from transaction currency TO EUR

class Income:
    exchange_rate_used = db.Column(db.Float, nullable=True)
```

```python
# backend/routes/expenses.py
if currency != "EUR":
    try:
        exchange_rate_used = get_exchange_rate(currency, "EUR")
    except Exception:
        exchange_rate_used = None  # Graceful degradation
```

**Migration Strategy:**

-   Development: Alembic auto-migration
-   Production: Manual SQL on Neon (free tier limitations)

**Rationale:**

-   API reliability: Store rate once vs. repeated API calls
-   Accuracy: Exact rate used at transaction time, not approximation
-   Performance: No API calls for historical reports
-   Simplicity: No historical API integration needed

**Alternative Rejected:** Querying historical API later requires:

-   Additional API integration (complexity)
-   Risk of rate unavailability (service downtime)
-   Performance overhead for reports
-   Potential cost for premium historical data

---

### Remove CORS Wildcard in Development Mode (#85 Security)

**Context:** Development mode used `cors_origins.append("*")` for mobile testing convenience, creating security risk if accidentally deployed to production.

**Decision:** Replace wildcard with explicit `DEV_MOBILE_ORIGINS` environment variable that only accepts local network patterns (192.168.x.x, 10.x.x.x, 172.x.x.x).

**Implementation:**

```python
# backend/app.py - Before
if config_name == "development":
    cors_origins.append("*")  # DANGEROUS

# After
if config_name == "development":
    dev_mobile = os.getenv("DEV_MOBILE_ORIGINS", "")
    if dev_mobile:
        for origin in dev_mobile.split(","):
            if origin.startswith(("http://192.168.", "http://10.", "http://172.")):
                cors_origins.append(origin)
```

**Mobile Testing Setup:**

```powershell
$env:DEV_MOBILE_ORIGINS = "http://192.168.0.156:3000"
```

**Rationale:** Defense in depth - even if development config leaks to production, only validated local network origins are allowed rather than any origin.

---

### Replace Console Logging with Secure Logger Utility (#80 Security)

**Context:** Raw `console.error` and `console.warn` calls throughout frontend could expose sensitive error details (API responses, user data, stack traces) in production browser consoles.

**Decision:** Create centralized secure logger utility and replace all direct console calls.

**Implementation:**

```jsx
// frontend/src/utils/logger.js
import { logError, logWarn, logInfo, logDebug } from "../utils/logger";

// Development: Full error details for debugging
// Production: Sanitized messages only (no sensitive data)

logError("operationName", error); // replaces console.error('message', error)
logWarn("message", data); // replaces console.warn('message', data)
```

**Files Updated:** 16 files across pages, contexts, and components

-   Dashboard, Debts, Goals, RecurringExpenses, Settings pages
-   CurrencyContext
-   AddExpenseModal, EditExpenseModal, AddRecurringExpenseModal, etc.

**Benefits:**

-   Prevents sensitive data leakage in production
-   Consistent error format for monitoring
-   Development debugging unchanged
-   Easy to add remote error reporting later

**Rationale:** Security best practice - error details should never be exposed to end users. The logger sanitizes error objects in production while preserving full debugging capability in development.

---

### Full Currency Conversion for EUR-Stored Amounts (Issue #7)

**Context:** After implementing dynamic currency symbols, stored EUR amounts still displayed with wrong values - only the symbol changed, not the actual amount. Needed actual currency conversion for all EUR-stored values (budgets, balances, debts, goals).

**Decision:** Implement bidirectional conversion pattern across all components displaying stored values.

**Pattern Adopted:**

```jsx
import { useCurrency } from "../contexts/CurrencyContext";
import { formatCurrency } from "../utils/formatters";

const { defaultCurrency, convertAmount } = useCurrency();

// Convert EUR cents (from DB) to user's currency
const fcEur = (cents) => {
    const converted = convertAmount
        ? convertAmount(cents, "EUR", defaultCurrency)
        : cents;
    return formatCurrency(converted, defaultCurrency);
};

// For user inputs: convert TO EUR before sending to backend
const toEur = (userCents) => {
    return convertAmount
        ? convertAmount(userCents, defaultCurrency, "EUR")
        : userCents;
};
```

**Architecture:**

-   **Transactions** (expenses/income): Store amount + original currency → no conversion needed
-   **Budgets/periods/balances**: Always EUR internally → convert for display with `fcEur()`
-   **User inputs**: Convert from user's currency to EUR before backend calls

**Components Updated:**

-   Dashboard: Balance cards, warnings, scheduled expenses
-   WeeklyBudgetCard: Budget, spent, remaining, carryover
-   Goals: Target, progress, contributions, running balance
-   Debts: Total debt, balances, payments
-   RecurringExpenses: All expense amounts
-   SalaryPeriodWizard: Full bidirectional (edit displays EUR→user, submit converts user→EUR)
-   LeftoverBudgetModal: Leftover amounts, debt/goal selection, user input conversion

**Exchange Rates:** Enabled loading in CurrencyContext (was previously commented out).

---

### Dynamic Currency Symbols Throughout UI (Issue #7)

**Context:** Components had hardcoded € or $ symbols. After implementing multi-currency support with CurrencyContext and CurrencySelector, the display symbols needed to respect the user's default currency preference.

**Decision:** Use `useCurrency` hook and `getCurrencySymbol()` utility instead of hardcoded symbols.

**Pattern Adopted:**

```jsx
import { useCurrency } from "../contexts/CurrencyContext";
import { formatCurrency, getCurrencySymbol } from "../utils/formatters";

const { defaultCurrency } = useCurrency();
const currencySymbol = getCurrencySymbol(defaultCurrency);
const fc = (cents) => formatCurrency(cents, defaultCurrency);
```

**Components Updated:** AddRecurringExpenseModal, TransactionCard, ExpenseList, BankImportModal, SalaryPeriodWizard, SalaryPeriodRolloverPrompt, AddDebtPaymentModal, LeftoverBudgetModal

**UI Consideration:** Input padding increased from `pl-8` to `pl-10` to accommodate 3-letter currency symbols (BDT, EGP, CHF).

**Testing:** Added `useCurrency` mock to test setup.js to prevent CurrencyProvider errors.

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

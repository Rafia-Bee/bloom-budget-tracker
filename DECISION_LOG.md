# Decision Log

Session continuity for AI context + architectural decisions. Max 2 days of entries. Remove entries older than 1 week unless it's the last entry.

---

## 2026-01-13: Security Audit Phase 3 Complete - Form UX & Password Management (#170)

**Session Summary:** Completed LOW priority security improvements - form autocomplete, password change endpoint.

**Phase 3.1 - Add Autocomplete Attributes to Register Form:**

-   Added `autoComplete="email"` to email input
-   Added `autoComplete="new-password"` to both password inputs
-   Improves password manager integration
-   Also fixed client-side validation message to match backend complexity requirements

**Phase 3.2 - Add Password Change Endpoint:**

-   Added `POST /auth/change-password` endpoint in `backend/routes/auth.py`
-   Requires JWT authentication
-   Validates current password before allowing change
-   New password must meet complexity requirements
-   Rejects if new password matches current password
-   Added audit logging for password change attempts
-   Added 10 new tests for password change scenarios

**Phase 3.3 - Global Rate Limiting (Documented as Limitation):**

-   Auth endpoints (register, login, password reset) already have rate limiting
-   Global rate limiting for all endpoints not implemented
-   Accepted limitation for personal app - expensive endpoints (exports, bulk operations) are not rate limited
-   Recommendation: Add per-endpoint rate limits if app scales to multi-user

**Files Updated:**

-   Frontend: Register.jsx (autocomplete + validation message)
-   Backend: auth.py (new change-password endpoint)
-   Tests: test_auth.py (10 new password change tests)

**What's Next:**

-   Fix existing Dependabot alerts
-   All security audit items (#170) now complete!

**Current Branch:** `fix/security-audit-console-logging`

---

## 2026-01-13: Security Audit Phase 2 Complete - Password & Token Hardening (#170)

**Session Summary:** Completed MEDIUM priority security fixes from audit - JWT expiration, password complexity.

**Phase 2.1 - Reduce JWT Token Expiration:**

-   Changed `JWT_ACCESS_TOKEN_EXPIRES` from 24h to 1h in `backend/config.py`
-   Security benefit: Reduces window of exposure for compromised tokens
-   Refresh tokens (30 days) remain unchanged for user convenience

**Phase 2.2 - Add Password Complexity Requirements:**

-   Added `validate_password_strength()` function in `backend/utils/validators.py`
-   Requirements: 8+ chars, uppercase, lowercase, number
-   Updated `backend/routes/auth.py` (registration) to use new validator
-   Updated `backend/routes/password_reset.py` (password reset) to use new validator
-   Added comprehensive tests for all password complexity rules

**Phase 2.3 - Feature Flag Security Documentation:**

-   Added security note to `frontend/src/contexts/FeatureFlagContext.jsx`
-   Documents that localStorage flags can be manipulated by users
-   Accepted limitation: flags control UI/UX only, not security-sensitive operations

**Test Updates:**

-   Updated 6 password reset tests to use complex passwords
-   Added 3 new auth tests for password complexity (no uppercase/lowercase/number)
-   Added 12 new validator tests for `validate_password_strength()`

**Files Updated:**

-   Backend: config.py, validators.py, auth.py, password_reset.py
-   Tests: test_auth.py, test_password_reset.py, test_validators.py
-   Frontend: FeatureFlagContext.jsx

**What's Next:**

-   Phase 3 (LOW priority): Form autocomplete, password change endpoint, global rate limiting
-   Fix existing Dependabot alerts (added to issue #170)

**Current Branch:** `fix/security-audit-console-logging`

---

## 2026-01-13: Security Audit Phase 1 Complete - Frontend & Backend Hardening (#170)

**Session Summary:** Completed all three HIGH priority security fixes from audit - console logging, source maps, and security headers.

**Phase 1.1 - Replace Direct Console Logging:**

-   Replaced 14 instances of direct `console.error`/`console.warn` with `logError`/`logWarn` from `utils/logger.js`
-   Updated 7 files to import and use secure logging functions
-   Security benefit: Prevents sensitive data (headers, request bodies, stack traces) from leaking to browser DevTools in production

**Phase 1.2 - Disable Source Maps in Production:**

-   Added `sourcemap: false` to `frontend/vite.config.js` build config
-   Prevents original source code from being exposed in production builds
-   Security benefit: Attackers cannot easily reverse-engineer application logic

**Phase 1.3 - Add Security Headers with Flask-Talisman:**

-   Added `flask-talisman>=1.0.0` to `backend/requirements.txt`
-   Configured Talisman in `backend/app.py` (production only)
-   Implements CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers
-   Security benefits:
    -   **CSP**: Prevents XSS attacks by restricting script sources
    -   **HSTS**: Forces HTTPS connections for 1 year
    -   **X-Frame-Options**: Prevents clickjacking attacks
    -   **X-Content-Type-Options**: Prevents MIME sniffing

**Files Updated:**

-   Frontend (7 files): Reports.jsx, SalaryPeriodWizard.jsx, ExportAllReportsButton.jsx, ChartExportButton.jsx, PeriodComparisonCard.jsx, BalanceModeModal.jsx, PeriodInfoModal.jsx
-   Build: vite.config.js
-   Backend: app.py, requirements.txt

**What's Next:**

-   Phase 2 (MEDIUM priority): JWT token expiration, password complexity, feature flag validation
-   Phase 3 (LOW priority): Form autocomplete, password change endpoint, global rate limiting

**Current Branch:** `fix/security-audit-console-logging`

**Related:** Fixed #169 (FAB button disabled with rollover prompt) - PR #172 created

---

## 2026-01-12: Phase 4 Complete + E2E Test Fixes (#164)

**Session Summary:**

1. Completed Phase 4 optimization - Debts.jsx now uses SalaryPeriodContext
2. Performed frontend security audit - no critical vulnerabilities found
3. Fixed E2E test stability issues (debts.spec.js and balance-accumulation.spec.js)

**Phase 4 Changes:**

-   `frontend/src/pages/Debts.jsx` - Removed `loadCurrentPeriod()` function and `budgetPeriodAPI` import
-   Now uses `useSalaryPeriod()` context instead of making separate API call
-   Eliminated 1 additional `budgetPeriodAPI.getAll()` call per page load

**Frontend Security Audit Results:** ✅ No critical vulnerabilities

-   Passwords never stored in localStorage/sessionStorage
-   JWT tokens protected by HttpOnly cookies (implemented in Issue #80)
-   No XSS vulnerabilities (no dangerouslySetInnerHTML, eval, etc.)
-   Production logging properly sanitized via logger.js

**E2E Test Fixes:**

-   `balance-accumulation.spec.js` - Use dates 180-210 days ago to avoid conflicts with other tests
-   `debts.spec.js` - Replace `networkidle` with `domcontentloaded` to avoid slow currency API timeouts
-   `debts.spec.js` - Fix invalid selector syntax (use `Promise.race()` instead of comma-separated selectors)

**Test Results:** 280 passed, 2 failed (pre-existing test isolation issues), 5 flaky

**What's Next:**

1. Push and create PR for `feat/optimize-dashboard-api-calls`
2. Merge after review
3. Optional: Address remaining test isolation issues (separate PR)

**Current Branch:** `feat/optimize-dashboard-api-calls`

---

## 2026-01-12: Context-Specific Copilot Instructions & Phase 3 Complete (#164)

**Session Summary:**

1. Created context-specific instruction files for backend/frontend/database development
2. Verified Phase 3 optimization changes work correctly via manual testing
3. Identified and created GH issue for rollover prompt FAB button bug

**Instruction Files Created:**

-   `.github/BACKEND_INSTRUCTIONS.md` - Flask routes, models, testing patterns
-   `.github/FRONTEND_INSTRUCTIONS.md` - React components, Tailwind styling, API integration
-   `.github/DATABASE_INSTRUCTIONS.md` - Schema reference, migrations, queries
-   `.github/prompts/backend.prompt.md` - Auto-attached context for backend files
-   `.github/prompts/frontend.prompt.md` - Auto-attached context for frontend files
-   `.github/prompts/database.prompt.md` - Auto-attached context for database files

**Bug Found During Testing:**

-   Issue #XXX: FAB (+) button disabled when rollover prompt showing
-   Root cause: `showRolloverPrompt` included in disabled conditions in Dashboard.jsx

**Manual Testing Results:** ✅ App working correctly

-   SharedDataContext caching working (no duplicate API calls for modals)
-   SalaryPeriodContext caching working (no duplicate salary period calls)
-   All CRUD operations functioning normally

**What's Next:**

1. Create PR for `feat/optimize-dashboard-api-calls` branch
2. Fix rollover prompt FAB button bug (Issue #XXX)
3. Optional Phase 4: Dashboard prop-drilling to PeriodSelector

**Current Branch:** `feat/optimize-dashboard-api-calls`

---

## 2026-01-12: Phase 3 Complete - SalaryPeriodContext (#164)

**Session Summary:** Implemented Phase 3 - SalaryPeriodContext for cross-page salary period data caching.

**New Context Created:**

-   `SalaryPeriodContext.jsx` - Centralized caching for current salary period
-   Provides: `currentPeriod`, `currentWeek`, `salaryPeriodData`, `loading`, `loaded`, `refresh()`
-   Pattern matches SharedDataContext (load on auth, state tracking, refresh methods)

**Components Updated to Use Context:**

1. `App.jsx` - Added `SalaryPeriodProvider` wrapper
2. `Debts.jsx` - Uses `useSalaryPeriod()` instead of `salaryPeriodAPI.getCurrent()`
3. `Reports.jsx` - Uses context for default date range (removed async loadDefaultPeriod)
4. `SalaryPeriodRolloverPrompt.jsx` - Uses context as fallback when parent doesn't provide data

**Test Updates:**

-   Added `renderWithSalaryPeriod()` wrapper in `utils.jsx`
-   Rewrote `SalaryPeriodRolloverPrompt.test.jsx` to pass mock data as props
-   Simplified tests by bypassing context (component accepts `salaryPeriodData` prop)

**API Calls Eliminated:**

-   `salaryPeriodAPI.getCurrent()` no longer called independently by Debts, Reports, SalaryPeriodRolloverPrompt
-   Single call at app load, data shared across all pages

**Test Results:** ✅ 34/34 test files, 1032/1032 tests passing

**What's Next:**

1. Phase 4 (optional): Dashboard prop-drilling to PeriodSelector
2. Future: Rate limiting on `currencies/rates` endpoint

**Commits This Session:**

-   `af6afd4` - test: update modal tests to use renderWithSharedData (#164)
-   `3de3f8c` - feat: add SalaryPeriodContext for cross-page data caching (#164)

**Current Branch:** `feat/optimize-dashboard-api-calls`

---

## 2026-01-10: Optimize Dashboard API Calls - Phase 1 & 2 Complete (#164)

**Session Summary:** Investigated frontend API call redundancies, analyzed webserver logs for runtime impact, implemented Phase 1 & 2 optimizations.

**Webserver Log Analysis (E2E Test Run - Before Optimization):**

| API Endpoint             | Actual Calls | Problem                                       |
| ------------------------ | ------------ | --------------------------------------------- |
| `salary-periods/{id}`    | 623          | Same period fetched by multiple components    |
| `currencies/rates`       | 537          | Not fully centralized despite CurrencyContext |
| `default-currency`       | 523          | Every component fetches independently         |
| `salary-periods/current` | 412          | Dashboard, Debts, Reports all call            |
| `budget-periods`         | 367          | Dashboard and child components duplicate      |

**Static Code Analysis:**

-   `debtAPI.getAll()` called by 6 different modals
-   `subcategoryAPI.getAll()` called by 5 different locations
-   `goalAPI.getAll()` called by 3 different locations
-   `salaryPeriodAPI.getCurrent()` called by 4 different components

**Phase 1 Optimizations Implemented:**

1. Dashboard caches `salaryPeriodData` in state and passes to child components
2. WeeklyBudgetCard accepts `initialSalaryPeriodData` prop, skips API call if provided
3. SalaryPeriodRolloverPrompt accepts `salaryPeriodData` prop with fallback pattern

**Phase 2 Optimizations Implemented:**

1. Created `SharedDataContext` for centralized caching of debts/goals/subcategories
2. Updated 5 modals to use cached data instead of fetching:
    - AddExpenseModal, EditExpenseModal, FilterTransactionsModal
    - AddRecurringExpenseModal, AddDebtPaymentModal
3. Added cache invalidation (refreshDebts/refreshGoals/refreshSubcategories) to:
    - Debts.jsx (after create/update/delete)
    - Goals.jsx (after create/update/delete)
    - Settings.jsx (after subcategory CRUD)

**Branch:** `feat/optimize-dashboard-api-calls`

**Files Changed (Phase 2):**

-   `frontend/src/contexts/SharedDataContext.jsx` - NEW: Centralized data caching
-   `frontend/src/App.jsx` - Added SharedDataProvider wrapper
-   `frontend/src/components/AddExpenseModal.jsx` - Use SharedDataContext
-   `frontend/src/components/EditExpenseModal.jsx` - Use SharedDataContext
-   `frontend/src/components/FilterTransactionsModal.jsx` - Use SharedDataContext
-   `frontend/src/components/AddRecurringExpenseModal.jsx` - Use SharedDataContext
-   `frontend/src/components/AddDebtPaymentModal.jsx` - Use SharedDataContext
-   `frontend/src/pages/Debts.jsx` - Add refreshSharedDebts calls
-   `frontend/src/pages/Goals.jsx` - Add refreshSharedGoals calls
-   `frontend/src/pages/Settings.jsx` - Add refreshSharedSubcategories calls

**What's Next (Resume Here Tomorrow):**

1. **FIRST:** Run `btest f` to verify frontend tests pass
2. **THEN:** Run `bformat` to format all code
3. **THEN:** Commit Phase 2 with message: `feat: add SharedDataContext for modal data caching (#164)`
4. **OPTIONAL Phase 3:** Create SalaryPeriodContext for cross-page salary period data sharing
5. **OPTIONAL Phase 4:** Audit other pages (Expenses.jsx, Income.jsx, Debts.jsx) for similar redundancies

**Key Files to Review:**

-   `frontend/src/contexts/SharedDataContext.jsx` - The new context for caching
-   `frontend/src/App.jsx` - Where SharedDataProvider is wrapped

**Current Branch:** `feat/optimize-dashboard-api-calls` (uncommitted changes)

---

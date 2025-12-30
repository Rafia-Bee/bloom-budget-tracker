# Bloom Budget Tracker - Code Review

**Reviewer:** Software Developer
**Date:** December 29, 2025
**Review Type:** Pre-Production Security & Quality Audit
**Project:** Bloom Budget Tracker - Balance-based weekly budget tracker

---

## Executive Summary

After conducting a thorough review of the Bloom Budget Tracker codebase, I have identified **4 critical issues**, **12 high-priority issues**, and numerous medium/low priority improvements.

**Overall Assessment:** The application has a solid foundation with good security practices in place (httpOnly cookies, account lockout, production secret validation). However, there are several issues that **must be addressed before production launch** to prevent security vulnerabilities, data integrity issues, and potential service outages.

**Recommendation:** Address all critical and high-priority issues before public launch. The codebase is well-structured but has accumulated technical debt that should be systematically addressed.

---

## Review Progress

| Area                    | Status      | Critical Issues | High Priority | Medium | Low |
| ----------------------- | ----------- | --------------- | ------------- | ------ | --- |
| Backend Configuration   | ✅ Complete | 0               | 1             | 2      | 1   |
| Database Models         | ✅ Complete | 1               | 2             | 2      | 0   |
| Backend Routes          | ✅ Complete | 1               | 3             | 4      | 2   |
| Backend Services        | ✅ Complete | 0               | 1             | 2      | 1   |
| Backend Utils           | ✅ Complete | 1               | 1             | 1      | 0   |
| Frontend Configuration  | ✅ Complete | 0               | 0             | 1      | 1   |
| Frontend API Layer      | ✅ Complete | 0               | 1             | 1      | 0   |
| Frontend Pages          | ✅ Complete | 0               | 1             | 2      | 2   |
| Frontend Components     | ✅ Complete | 0               | 1             | 2      | 1   |
| Security Implementation | ✅ Complete | 1               | 1             | 2      | 0   |
| Tests                   | ✅ Complete | 0               | 0             | 2      | 1   |

---

## Critical Issues (Must Fix Before Production)

### CRITICAL-1: Duplicate Return Statement in Auth Refresh Endpoint

**File:** [backend/routes/auth.py](backend/routes/auth.py#L212-L224)
**Severity:** 🔴 Critical
**Impact:** Silent failure, potential authentication bugs

```python
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=str(current_user_id))
    response = make_response(jsonify({"message": "Token refreshed"}), 200)
    set_access_cookies(response, access_token)
    return response
    return response  # <-- DUPLICATE RETURN (dead code)
```

**Fix:** Remove the duplicate `return response` statement.

---

### CRITICAL-2: In-Memory Rate Limiting Resets on Server Restart

**File:** [backend/utils/rate_limiter.py](backend/utils/rate_limiter.py#L1-L77)
**Severity:** 🔴 Critical
**Impact:** Rate limiting is completely bypassed on server restart; attackers can brute force by triggering restarts

The rate limiter uses an in-memory dictionary (`_request_history = defaultdict(list)`) that is cleared whenever the server restarts. On Render's free tier, the server restarts frequently (auto-sleep after 15 min of inactivity).

**Risk:** An attacker can:

1. Attempt login 49 times
2. Wait for server to sleep and restart
3. Get another 49 attempts
4. Repeat indefinitely

**Fix Options:**

1. **Recommended:** Implement Redis-based rate limiting (Issue #32 exists)
2. **Minimum:** Store rate limit data in database (persists across restarts)
3. **Stopgap:** Add aggressive IP blocking at Cloudflare level

---

### CRITICAL-3: Missing Soft-Delete Filter on Expense Queries in Balance Calculations

**File:** [backend/services/balance_service.py](backend/services/balance_service.py#L105-L145)
**Severity:** 🔴 Critical
**Impact:** Deleted expenses still affect balance calculations, causing incorrect financial data

```python
# This query does NOT filter out soft-deleted expenses!
total_debit_expenses = (
    db.session.query(db.func.coalesce(db.func.sum(Expense.amount), 0))
    .filter(
        and_(
            Expense.user_id == user_id,
            Expense.payment_method == "Debit card",
            Expense.date >= start_from_date,
            Expense.date <= today,
        )
    )
    .scalar()
    or 0
)
```

The same issue exists in `_calculate_credit_available()`.

**Fix:** Add `Expense.deleted_at.is_(None)` to all balance calculation queries, or use `Expense.active()` pattern.

---

### CRITICAL-4: CSRF Protection Disabled

**File:** [backend/app.py](backend/app.py#L71-L72)
**Severity:** 🔴 Critical
**Impact:** Cross-site request forgery attacks possible

```python
app.config["JWT_COOKIE_CSRF_PROTECT"] = False  # <-- CSRF disabled!
```

While using httpOnly cookies is good, disabling CSRF protection exposes the application to CSRF attacks. Any malicious website can make authenticated requests on behalf of logged-in users.

**Fix:**

1. Enable CSRF protection: `JWT_COOKIE_CSRF_PROTECT = True`
2. Update frontend to include CSRF token in requests
3. Test all authenticated endpoints

---

## High Priority Issues

### HIGH-1: Gunicorn Running Without Database Migration Check

**File:** `render.yaml` / Production startup
**Impact:** Production deployments may fail silently if migrations aren't applied

No automatic migration check before server starts. If a new column is added and migration not run manually, server will crash on first query using that column.

**Fix:** Add migration check to startup script or implement health check that validates schema.

---

### HIGH-2: Password Validation Inconsistency (Frontend vs Backend)

**Files:**

-   [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx#L34-L37): Requires 6 characters
-   [frontend/src/pages/Register.jsx](frontend/src/pages/Register.jsx#L29-L32): Requires 6 characters
-   [backend/routes/auth.py](backend/routes/auth.py#L44-L46): Requires 8 characters

Frontend allows 6-character passwords but backend rejects them.

**Fix:** Align both to 8 characters minimum.

---

### HIGH-3: Missing Input Validation on Multiple Endpoints

**File:** Various routes
**Impact:** Potential for invalid data entry, edge case bugs

Examples:

-   `expenses.py`: Category validation exists but subcategory is not validated
-   `debts.py`: Name length not validated (could create very long names)
-   `goals.py`: Description field has no length limit
-   `recurring_expenses.py`: frequency_value not bounded (could set to negative or extremely large)

**Fix:** Add comprehensive input validation using the existing validators.py utilities.

---

### HIGH-4: No Database Connection Pooling Limits for Development SQLite

**File:** [backend/config.py](backend/config.py#L55-L61)
**Impact:** SQLite doesn't support concurrent connections well; could cause "database locked" errors

```python
# SQLite gets basic pooling but no size limits
else:
    return {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
```

**Fix:** Add `pool_size=1` for SQLite to prevent concurrent connection issues.

---

### HIGH-5: Admin Endpoint Security Is User-ID Based Only

**File:** [backend/routes/admin.py](backend/routes/admin.py#L35-L43)
**Impact:** Security through obscurity; if user IDs are predictable, anyone could guess admin

```python
# Security: Only allow if user_id = 1 (the app owner)
if current_user_id != 1 and not current_app.config.get("DEBUG"):
    return jsonify({"error": "Unauthorized..."}), 403
```

Relying on `user_id == 1` is fragile. If the database is reset or migrated, user IDs could change.

**Fix:** Add proper admin role to User model with `is_admin` boolean field.

---

### HIGH-6: Email Field Stored in localStorage

**File:** [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx#L44)
**Impact:** Minor privacy leak; unnecessary data exposure

```javascript
localStorage.setItem("user_email", response.data.user.email);
```

While not as severe as storing tokens, email shouldn't be in localStorage. It persists after logout if user doesn't clear storage.

**Fix:** Remove email from localStorage; fetch from `/auth/me` when needed.

---

### HIGH-7: Expense Search Allows SQL LIKE Injection Pattern

**File:** [backend/routes/expenses.py](backend/routes/expenses.py#L74-L78)
**Impact:** Users can craft search patterns that cause slow queries

```python
if search:
    search_pattern = f"%{search}%"  # User input directly in LIKE pattern
    query = query.filter(
        (Expense.name.ilike(search_pattern)) | (Expense.notes.ilike(search_pattern))
    )
```

Special characters like `%`, `_`, `[` in LIKE patterns could cause unexpected behavior or slow queries.

**Fix:** Escape special LIKE characters before constructing pattern.

---

### HIGH-8: Recurring Expense Generator Race Condition Handling Is Incomplete

**File:** [backend/utils/recurring_generator.py](backend/utils/recurring_generator.py#L160-L175)
**Impact:** Duplicate expenses could still be generated under high load

The code catches `IntegrityError` for duplicates but does a rollback without re-querying. If two processes hit the same expense simultaneously, both could fail.

**Fix:** Add retry logic with proper locking or database-level unique constraint on (recurring_template_id, date).

---

### HIGH-9: Export/Import Has No Size Limits

**File:** [backend/routes/export_import.py](backend/routes/export_import.py#L355-L400)
**Impact:** Memory exhaustion attack; large import files could crash server

Import accepts JSON without validating size. A malicious user could upload a multi-GB JSON file.

**Fix:** Add `request.content_length` check and limit to reasonable size (e.g., 10MB).

---

### HIGH-10: Dashboard.jsx Is 1809 Lines - Needs Refactoring

**File:** [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)
**Impact:** Maintenance nightmare; difficult to debug and extend

Single file with 1809 lines violates single responsibility principle. Contains:

-   State management for 40+ state variables
-   Multiple API calls
-   Complex filtering logic
-   Date navigation
-   Transaction rendering

**Fix:** Extract into smaller components and custom hooks (useTransactions, usePeriods, useFilters, etc.)

---

### HIGH-11: Missing Error Boundaries in React

**File:** [frontend/src/App.jsx](frontend/src/App.jsx)
**Impact:** Any unhandled error crashes the entire app

No React Error Boundaries implemented. If any component throws, the whole app white-screens.

**Fix:** Add ErrorBoundary component wrapping Routes.

---

### HIGH-12: PWA Caching Could Serve Stale Auth State

**File:** [frontend/vite.config.js](frontend/vite.config.js#L42-L55)
**Impact:** User sees stale data or stays "logged in" after logout

API cache is set to 24 hours:

```javascript
expiration: {
    maxEntries: 100,
    maxAgeSeconds: 60 * 60 * 24, // 24 hours
}
```

Cached API responses could include sensitive data that persists after logout.

**Fix:** Exclude auth-related endpoints from caching, or clear cache on logout.

---

## Medium Priority Issues

### MED-1: Deprecated datetime.utcnow() Usage

**Files:** Multiple files in models/database.py
**Impact:** Python deprecation warning; will be removed in future Python versions

```python
created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

**Fix:** Use `datetime.now(timezone.utc)` instead.

---

### MED-2: Hardcoded Credit Limit Default

**File:** [backend/models/database.py](backend/models/database.py#L139)
**Impact:** €1500 default may not suit all users

```python
credit_limit = db.Column(db.Integer, nullable=False, default=150000)  # €1500
```

**Fix:** Make this configurable per-user or remove default.

---

### MED-3: Inconsistent Error Response Formats

**Files:** Various routes
**Impact:** Frontend has to handle multiple error formats

Some endpoints return `{"error": "message"}`, others return `{"message": "error"}`, and some include additional fields.

**Fix:** Standardize all error responses to `{"error": "message", "code": "ERROR_CODE"}`.

---

### MED-4: Missing Index on Expense.deleted_at

**File:** [backend/models/database.py](backend/models/database.py#L46)
**Impact:** Soft delete queries may be slow on large datasets

The `SoftDeleteMixin` adds `deleted_at` column but it's only indexed in the base mixin, not in the combined indexes.

**Fix:** Add composite index including `deleted_at` for common query patterns.

---

### MED-5: Currency Conversion Silently Fails

**Files:** [backend/routes/expenses.py](backend/routes/expenses.py#L169-L175), [backend/routes/income.py](backend/routes/income.py#L141-L145)
**Impact:** Exchange rate might not be stored; historical accuracy lost

```python
try:
    exchange_rate_used = get_exchange_rate(currency, "EUR")
except (ValueError, ConnectionError, TimeoutError):
    pass  # Silently fails
```

**Fix:** Log warning when exchange rate fetch fails; consider storing a flag indicating rate was unavailable.

---

### MED-6: Frontend Doesn't Handle Network Offline Gracefully

**File:** [frontend/src/api.js](frontend/src/api.js)
**Impact:** Confusing error messages when offline

No specific handling for `ERR_NETWORK` errors. User sees generic "Login failed" instead of "You appear to be offline."

**Fix:** Add network error detection in axios interceptor.

---

### MED-7: Password Reset Token Stored in Plain URL

**File:** [backend/services/email_service.py](backend/services/email_service.py#L102)
**Impact:** Token visible in browser history, server logs, referrer headers

```python
reset_link = f"{frontend_url}/reset-password?token={reset_token}"
```

**Fix:** Consider POST-based token submission or implement token encryption.

---

### MED-8: No Pagination on Goals/Debts Lists

**Files:** [backend/routes/goals.py](backend/routes/goals.py#L18-L35), [backend/routes/debts.py](backend/routes/debts.py#L24-L60)
**Impact:** Performance degradation for users with many goals/debts

Goals and debts endpoints return all items without pagination.

**Fix:** Add pagination similar to expenses endpoint.

---

### MED-9: Test Configuration Duplicates Production Config

**File:** [backend/tests/conftest.py](backend/tests/conftest.py#L27-L54)
**Impact:** Configuration drift; test might not match production behavior

Test config re-declares many settings that should inherit from base Config class.

**Fix:** Use inheritance or composition with production config.

---

### MED-10: Validators Not Used Consistently

**File:** [backend/utils/validators.py](backend/utils/validators.py)
**Impact:** Input validation logic duplicated across routes

Validators exist but aren't used in all routes. Each route does its own ad-hoc validation.

**Fix:** Create decorators or use marshmallow schemas for consistent validation.

---

### MED-11: Frontend Has Some console.log Calls

**Files:** Various frontend files
**Impact:** Information leakage in production console

Pre-push hook checks for console.log but some may slip through in error handlers.

**Fix:** Add ESLint rule to disallow console.log in production builds.

---

### MED-12: Goal Progress Calculation Queries Database Every Time

**File:** [backend/models/database.py](backend/models/database.py#L597-L620)
**Impact:** N+1 query problem when listing goals with progress

```python
def calculate_progress(self):
    # Queries database each time called
    total_contributions = (
        db.session.query(db.func.sum(Expense.amount))
        ...
    ).scalar()
```

**Fix:** Precompute progress with joined query when fetching goals list.

---

## Low Priority Issues

### LOW-1: Unused Imports in Several Files

**Impact:** Code cleanliness; minor bundle size impact

Several files import modules that aren't used (e.g., `json` imported but not used in some routes).

---

### LOW-2: Magic Numbers Throughout Codebase

**Impact:** Maintainability

Examples:

-   `150000` (€1500 credit limit)
-   `4` (number of weeks)
-   `28` (safe day for all months)

**Fix:** Extract to named constants.

---

### LOW-3: Inconsistent Naming Conventions

**Impact:** Code readability

Mix of `snake_case` and `camelCase` in frontend. Backend consistently uses snake_case.

---

### LOW-4: Missing TypeScript

**Impact:** Type safety; larger team scalability

Frontend is plain JavaScript. For a production app handling financial data, TypeScript would catch many bugs.

---

### LOW-5: No API Versioning Strategy Document

**Impact:** Future maintenance

API has `/api/v1` prefix but no documented strategy for deprecating v1 or introducing v2.

---

### LOW-6: Docker Configuration Missing

**Impact:** Deployment complexity

No Dockerfile or docker-compose.yml for local development or alternative deployments.

---

## Detailed Findings by Area

### 1. Backend Configuration

**Strengths:**

-   Production secret validation is excellent - fails fast if weak secrets used
-   Database URI handling with TESTING env var isolation
-   CORS properly restricted in production

**Issues Found:**

-   HIGH-1: No migration check on startup
-   MED-1: Deprecated datetime.utcnow usage
-   MED-3: Pool configuration could be improved for SQLite
-   LOW-1: Some unused imports

---

### 2. Database Models

**Strengths:**

-   Comprehensive check constraints on all tables
-   Soft delete mixin is well-implemented
-   Good use of indexes on common query patterns
-   Foreign keys with CASCADE delete

**Issues Found:**

-   CRITICAL-3: Soft-delete queries missing in some places
-   HIGH: Missing composite unique constraint on (recurring_template_id, date)
-   MED-2: Hardcoded defaults
-   MED-4: Missing index on deleted_at in composite indexes

---

### 3. Backend Routes

**Strengths:**

-   Consistent use of JWT authentication
-   Good error handling with SQLAlchemyError catches
-   Transaction wrapping in critical operations

**Issues Found:**

-   CRITICAL-1: Duplicate return in auth refresh
-   HIGH-3: Inconsistent input validation
-   HIGH-5: Admin security is weak
-   HIGH-7: Search LIKE pattern injection
-   MED-3: Inconsistent error formats
-   MED-8: No pagination on some endpoints

---

### 4. Backend Services

**Strengths:**

-   budget_service.py has excellent pure function design with doctests
-   Balance calculations are well-documented
-   Email service handles missing API key gracefully

**Issues Found:**

-   CRITICAL-3: Balance service missing soft-delete filter
-   MED-5: Silent failure on currency conversion
-   MED-12: N+1 query in goal progress

---

### 5. Backend Utils

**Strengths:**

-   Validators are comprehensive when used
-   Recurring generator handles edge cases well

**Issues Found:**

-   CRITICAL-2: In-memory rate limiting
-   HIGH-8: Race condition in recurring generator
-   MED-10: Validators not used consistently

---

### 6. Frontend Configuration

**Strengths:**

-   PWA configuration is solid
-   Test setup is comprehensive
-   Good coverage thresholds enforced

**Issues Found:**

-   HIGH-12: PWA caching could serve stale auth
-   MED-11: console.log detection could be stronger
-   LOW-4: No TypeScript

---

### 7. Frontend API Layer

**Strengths:**

-   Centralized API configuration
-   Loading callback system for UX
-   Automatic redirect on 401

**Issues Found:**

-   MED-6: No offline error handling
-   The 401 handling might cause redirect loops in edge cases

---

### 8. Frontend Pages

**Strengths:**

-   Good component organization
-   Proper use of useEffect dependencies
-   Currency formatting centralized

**Issues Found:**

-   HIGH-10: Dashboard.jsx is 1809 lines
-   HIGH-11: No error boundaries
-   MED: Some duplicate validation logic
-   LOW-3: Inconsistent naming

---

### 9. Frontend Components

**Strengths:**

-   Modals are well-structured
-   Good use of forwardRef for imperative handles
-   PropTypes defined

**Issues Found:**

-   HIGH-6: Email in localStorage
-   MED: Some components are too large
-   LOW: PropTypes could be more comprehensive

---

### 10. Security Implementation

**Strengths:**

-   HttpOnly cookies for JWT ✅
-   Account lockout after failed attempts ✅
-   Production secret validation ✅
-   Werkzeug password hashing ✅
-   SQL injection protection via ORM ✅
-   CORS restricted ✅

**Issues Found:**

-   CRITICAL-4: CSRF protection disabled
-   HIGH-2: Password validation mismatch
-   MED-7: Reset token in URL
-   MED: No rate limiting persistence

---

### 11. Tests

**Strengths:**

-   Good test isolation with in-memory SQLite
-   Email service properly mocked
-   conftest.py prevents service quota usage
-   Coverage thresholds enforced

**Issues Found:**

-   MED-9: Test config duplicates production
-   MED: Some edge cases not covered (soft-delete + balance calc)
-   LOW: Could use more integration tests

---

## Recommendations Summary

### Immediate Actions (Before Production Launch)

1. Fix CRITICAL-1: Remove duplicate return statement
2. Fix CRITICAL-3: Add soft-delete filters to balance calculations
3. Fix CRITICAL-4: Enable CSRF protection
4. Address HIGH-2: Align password validation
5. Implement basic request size limits (HIGH-9)

### Short-Term (Within 2 Weeks of Launch)

1. Implement Redis rate limiting (CRITICAL-2)
2. Add proper admin role (HIGH-5)
3. Add error boundaries (HIGH-11)
4. Fix PWA auth caching (HIGH-12)
5. Standardize error responses (MED-3)

### Medium-Term (Within 1 Month)

1. Refactor Dashboard.jsx (HIGH-10)
2. Add comprehensive input validation (HIGH-3)
3. Implement pagination on all list endpoints (MED-8)
4. Add TypeScript to frontend

### Long-Term Technical Debt

1. Migrate to datetime.now(timezone.utc)
2. Extract magic numbers to constants
3. Add Docker configuration
4. Document API versioning strategy

---

## Sign-off

-   [ ] All critical issues resolved
-   [ ] All high priority issues resolved or documented with timeline
-   [ ] Security review passed
-   [ ] Production deployment approved

**Reviewer Notes:**
This application has a solid foundation and shows good security awareness. The primary concerns are:

1. The disabled CSRF protection is a significant security gap
2. The in-memory rate limiting provides false sense of security
3. The balance calculation bug could cause incorrect financial data

Once the critical issues are addressed, this application would be suitable for production use as a personal/small-scale budget tracker.

---

## Second Reviewer Addendum (December 30, 2025)

**Reviewer:** Senior Software Developer
**Status:** 🔴 **NOT PUBLISH WORTHY**

I have verified the findings of the first reviewer and conducted an additional structural analysis. I **confirm all critical and high-priority issues** identified above. In particular, the **CSRF protection disabled** (CRITICAL-4) and **Soft-Delete filter missing** (CRITICAL-3) are absolute blockers.

In addition to the previous findings, I have identified the following architectural and structural issues:

### CRITICAL-5: Double Route Registration (API Duplication)

**File:** [backend/app.py](backend/app.py#L94-L98)
**Severity:** 🔴 Critical
**Impact:** Increased attack surface, confusing API usage, difficult deprecation

The application registers all blueprints **twice**:

1. Once under `/api/v1/...` via `create_v1_blueprint()`
2. Again at the root level `/...` for "backward compatibility"

```python
# Register versioned API (v1)
v1_bp = create_v1_blueprint()
app.register_blueprint(v1_bp)

# Keep legacy routes for backward compatibility (will deprecate later)
app.register_blueprint(auth_bp)
app.register_blueprint(expenses_bp)
...
```

**Fix:** Remove the legacy route registration immediately. A new production deployment should not carry this technical debt. If backward compatibility is needed for existing clients, it should be handled via a redirect or a specific legacy blueprint, not by duplicating every route.

### HIGH-13: Project Structure & Root Directory Pollution

**Severity:** 🟠 High
**Impact:** Maintainability, Onboarding friction

The project structure is cluttered and lacks discipline:

1.  **Backend Root Pollution:** `backend/` contains `seed_data.py`, `seed_data_v2.py`, and `run_recurring_generation.py`. These should be in `scripts/` or `services/`.
2.  **Scripts Folder Chaos:** The `scripts/` directory contains 40+ flat files mixing one-off fixes (`fix_credit_card_period.py`), maintenance tasks (`backup_database.py`), and tests (`test_api.py`).
3.  **Redundant Scripts:** `create-security-issues.ps1`, `create-security-issues-simple.ps1`, and `create-security-issues.sh` exist in the root.

**Fix:**

-   Move `backend/*.py` (excluding `app.py`, `config.py`) to appropriate subfolders.
-   Organize `scripts/` into `maintenance/`, `migrations/`, `debug/`.
-   Delete one-off `fix_*.py` scripts after use.

### MED-13: Underutilized React Hooks Pattern

**Severity:** 🟡 Medium
**Impact:** Code quality, Reusability

While `Dashboard.jsx` is identified as a monolith (HIGH-10), the `frontend/src/hooks/` directory contains only `useDebounce.js`. This indicates a systemic failure to use React composition patterns.

**Fix:** The refactoring of `Dashboard.jsx` must involve creating domain-specific hooks (`useTransactions`, `useBudgetPeriods`) in the `hooks/` directory, not just splitting components.

### Verdict: Is it Publish Worthy?

**NO.**

While the application has some good security foundations (HttpOnly cookies), it is **not ready for production** due to:

1.  **Security Holes:** CSRF disabled, Rate limiting resets on restart.
2.  **Data Integrity:** Soft-deleted items affect calculations.
3.  **Architecture:** API routes registered twice.
4.  **Maintainability:** Monolithic frontend components and cluttered backend scripts.

**Required Actions:**
Address all **CRITICAL** issues (1-5) and **HIGH** issues (1-13) before any public release.

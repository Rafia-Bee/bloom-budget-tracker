# Decision Log

Quick reference for decisions made during development. Newest entries at top.

---

## 2025-11-30

### Input Length Validation & CSP Headers
**Issues:** #40, #39 (closed)
**Decision:**
- Added maxLength validation to all text inputs (200 for names, 50 for types, 1000 for notes)
- Implemented Content Security Policy headers on backend and frontend
**Files Changed:**
- Frontend modals: AddExpenseModal.jsx, EditExpenseModal.jsx, AddDebtModal.jsx, EditDebtModal.jsx, EditIncomeModal.jsx, AddRecurringExpenseModal.jsx, BankImportModal.jsx
- Backend: `backend/app.py` (CSP headers in after_request hook)
- Frontend: `frontend/public/_headers` (Netlify CSP + security headers)
**Impact:** Prevents DB errors from oversized inputs, improves security posture with CSP

### Enhanced Pre-Push Hook
**Decision:** Added comprehensive security and quality checks to pre-push hook
**Rationale:** GitHub branch protection unavailable on free private repos, local validation is primary defense
**Checks Added:**
- Merge conflict markers detection
- Sensitive data detection (hardcoded secrets/API keys)
- Large file detection (>1MB)
- Python import validation
- Requirements.txt sync warning
- ESLint for React code
- npm audit for critical vulnerabilities
- Frontend build validation (with visible progress)

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
- **Date:** When decision made
- **Issue/Context:** What prompted it
- **Decision:** What was decided
- **Rationale:** Why this approach
- **Impact:** What changed, files affected

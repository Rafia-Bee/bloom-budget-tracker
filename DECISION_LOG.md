# Decision Log

Quick reference for decisions made during development. Newest entries at top.

---

## 2025-12-02

### Dark Mode Implementation (Partial)

**Issue:** #24 (in progress)

**Status:** ~60% complete

**What Changed:**

- Built dark mode infrastructure: ThemeContext with localStorage, ThemeToggle component in user menu
- Configured Tailwind with custom warm plum-tinted palette (user rejected default blue-grays)
- Updated Dashboard, WeeklyBudgetCard, PeriodSelector, CatLoading components
- Fixed toggle bug (CSS selector), body background hardcode issue

**Color Palette:** #19171A base, #221F24 surface, #2B272F elevated, #FF8EA9 pink accent, #F2EDF5/#C7C1CC/#938D99 text hierarchy

**Still TODO:**

- All modal forms (Add/Edit for expenses, income, debts, recurring)
- FilterTransactionsModal, ExportImportModal, BankImportModal
- FAB menu, mobile menu, Debts page, RecurringExpenses page
- Complete Dashboard gray color replacements (9 duplicates need unique context)

---

## 2025-11-30

### Database Backup Automation & API Versioning
**Issues:** #41, #42 (closed)
**Decision:**
- Implemented automated daily database backups via GitHub Actions
- Added `/api/v1` versioned API structure with backward compatibility
**Implementation:**
- Created `scripts/backup_database.py` with PostgreSQL/SQLite support, gzip compression
- GitHub Actions workflow runs daily at 2:00 AM UTC, stores artifacts for 30 days
- Created `backend/routes/api_v1.py` blueprint aggregating all routes under `/api/v1`
- Updated frontend `.env` files to use `/api/v1` endpoints
- Maintained legacy routes (without version prefix) for backward compatibility
**Files Changed:**
- Backend: `backend/app.py` (registers v1 blueprint), `backend/routes/api_v1.py` (new)
- Frontend: `frontend/.env`, `frontend/.env.production`, `frontend/src/api.js`
- Infrastructure: `.github/workflows/backup.yml`, `scripts/backup_database.py`
- Documentation: `docs/DATABASE_BACKUP.md`, `docs/API_VERSIONING.md`, `scripts/README.md`
**Impact:** Data safety with automated backups, professional API structure for safe evolution

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

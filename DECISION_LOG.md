# Decision Log

Quick reference for decisions made during development. Newest entries at top.

---

## 2025-12-04

### Final Database Migration: Neon PostgreSQL

**Context:** Turso (libSQL) attempted but incompatible with Render free tier (requires Rust compilation for `sqlalchemy-libsql`)

**Decision:** Migrate to Neon PostgreSQL instead

**Rationale:**
- ✅ Free tier with no expiration (vs Render Postgres 90-day limit)
- ✅ 0.5GB storage (sufficient for 30-50 users)
- ✅ 100 compute hours/month (autosuspends after 5min)
- ✅ Instant cold starts (no delay like Render backend)
- ✅ Fully compatible with Render free tier (standard `psycopg2-binary`)
- ✅ PostgreSQL 17 (latest, no migration needed from Render Postgres)
- ✅ Already have SQLAlchemy models (no code changes)
- ❌ Turso failed: `sqlalchemy-libsql` requires Rust, incompatible with Render

**Implementation:**
1. Created Neon project: `bloom-tracker` (AWS EU-Central-1)
2. Updated `backend/config.py` - Simplified to PostgreSQL + SQLite fallback
3. Updated `backend/requirements.txt` - Removed Turso deps, added `psycopg2-binary>=2.9.9`
4. Updated `PROMPT_INTRO.md` - All Turso references replaced with Neon
5. Set Render env var: `DATABASE_URL` = Neon connection string
6. Removed: `TURSO_AUTH_TOKEN` (no longer needed)

**Timeline:**
- Dec 3: Attempted Turso migration
- Dec 4 AM: Discovered Render free tier incompatibility
- Dec 4 PM: Switched to Neon, deployed successfully ✅

**Files Changed:**
- `backend/config.py` - Removed Turso logic, simplified to PostgreSQL/SQLite
- `backend/requirements.txt` - Removed `libsql-client`, `sqlalchemy-libsql`
- `PROMPT_INTRO.md` - Updated all database references
- `DECISION_LOG.md` - This entry

---

## 2025-12-03

### Attempted Migration to Turso (FAILED)

**Context:** Render free PostgreSQL databases expire after 90 days (Dec 28, 2025)

**Decision:** Attempted migration to Turso (libSQL)

**Outcome:** ❌ Failed - `sqlalchemy-libsql` requires Rust compilation, incompatible with Render free tier

**Lessons Learned:**
- Render free tier has no Shell access, no build tools for Rust
- `libsql-client` alone doesn't provide SQLAlchemy dialect
- `sqlalchemy-libsql==0.1.0` works locally (Windows) but not on Render (Linux)
- Free hosting requires packages with pre-built wheels

**Next Action:** Switched to Neon PostgreSQL (see Dec 4 entry above)

---

## 2025-12-02

### Documentation Cleanup and Enhancement - COMPLETED

**Status:** Major documentation reorganization complete

**Actions Taken:**

**1. Archived Outdated Documentation (7 files):**
- PRE_PUSH_SETUP_COMPLETE.md → Setup now integrated into workflow
- EMAIL_INTEGRATION_ISSUE.md → Feature implemented (see EMAIL_SETUP.md)
- LOADING_ANIMATION_CONCEPTS.md → Design concepts implemented
- DEPLOYMENT_SAFEGUARDS.md → Superseded by DEPLOYMENT.md
- CUSTOM_DOMAIN.md → Netlify-specific, migrated to Cloudflare Pages
- API_VERSIONING.md → Consolidated into DEPLOYMENT.md
- DATABASE_BACKUP.md → Consolidated into DEPLOYMENT.md

**2. Consolidated Infrastructure Docs:**
- Added "API Versioning" section to DEPLOYMENT.md
- Added "Database Backup & Recovery" section to DEPLOYMENT.md
- Reduced duplication, maintained all critical information

**3. Created New Documentation:**
- **API.md** - Complete API reference with all endpoints, request/response examples, authentication, error codes, rate limiting (957 lines)
- **Dark Mode section in USER_GUIDE.md** - Toggle instructions, color scheme, system preference support, troubleshooting

**4. Reorganized docs/README.md:**
- Categorized into: Core, Feature, Infrastructure, Development
- Added descriptions for each document
- Listed archived documents with archival reasons
- Added documentation principles (Actionable, Current, Concise, User-focused)

**Result:**
- 9 active documents (down from 16)
- Clear organization and categorization
- No information loss - everything consolidated or archived
- Better discoverability and navigation

**Files Modified:**
- `docs/README.md` - Complete reorganization
- `docs/USER_GUIDE.md` - Added dark mode section
- `docs/API.md` (new) - Complete API documentation
- `docs/DEPLOYMENT.md` - Added API versioning and backup sections
- Moved 7 files to `docs/archive/`

**Commits:**
- `e8060d8` - docs: cleanup and consolidation
- `fb793c9` - docs: add dark mode and API documentation

---

### Cloudflare Pages Migration - COMPLETED

**Issue:** Netlify free tier deploy credits exhausted

**Status:** Migration complete, site live at https://bloom-tracker.app

**Why Cloudflare Pages:**
- ✅ Unlimited deploys (no build credits)
- ✅ Unlimited bandwidth
- ✅ Perfect Vite/PWA compatibility (zero config needed)
- ✅ Already using Cloudflare for DNS (seamless integration)
- ✅ Superior CDN edge caching
- ✅ Free password protection via Cloudflare Access (up to 50 users)

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
- `frontend/public/_routes.json` (new) - SPA routing config
- `docs/CLOUDFLARE_MIGRATION.md` (new) - Complete migration guide
- `docs/DEPLOYMENT.md` - Updated all hosting references
- `README.md` - Updated production deployment section
- `docs/README.md` - Added migration guide reference
- `docs/CUSTOM_DOMAIN.md` - Archived with warning notice
- `netlify.toml` (deleted) - No longer needed

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
- `1f0221d` - feat: add Cloudflare Pages migration configuration
- `f3a0400` - fix: add npm install to Cloudflare Pages build command
- `915b39f` - chore: remove Netlify configuration after migration to Cloudflare Pages
- `ac4b2c7` - docs: update deployment guide for Cloudflare Pages migration

---

### Dark Mode Implementation - COMPLETED

**Issue:** #24 (closed)

**Status:** 100% complete across entire application

**Session Summary:**
Completed comprehensive dark mode implementation for all remaining pages, components, and modals. Applied warm plum-tinted dark theme consistently throughout the application.

**What Changed Today:**

**Main Pages (6 total):**

- Debts.jsx - Full page including summary cards, debt list, transaction history, archived section
- RecurringExpenses.jsx - Active/Paused sections, expense cards, generation banner, all modals
- Login.jsx - Complete auth flow with form inputs and error states
- Register.jsx - Registration form with validation and password hints
- ResetPassword.jsx - All 3 states (validating, invalid token, success)
- Dashboard.jsx - Warning modal for exceeding balance/credit

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

- SalaryPeriodWizard.jsx - Full 3-step budget setup wizard with all form inputs
- PeriodSelector.jsx - Calendar grid view and dropdown list with period cards
- DraggableFloatingButton.jsx - FAB popup menu (Add Income/Expense/Debt Payment buttons)
- Dashboard mobile menu - Navigation drawer with links and user info
- Warning modals - Exceeding balance/credit confirmation dialogs
- Generate Now confirmation modal - RecurringExpenses generation prompt

**Bug Fixes:**

- RecurringExpenses Active section background (user-reported)
- Bright white input boxes in budget setup wizard
- Light backgrounds on salary period selector cards (calendar grid and dropdown)
- Period card border colors (toned down neon green/blue to subtle grays)
- "Now" badge contrast (white text on green-600 background)
- Leftover budget card (bright green → dark green-950/30)
- Generate Now modal (white background → dark-surface)
- JSX syntax error in RecurringExpenses (stray closing bracket)

**Technical Approach:**

- Used multi_replace_string_in_file for targeted updates (8-19 replacements per modal)
- Used PowerShell bulk operations for large files with repeated patterns
- Applied consistent color palette: dark-base, dark-surface, dark-elevated, dark-pink, dark-text hierarchy
- Pattern: backdrop → card → header → form elements → buttons → helper text
- Fixed pre-push hook failures (black formatting, JSX syntax)

**Color Palette:**

- Base: #19171A (darkest background)
- Surface: #221F24 (card backgrounds)
- Elevated: #2B272F (elevated surfaces, inputs)
- Pink: #FF8EA9 (primary accent)
- Text: #E8E6E9 (primary), #A8A5AA (secondary), #3D393F (borders)
- Danger: #FF6B6B (error states)

**Files Modified:** 25 total

- 6 page files (Debts, RecurringExpenses, Login, Register, ResetPassword, Dashboard)
- 16 modal components (all application modals)
- 3 supporting components (SalaryPeriodWizard, PeriodSelector, DraggableFloatingButton)

**Validation:**

- User tested each component after completion with iterative feedback
- Quick feedback loop maintained throughout session
- All 8 reported issues fixed immediately
- Pre-push hooks passed (black formatting, build validation)

**Status:** 100% complete - All pages, modals, and components now support dark mode

**GitHub Issue:** #24 - Closed (Dark mode implementation complete)

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


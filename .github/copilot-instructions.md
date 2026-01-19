# Bloom Budget Tracker - Copilot Instructions

## 🚨 Critical Rules

1. **ALWAYS call `ask_user` before ending ANY response** - Stop only when user says: "end", "stop", "done", "terminate", "quit"
2. **NEVER push directly to `main`** - Always use PRs, create feature branch FIRST
3. **NEVER push unless explicitly asked** - Only provide push commands when requested
4. **⚠️ ZERO TOLERANCE FOR WARNINGS** - NEVER ignore ANY warning: linting, tests, terminal, console, build - ALL must be addressed. If fixing would take significant time or there are many warnings, report them and ask for instructions.
5. **Run `bformat` then tests** before any commit - Ask user to run `btest f`, `btest b`
6. **Branch naming:** `feat/`, `fix/`, `docs/`, `refactor/`
7. **🗄️ PRODUCTION DB FIRST** - Before ANY database change (migrations, queries, data updates), ALWAYS query production database to verify current state. Never assume local DB matches production.

---

## 📋 Quick Commands

| Action         | Command    |
| -------------- | ---------- |
| Start servers  | `bstart`   |
| Stop servers   | `bstop`    |
| Format code    | `bformat`  |
| DB migrations  | `bmigrate` |
| Backend tests  | `btest b`  |
| Frontend tests | `btest f`  |
| E2E tests      | `btest e`  |

**Ports:** Backend `:5000`, Frontend `:3000`

---

## 🏗️ Architecture Essentials

-   **Money:** All amounts stored as integer cents (`1500` = €15.00)
-   **Two-tier periods:** SalaryPeriod (parent) → BudgetPeriods (auto-created children). Never create BudgetPeriods manually.
-   **Balance modes:** `sync` (cumulative) vs `budget` (isolated per period)
-   **Database:** SQLite dev (`instance/bloom.db`), PostgreSQL prod (Neon)
-   **Production migrations:** Write SQL scripts manually → run on Neon SQL Editor

---

## 📝 Code & Commit Style

-   Keep files under 300 lines
-   File header documentation (no inline comments)
-   Commit format: `feat: description (#XX)`
-   Use `.venv` for Python

---

## 📄 Documentation

Update docs based on change type - see `docs/` for specific guides. Always update `DECISION_LOG.md` for architectural changes.

**DECISION_LOG.md format:**

```markdown
## YYYY-MM-DD: [Title]

**Session Summary:** What was completed
**What's Next:** Pending tasks
**Files to Note:** Key files for context
```

---

## 🎯 Context-Specific Instructions

**Read the relevant instruction file ONLY when working on that area:**

| Working On                           | Read This File                     |
| ------------------------------------ | ---------------------------------- |
| Backend (Python/Flask/routes/models) | `.github/BACKEND_INSTRUCTIONS.md`  |
| Frontend (React/JSX/components/CSS)  | `.github/FRONTEND_INSTRUCTIONS.md` |
| Database (migrations/queries/schema) | `.github/DATABASE_INSTRUCTIONS.md` |

**Rules:**

-   If editing files in `backend/` → read BACKEND_INSTRUCTIONS.md
-   If editing files in `frontend/` → read FRONTEND_INSTRUCTIONS.md
-   If writing SQL or changing database schema → read DATABASE_INSTRUCTIONS.md
-   Do NOT read instruction files for areas you're not working on

---

## 📚 Reference Documents

Read these as needed for specific tasks:

-   Architecture: `docs/ARCHITECTURE.md`
-   API: `docs/API.md`
-   Testing: `docs/TESTING.md`, `frontend/TEST_COVERAGE.md`
-   Deployment: `docs/DEPLOYMENT.md`
-   Security: `docs/SECURITY.md`
-   Feature Flags: `docs/FEATURE_FLAGS.md`
-   Design colors: `tailwind.config.js`

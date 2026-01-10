# Prompt Templates

Copy-paste these for common tasks.

---

## 📋 Create GitHub Issue

```
**Task:** Create GitHub issue for [brief description]

**Requirements:**
- [Requirement 1]
- [Requirement 2]

**Workflow:**
1. Research relevant code/documentation
2. Report: security, pros/cons, design notes, questions
3. Create issue via temp file with labels (priority + effort)

**For DB migration:** Include SQL script template in issue body.
```

---

## 🔧 Implement GitHub Issue

```
**Task:** Implement issue #[number]

**Workflow:**
1. Read issue: gh issue view [number]
2. Create branch FIRST: git checkout -b feat/description
3. Divide into phases if complex
4. For each phase: tests → code → DECISION_LOG → bformat → commit
5. NEVER push unless explicitly told

**For Bug:** Create test to reproduce first.
**For DB Migration:** Write Flask-Migrate locally, test, convert to SQL, save to docs/migrations/.

**⚠️ FOR ANY DATABASE CHANGES:** See "Production Database Verification Checklist" below - ALWAYS query production DB first.
```

---

## 🐛 Bug Report

```
**Task:** Bug report for [description]

**Observed:** [What's happening]
**Expected:** [What should happen]

**Workflow:** Research → root-cause analysis report with E2E test approach → create issue with priority and effort labels
```

---

## 🗄️ Production Database Verification Checklist

**⚠️ CRITICAL: ALWAYS check production database state before ANY database-related change including:**

- Schema migrations (adding/modifying columns, constraints)
- Data migrations (updating existing records)
- New queries or query modifications
- Balance/period calculations
- Any feature touching existing data

**Verification queries to run on production BEFORE writing any migration or query:**

```sql
-- Check current table structure and constraints
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_name = '[table]';

-- Check existing data state that will be affected
SELECT * FROM [table] WHERE [conditions] LIMIT 10;

-- Verify counts and sums before migration
SELECT COUNT(*), SUM(amount) FROM [table] WHERE [conditions];

-- Check for any edge cases (NULL values, inactive records, soft-deleted rows)
SELECT COUNT(*) FROM [table] WHERE [column] IS NULL OR is_active = false OR deleted_at IS NOT NULL;
```

**The Rule:** Never assume local database state matches production. Always verify production data state before writing migrations.

**Lesson learned (2026-01-10):** Balance calculation migration failed to account for `is_active=false` on historical periods, causing sync mode to use wrong date range for income/expense queries.

---

## ⚡ Minimal Prompts

```
Create GH issue for [description]. Research, report pros/cons/security.
```

```
Implement #[number]. Branch first, phases with commits, tests required.
```

```
Bug issue for [description]. Research, consider E2E test.
```

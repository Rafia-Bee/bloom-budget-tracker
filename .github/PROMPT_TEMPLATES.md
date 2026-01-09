# TaskSync Prompt Templates

Copy-paste these templates for common tasks. These contain scenario-specific workflows.

For permanent reference (architecture, design, commands): See `copilot-instructions.md`

---

## 📋 Create GitHub Issue

```
**Task:** Create a GitHub issue for [brief description]

**Requirements:**
- [Requirement 1]
- [Requirement 2]

**Workflow:**
1. Research relevant code/documentation
2. Create report: security, pros/cons, design notes, questions
3. Write to temp file, create issue using --body-file
4. Apply labels: priority (critical/high/medium/low) + effort (quick win/medium/difficult)

**Issue CLI Pattern:**
@"
## Description
[Description]

## Acceptance Criteria
- [ ] Criterion 1
"@ | Out-File issue_body.md -Encoding utf8
gh issue create --title "feat: description" --body-file issue_body.md --label "priority: medium" --label "medium"
Remove-Item issue_body.md
```

---

## 🔧 Implement GitHub Issue

```
**Task:** Implement issue #[number]

**Workflow:**
1. Read issue: gh issue view [number]
2. Create branch FIRST: git checkout -b feat/description
3. Divide into phases if complex
4. For each phase:
   - Write/update tests for new functionality
   - Make code changes
   - Update DECISION_LOG.md
   - Run bformat and then ask_user to run btest
   - Commit: git add . && git commit -m "feat: description (#XX)"
   - Ask user before continuing to next phase
5. Reference issue in commits
6. NEVER push unless explicitly told

**For Bug Issues:** Create E2E/Frontend/Backend test to reproduce first.
```

---

## 🐛 Bug Report

```
**Task:** Create bug report for [description]

**Observed:** [What's happening]
**Expected:** [What should happen]
**Steps:** [If known]

**Workflow:**
1. Research code to understand issue
2. Report: security, potential fixes, E2E test approach
3. Create issue with labels
```

---

## 🚀 Git Workflow

```
**Pre-Work:**
1. Create branch FIRST: git checkout -b feat/description
2. Make changes on feature branch
3. bformat
4. Update docs per change type
5. btest f / btest b / btest e
6. git add . && git commit -m "feat: description (#XX)"

**Push (only when asked):**
git push -u origin feat/branch-name
gh pr create --fill

**After CI passes:**
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## 🗄️ Database Migration

```
**Development (SQLite):**
bmigrate

**Production (Neon PostgreSQL):**
1. Write migration with Flask-Migrate locally
2. Test locally with SQLite
3. Convert to raw SQL script
4. Save to: docs/migrations/YYYY-MM-DD_description.sql
5. Run manually on Neon SQL Editor

**SQL Template:**
-- Migration: [description]
-- Date: YYYY-MM-DD
-- Issue: #XX

-- Forward
ALTER TABLE ...;

-- Verification
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'table';
```

---

## 🧪 Testing Workflow

```
**Before Commit:**
- bformat (Black + Prettier)
- btest b (backend)
- btest f (frontend)
- btest e (E2E, if UI changes)

**Coverage Commands:**
pytest --cov=backend --cov-report=html
npm test -- --run --coverage

**Rules:**
- NEVER skip failing tests - ask developer for options
- NEVER push until tests pass locally
- Start long tests with isBackground: true, ask user for results
```

---

## 📚 Documentation Updates

```
| Change Type          | Update These                              |
| -------------------- | ----------------------------------------- |
| Major feature        | README, DEVELOPMENT_REFERENCE, USER_GUIDE |
| Architecture         | ARCHITECTURE.md, DECISION_LOG.md          |
| Session summary      | DECISION_LOG.md                           |
| API changes          | docs/API.md, DEVELOPMENT_REFERENCE        |
| Security             | docs/SECURITY.md                          |
| Tests                | TEST_COVERAGE.md, docs/TESTING.md         |
| Deployment           | docs/DEPLOYMENT.md                        |
| Feature flags        | docs/FEATURE_FLAGS.md                     |
| Mobile/PWA           | docs/MOBILE_DEV.md                        |
| DB migrations        | docs/migrations/                          |

**DECISION_LOG.md Format:**
## YYYY-MM-DD: [Title]
**Session Summary:** What was completed
**What's Next:** Pending tasks
**Files to Note:** Key files
```

---

## 🚫 Warnings & Errors

```
**When encountering ANY warning/error:**
1. NEVER ignore - even if pre-existing
2. Inform developer: what, why, how to fix, effort estimate
3. Track in issues if deferred

| Type          | Action                    |
| ------------- | ------------------------- |
| Linting       | Fix immediately           |
| Deprecation   | Create issue              |
| Console       | Investigate, fix/document |
| Build         | Never ship with warnings  |
| Test          | Fix before merge          |
```

---

## ⚡ Minimal Prompts

**Create issue:**

```
Create GH issue for [description]. Research code, report pros/cons/security, use temp file.
```

**Implement issue:**

```
Implement #[number]. Branch first, phases with commits, tests required, update docs.
```

**Bug report:**

```
Create bug issue for [description]. Research, report, consider E2E test.
```

---

## 🚨 Quick Commands

| Action         | Command                     |
| -------------- | --------------------------- |
| View issue     | `gh issue view [number]`    |
| List issues    | `gh issue list`             |
| Format code    | `bformat`                   |
| Frontend tests | `btest f`                   |
| Backend tests  | `btest b`                   |
| E2E tests      | `btest e`                   |
| Create branch  | `git checkout -b feat/name` |
| Start servers  | `bstart`                    |
| Stop servers   | `bstop`                     |
| DB migrations  | `bmigrate`                  |

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
```

---

## 🐛 Bug Report

```
**Task:** Bug report for [description]

**Observed:** [What's happening]
**Expected:** [What should happen]

**Workflow:** Research → report with E2E test approach → create issue with labels
```

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

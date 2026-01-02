# TaskSync Prompt Templates

Copy-paste these templates for common tasks. Key reminders are built-in to prevent context loss.

---

## 📋 Create GitHub Issue

```
**Task:** Create a GitHub issue for [brief description]

**Requirements:**
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Workflow:**
1. Research relevant code/documentation areas based on requirements
2. Create a report covering:
   - Security considerations
   - Pros and cons of implementing
   - Design notes (if user-facing)
   - Any questions about requirements
3. Write report to temp file, create issue using --body-file
4. Apply priority label (`priority: critical`/`priority: high`/`priority: medium`/`priority: low`) and effort label (quick win/medium/difficult)

**Note:** No in-depth code/test analysis needed - just overall look-through for context.
```

---

## 🔧 Implement GitHub Issue

```
**Task:** Implement issue #[number]

**Reminders:**
- Read issue details with: gh issue view [number]
- Create feat/ or fix/ branch FIRST before any code changes
- Divide work into phases as necessary
- Update DECISION_LOG.md if architectural decisions → commit after each phase and then ask_user for instructions on whether to continue to next phase
- Write/update tests for new functionality
- Run bformat and btest before suggesting commits
- Reference issue in commit: "feat: description (#XX)"
- Close with: fixes #XX in PR description (do NOT close unless explicitly told)
- NEVER push unless explicitly told to do so
```

---

## 🐛 Bug Report (Create Issue)

```
**Task:** Create bug report issue for [bug description]

**Observed:** [What's happening]
**Expected:** [What should happen]
**Steps to reproduce:** [If known]

**Workflow:**
1. Research relevant code/documentation to understand the issue
2. Create a report covering:
   - Security considerations
   - Pros and cons of potential fixes
   - Design notes (if user-facing)
   - Any questions about the bug
3. Write report to temp file, create issue using --body-file
4. Apply priority label and effort label
5. **For UI bugs:** Note in issue if E2E test should be created to reproduce the bug (especially if not fixing immediately)
```

---

## 🚨 Quick Commands Reference

| Action             | Command                     |
| ------------------ | --------------------------- |
| View issue         | `gh issue view [number]`    |
| List issues        | `gh issue list`             |
| Format code        | `bformat`                   |
| Run frontend tests | `btest f`                   |
| Run backend tests  | `btest b`                   |
| Run E2E tests      | `btest e`                   |
| Create branch      | `git checkout -b feat/name` |
| Start servers      | `bstart`                    |

---

## ⚡ Minimal Prompts

**Create issue:**

```
Create GH issue for [description]. Research code, report pros/cons/security, use temp file for body.
```

**Implement issue:**

```
Implement #[number]. Branch first, phases with commits, tests required, update docs per change type.
```

**Bug report:**

```
Create bug issue for [description]. Research, report, consider E2E test for UI bugs.
```

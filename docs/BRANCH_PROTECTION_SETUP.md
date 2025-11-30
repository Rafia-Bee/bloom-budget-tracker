# Branch Protection Setup Guide

**Purpose:** Prevent broken code from deploying to production by requiring CI/CD checks to pass.

---

## Why Branch Protection?

**Problem:** Netlify and Render deploy immediately on push, even if CI/CD fails.

**Solution:** GitHub branch protection rules block pushes to `main` unless CI/CD passes.

**Benefits:**
- ✅ No wasted deploy credits
- ✅ CI/CD failures block deployment
- ✅ Forces quality checks before production

---

## Setup Instructions

### Step 1: Enable Branch Protection

1. Go to: https://github.com/Rafia-Bee/bloom-budget-tracker/settings/branches
2. Click **"Add branch protection rule"**
3. **Branch name pattern:** `main`
4. Enable these settings:
   - ☑️ **Require a pull request before merging**
     - Uncheck "Require approvals" (solo developer)
   - ☑️ **Require status checks to pass before merging**
     - Search and select:
       - `Backend - Lint & Format`
       - `Frontend - Build & Lint`
   - ☑️ **Require branches to be up to date before merging**
   - ☑️ **Do not allow bypassing the above settings** (optional, for strict enforcement)
5. Click **"Create"**

### Step 2: Updated Git Workflow

**Old workflow (direct push to main):**
```powershell
git add .
git commit -m "feat: something"
git push origin main  # ❌ Can push broken code
```

**New workflow (PR-based):**
```powershell
# 1. Create feature branch
git checkout -b fix/some-issue

# 2. Make changes and commit
git add .
git commit -m "fix: something"

# 3. Push to feature branch
git push origin fix/some-issue

# 4. Create PR on GitHub (or use gh CLI)
gh pr create --title "Fix something" --body "Description"

# 5. Wait for CI/CD to pass (GitHub Actions runs automatically)

# 6. Merge PR (if checks pass)
gh pr merge --squash

# 7. Pull merged changes
git checkout main
git pull origin main
```

**Quick PR workflow (gh CLI):**
```powershell
# One-liner to create and auto-merge (if CI passes)
git checkout -b fix/quick-fix
git add .
git commit -m "fix: quick fix"
git push origin fix/quick-fix
gh pr create --fill --base main
gh pr merge --auto --squash  # Auto-merges when CI passes
```

### Step 3: Bypass for Emergencies

If you need to push directly (e.g., fixing broken CI):

**Option A: Use admin override** (if you're repo admin):
- Push will show warning but allow override

**Option B: Temporarily disable protection:**
1. Go to branch protection settings
2. Delete the rule
3. Push changes
4. Re-enable protection

**Option C: Use `--no-verify` for pre-push hook only:**
```powershell
# Skips local pre-push hook, but CI still runs
git push origin main --no-verify
```

---

## What Gets Checked

### Local (Pre-Push Hook)
- ✅ Black code formatting
- ✅ Flake8 critical errors
- ✅ Frontend build
- ✅ Console.log detection

### Remote (GitHub Actions CI)
- ✅ Backend: flake8, black --check, pytest
- ✅ Frontend: npm build, console.log check
- ✅ Runs on every push and PR

---

## Troubleshooting

**Q: CI failed but I can't see why?**
- Check GitHub Actions tab: https://github.com/Rafia-Bee/bloom-budget-tracker/actions
- Click failed workflow to see logs

**Q: Pre-push hook not running?**
- Check if file exists: `.git/hooks/pre-push`
- Check if executable: `ls -l .git/hooks/pre-push`
- Re-run setup: `git update-index --chmod=+x .git/hooks/pre-push`

**Q: Want to skip pre-push hook temporarily?**
```powershell
git push origin main --no-verify
```

**Q: Want to test CI without pushing?**
```powershell
# Backend
.venv\Scripts\Activate.ps1 ; black --check backend/
.venv\Scripts\Activate.ps1 ; flake8 backend/

# Frontend
cd frontend ; npm run build ; cd ..
```

---

## Cost Savings

**Before protection:**
- Push broken code → Netlify deploys (1 credit) → Render deploys (1 credit) → CI fails → Fix → Push again (2 more credits)
- **Total:** 4 wasted credits

**After protection:**
- Push to branch → CI fails → Fix → Push → CI passes → Merge → Deploy once
- **Total:** 1 credit used (only successful deploy)

**Annual savings:** ~50+ wasted deploys prevented

---

## Migration Path

**Current state:**
- ✅ Pre-push hook active (local checks)
- ⏳ Branch protection not enabled (still direct push to main)

**Recommended:**
1. Test current workflow for 1-2 weeks with pre-push hook
2. If comfortable, enable branch protection
3. Switch to PR-based workflow for all changes

**Solo dev-friendly alternative:**
- Enable branch protection but uncheck "Require pull request"
- This allows direct push to main, but only if CI passes
- Best of both worlds: no PR overhead, but CI enforcement

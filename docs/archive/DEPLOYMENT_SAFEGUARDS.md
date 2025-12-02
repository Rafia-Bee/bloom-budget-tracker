# Deployment Safeguards Guide

**Purpose:** Prevent broken code from deploying to production and wasting deployment credits.

---

## IMPORTANT: GitHub Plan Limitation

Branch protection rules, including "Require status checks to pass," are **not available on free private repositories**. This feature requires a GitHub Team or GitHub Enterprise plan.

**Therefore, our primary strategy will rely on the local pre-push hook to prevent bad pushes.** The GitHub Actions CI will serve as a secondary notification system, but it **will not block deployments** on its own.

---

## Strategy 1: Pre-Push Hook (Primary Defense)

This is our main line of defense. A script runs on your local machine *before* your code is pushed to GitHub. If any checks fail, the push is automatically aborted.

**Your workflow does not change.**

```powershell
# 1. Make your changes
git add .
git commit -m "feat: add new feature"

# 2. Push to main (pre-push hook runs automatically)
git push origin main
```

**What Happens:**
1.  The pre-push hook runs all local checks (`black`, `flake8`, `npm run build`, etc.).
    -   **If Checks Pass:** Your code is pushed to GitHub, and deployment proceeds.
    -   **If Checks Fail:** The push is blocked. You will see an error in your terminal. No code is pushed, and no deployment occurs.

This was already set up in the previous steps. You can see the script at `.git/hooks/pre-push`.

---

## Strategy 2: CI Pipeline (Secondary Notification)

Even though it can't block deployments, our GitHub Actions CI pipeline is still valuable. It runs on every push and serves as a safety net.

**What Happens:**
1.  You push your code (assuming it passed the local pre-push hook).
2.  GitHub Actions runs the `Backend - Lint & Format` and `Frontend - Build & Lint` jobs.
3.  **If a job fails:**
    -   You will receive an email from GitHub.
    -   You will see a red "X" next to your commit in the repository history.
    -   **ACTION REQUIRED:** Since the deployment may have already proceeded with the broken code, you should immediately push a fix or roll back the deployment on Netlify/Render.

---

## What To Do If a Bad Deploy Happens

If a commit with a red 'X' gets deployed, you can roll back to a previous working version on your hosting providers:

-   **Netlify (Frontend):** Go to your site's "Deploys" tab, find a previous successful deploy, and click "Publish deploy".
-   **Render (Backend):** Go to your service's "Events" tab, find a previous successful deploy, and click "Deploy".

---

## Reference: Branch Protection Setup (Requires Paid Plan)

The following instructions are for reference if you upgrade to a GitHub Team or Enterprise plan in the future. On the free plan for private repos, these rules **cannot be enforced**.

### Step 1: Enable Branch Protection via GitHub UI

1.  **Go to Branch Settings:**
    *   Navigate to: `https://github.com/Rafia-Bee/bloom-budget-tracker/settings/branches`
2.  **Add Rule:**
    *   Click **"Add branch protection rule"**.
3.  **Configure Rule:**
    *   **Branch name pattern:** `main`
    *   **Leave UNCHECKED:** `Require a pull request before merging`.
    *   **CHECK:** `Require status checks to pass before merging`.
        *   In the search box that appears, add your CI jobs:
        *   `Backend - Lint & Format`
        *   `Frontend - Build & Lint`
    *   **CHECK (Recommended):** `Require branches to be up to date before merging`.
4.  **Save:**
    *   Click **"Create"** at the bottom.

### Step 2: Your Updated Git Workflow (Stays the Same!)

Your workflow doesn't change. You still push directly to main.

**Workflow:**
```powershell
# 1. Make your changes
git add .
git commit -m "feat: add new feature"

# 2. Push to main (pre-push hook runs first)
git push origin main
```

**What Happens:**
1.  **Local:** The pre-push hook runs to catch errors on your machine.
2.  **Remote:** GitHub Actions runs the CI pipeline.
    -   **If CI Passes:** The `main` branch is updated, and Netlify/Render deploy.
    -   **If CI Fails:** The push is rejected. The `main` branch is not updated. **No deployment occurs.** You will see an error in your terminal.

---

## Alternative: Strict Pull Request Workflow

If you want to enforce a stricter PR-based workflow, follow the same steps as above but also **CHECK** the `Require a pull request before merging` box.

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

**Security Checks:**
- ✅ Merge conflict markers detection
- ✅ Hardcoded secrets/API keys detection
- ✅ Large file detection (>1MB)

**Backend Checks:**
- ✅ Black code formatting
- ✅ Flake8 critical errors
- ✅ Python import validation
- ✅ Requirements.txt sync check (warning only)

**Frontend Checks:**
- ✅ Console.log detection
- ✅ ESLint linting (warnings allowed)
- ✅ npm vulnerability audit (critical only)
- ✅ Frontend build

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

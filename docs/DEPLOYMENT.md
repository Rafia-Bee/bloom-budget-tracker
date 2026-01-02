# Bloom Budget Tracker - Deployment Guide

This guide covers the production deployment setup for Bloom Budget Tracker.

---

## Current Production Setup

### Hosting Services

**Frontend (Cloudflare Pages)**

-   URL: https://bloom-tracker.app (custom domain)
-   Default URL: https://bloom-budget-tracker.pages.dev
-   Framework: React + Vite
-   Auto-deploys from: `main` branch
-   Build command: `cd frontend && npm install && npm run build`
-   Build output: `frontend/dist`

**Backend (Render)**

-   URL: https://bloom-backend-b44r.onrender.com
-   Framework: Flask (Python)
-   Plan: Free tier
-   Auto-deploys from: `main` branch
-   Start command: `gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app`

**Database (Neon PostgreSQL)**

-   Type: PostgreSQL (Neon serverless)
-   Plan: Free tier (0.5GB storage, 100 hours compute/month)
-   Auto-suspends after 5 minutes of inactivity
-   Connection pooling enabled
-   Backup: Automatic via Neon

---

## Environment Variables

### Backend Environment Variables (Render)

Required variables to set in Render dashboard:

```bash
# Flask Configuration
FLASK_APP=backend/app.py
FLASK_ENV=production
SECRET_KEY=<generate-strong-secret-key>
JWT_SECRET_KEY=<generate-strong-jwt-secret>

# Database (Neon PostgreSQL)
DATABASE_URL=<neon-postgresql-connection-string>

# CORS - Frontend URL
CORS_ORIGINS=https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev
FRONTEND_URL=https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev

# Optional: Email (SendGrid)
SENDGRID_API_KEY=<your-sendgrid-api-key>
SENDGRID_FROM_EMAIL=noreply@bloom-budget.com

# Optional: Credit Card Limit
CREDIT_CARD_LIMIT=1500
```

### Frontend Environment Variables (Cloudflare Pages)

No environment variables needed - API URL is hardcoded in frontend for simplicity:

```javascript
// Frontend uses runtime API URL from axios baseURL
const API_URL =
    import.meta.env.VITE_API_URL || "https://bloom-backend-b44r.onrender.com";
```

---

## Deployment Process

### Initial Setup

**1. Database (Neon)**

1. Create Neon account at https://neon.tech
2. Create new project (name: bloom-tracker)
3. Select PostgreSQL 17, AWS region closest to Render backend
4. Copy connection string (postgresql://...)
5. No additional configuration needed - autosuspends after 5min

**2. Backend (Render)**

1. Connect GitHub repository to Render
2. Create new Web Service
3. Configure build settings:
    - Build Command: `pip install -r backend/requirements.txt`
    - Start Command: `gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app`
    - Python Version: 3.11.9
4. Set environment variables (including DATABASE_URL from Neon)
5. Deploy

**3. Frontend (Cloudflare Pages)**

1. Connect GitHub repository to Cloudflare Pages
2. Configure build settings:
    - Build command: `cd frontend && npm install && npm run build`
    - Build output directory: `frontend/dist`
    - Root directory: `/` (leave empty)
3. Add custom domain: `bloom-tracker.app`
4. Deploy

### Continuous Deployment

Both services auto-deploy when changes are pushed to the `main` branch:

```bash
git add .
git commit -m "your commit message"
git push origin main
```

-   **Cloudflare Pages**: Builds and deploys frontend automatically (~2-3 minutes)
-   **Render**: Builds and deploys backend automatically (~3-5 minutes)

**Note:** Free tier services sleep after 15 minutes of inactivity. First request after sleep takes 30-60 seconds (cold start).

---

## Safe Deployment Workflow

1. **Develop locally**: Test all changes on localhost
2. **Run tests**: `python -m pytest backend/tests/ -v`
3. **Build frontend**: `cd frontend && npm run build` (verify no errors)
4. **Commit & push**: `git push origin main`
5. **Manual deploy**:
    - Frontend: Cloudflare Pages dashboard → Retry deployment
    - Backend: Render dashboard → Manual Deploy → Deploy latest commit
6. **Verify production**: Visit https://bloom-tracker.app and test key flows

---

## Database Management

### Schema Migrations

Bloom uses **Flask-Migrate** (Alembic) for database schema versioning and migrations.

#### Creating a New Migration

When you modify database models in [backend/models/database.py](../backend/models/database.py):

```bash
# 1. Activate virtual environment
.venv\Scripts\Activate.ps1

# 2. Generate migration from model changes
flask db migrate -m "Description of changes"

# 3. Review the generated migration file in backend/migrations/versions/

# 4. Apply the migration
flask db upgrade

# 5. Commit both the code changes and migration file
git add backend/models/database.py backend/migrations/versions/*.py
git commit -m "feat: add new column to expenses table (#XX)"
```

#### Common Migration Commands

```bash
# Show current migration revision
flask db current

# Show migration history
flask db history

# Upgrade to latest schema
flask db upgrade

# Rollback one migration
flask db downgrade

# Show SQL that would be executed
flask db upgrade --sql
```

#### Production Deployment

Migrations run automatically during deployment:

-   **Render**: `buildCommand` includes `flask db upgrade`
-   Manual deployment: SSH to server and run `flask db upgrade`

**⚠️ First-Time Migration Setup (One-Time Only)**

If deploying Flask-Migrate for the first time to an existing production database with tables created by `db.create_all()`:

1. **Option A - Safe Approach**: SSH into Render and run:

    ```bash
    flask db stamp head
    ```

    This marks the current database state as "already migrated" without trying to recreate existing tables.

2. **Option B - Let Alembic Handle It**: The initial migration is designed to detect existing tables and skip them. Monitor the Render build logs during first deployment to verify no errors occur.

After the first deployment with Flask-Migrate, all future migrations will work automatically.

#### Migration Best Practices

1. **Always review generated migrations** before committing
2. **Test migrations** in development before deploying
3. **Migrations are irreversible** in production - test rollback paths
4. **Include migrations in commits** with corresponding model changes
5. **Never edit applied migrations** - create new ones instead

#### Data Cleanup Scripts

For one-time data fixes (not schema changes), use admin endpoints or manual scripts:

**Remove Duplicate Initial Balance Entries** (Run after deploying fix):

Option A - Via API (Recommended for Render free tier):

```bash
# Use curl or Postman to call the admin endpoint
# Replace <your-token> with your actual JWT token from login
curl -X POST https://bloom-backend-b44r.onrender.com/admin/remove-duplicate-initial-balances \
  -H "Authorization: Bearer <your-token>"
```

Option B - Via Script (Requires Render shell access):

```bash
python scripts/remove_duplicate_initial_balances.py
```

This removes duplicate "Initial Balance" entries that were created by a bug (fixed in commit 76fb0c0). It keeps only the earliest Initial Balance for each user.

### Backups

-   **Automatic**: Render performs daily backups (free tier: 7-day retention)
-   **Manual**: Export from Render dashboard or use `pg_dump`

---

## Security Considerations

### Secrets Management

-   ✅ All secrets stored as environment variables
-   ✅ `.env` files in `.gitignore`
-   ✅ Separate dev/production configurations
-   ⚠️ Rotate secrets regularly

### CORS Configuration

Production CORS is restricted to frontend domains:

```python
CORS_ORIGINS=https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev
```

Update in Render dashboard when domain changes.

### Database Security

-   ✅ SSL/TLS required for connections
-   ✅ Connection pooling with `pool_pre_ping`
-   ✅ No public database access

---

## Performance Optimization

### Backend (Render Free Tier)

**Limitations:**

-   Sleeps after 15 minutes of inactivity
-   512 MB RAM
-   Shared CPU

**Optimizations:**

-   Gunicorn with 4 workers
-   Connection pooling enabled
-   JWT tokens with 24-hour expiry (offline support)

### Frontend (Cloudflare Pages)

**Optimizations:**

-   Vite production build (minified, tree-shaken)
-   Progressive Web App (PWA) for offline support
-   Service worker caching
-   Cloudflare CDN edge caching
-   Unlimited bandwidth and builds

---

## Monitoring

### Current Setup

**Custom Loading Animations**

-   Displays cute cat animations during cold starts
-   Minimum 3-second display to ensure animation completion
-   Improves perceived performance

### Recommended (To Implement)

-   [ ] Error tracking: Sentry integration
-   [ ] Uptime monitoring: UptimeRobot or similar
-   [ ] Performance monitoring: Web vitals tracking
-   [ ] Log aggregation: Render logs dashboard

---

## Troubleshooting

### Backend Won't Start

**Check:**

1. Environment variables are set correctly
2. Database connection string is valid
3. Build logs in Render dashboard
4. Python dependencies installed correctly

**Common fixes:**

```bash
# Verify requirements.txt includes all dependencies
pip freeze > backend/requirements.txt

# Check DATABASE_URL format
# Should be: postgresql://user:pass@host:port/db
```

### Frontend Build Fails

**Check:**

1. Node version compatibility (use Node 18+)
2. All dependencies in `package.json`
3. Build logs in Cloudflare Pages dashboard
4. Build command includes `npm install`

**Common fixes:**

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### CORS Errors

**Check:**

1. `CORS_ORIGINS` includes frontend URL
2. No trailing slashes in URLs
3. HTTPS (not HTTP) in production

**Fix:**
Update Render environment variable:

```bash
CORS_ORIGINS=https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev
```

### Database Connection Issues

**Check:**

1. `DATABASE_URL` environment variable exists
2. Database is not paused (free tier limitation)
3. SSL mode is set to `require`

---

## Upgrade Paths

### Free Tier Limitations

**Render Backend:**

-   Sleeps after inactivity → Upgrade to Starter ($7/month) for always-on
-   750 hours/month limit

**Render PostgreSQL:**

-   1 GB storage → Upgrade for more space
-   7-day backup retention → Upgrade for 30-day retention

**Cloudflare Pages Frontend:**

-   Unlimited bandwidth
-   Unlimited builds
-   500 builds/month for preview deployments

### Recommended Upgrades (When Needed)

1. **Always-on backend**: Render Starter plan ($7/month)
2. **More database storage**: Render PostgreSQL Starter ($7/month)
3. **Custom domain**: Already configured (bloom-tracker.app)
4. **CDN caching**: Already included with Cloudflare Pages

---

## API Versioning

**Current Version:** v1 - `/api/v1/*`

All API endpoints use the `/api/v1/` prefix for version management and backward compatibility.

**Endpoints:**

```
/api/v1/auth/login
/api/v1/auth/register
/api/v1/expenses
/api/v1/income
/api/v1/debts
/api/v1/budget-periods
/api/v1/salary-periods
/api/v1/recurring-expenses
```

**Frontend Configuration:**

-   API URL automatically includes version prefix
-   No manual configuration needed
-   Hardcoded: `https://bloom-backend-b44r.onrender.com/api/v1`

## Database Backup & Recovery

### Automated Backups

**GitHub Actions:** Daily at 2:00 AM UTC

-   Dumps PostgreSQL database
-   Compresses and uploads to GitHub artifacts
-   30-day retention period

**Manual Trigger:**

```bash
gh workflow run backup.yml
```

### Restore Process

1. **Download backup:**

    ```bash
    gh run download <run-id> -n database-backup-<number>
    ```

2. **Decompress:**

    ```powershell
    gzip -d bloom_backup_20251202_020000.sql.gz
    ```

3. **Restore:**
    ```bash
    psql $DATABASE_URL < bloom_backup_20251202_020000.sql
    ```

**Render Built-in Backups:**

-   Free tier: 7-day retention
-   Automatic daily backups
-   Point-in-time recovery

### Disaster Recovery

If production database is lost:

1. Download latest backup from GitHub Actions or Render
2. Create new PostgreSQL instance on Render
3. Restore backup to new instance
4. Update `DATABASE_URL` environment variable
5. Restart backend service

---

## Environment Variable Reference

### Backend (.env)

```bash
# Flask
FLASK_ENV=production
SECRET_KEY=<generate-with-secrets.token_urlsafe(32)>
JWT_SECRET_KEY=<generate-with-secrets.token_urlsafe(32)>

# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# CORS
CORS_ORIGINS=https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev
FRONTEND_URL=https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev

# Optional
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@bloom-budget.com
CREDIT_CARD_LIMIT=1500
```

### Frontend (Cloudflare Pages)

No environment variables needed - API URL configured in frontend code.

---

## CI/CD Pipeline

### GitHub Actions (Implemented)

The CI/CD pipeline runs automatically on pushes and pull requests to `main`.

**Workflow:** `.github/workflows/ci.yml`

**Jobs:**

| Job               | Purpose                             | Trigger               |
| ----------------- | ----------------------------------- | --------------------- |
| `changes`         | Detect which folders changed        | Always                |
| `backend-checks`  | Flake8, Black, pytest with coverage | `backend/**` changed  |
| `frontend-checks` | Build, vitest, console.log check    | `frontend/**` changed |
| `e2e-tests`       | Playwright E2E tests                | Any code changed      |
| `coverage-report` | Coverage summary                    | After tests pass      |
| `summary`         | Final status                        | Always                |

**Smart Path Detection:**

The pipeline uses `dorny/paths-filter` to detect file changes and skip unnecessary jobs:

```
backend/**      → Run backend tests only
frontend/**     → Run frontend tests only
Both changed    → Run all tests
Docs/config     → Skip tests
```

**Skip Options:**

-   Add `[skip e2e]` to commit message to skip E2E tests
-   Add `[docs only]` to skip E2E tests

**Approximate Run Times:**

-   Full pipeline: ~8-9 minutes
-   Backend only: ~5 minutes
-   Frontend only: ~6 minutes
-   Docs only: ~1 minute

---

## Support & Resources

**Documentation:**

-   [Render Docs](https://render.com/docs)
-   [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
-   [Flask Deployment](https://flask.palletsprojects.com/en/2.3.x/deploying/)

**Monitoring:**

-   Render Dashboard: Monitor backend health
-   Cloudflare Pages Dashboard: Monitor frontend builds and analytics
-   PostgreSQL: Check database metrics

---

## Checklist for New Deployments

-   [ ] Environment variables configured
-   [ ] Database connected and initialized
-   [ ] CORS origins updated
-   [ ] Frontend API URL points to backend
-   [ ] Test login/register flow
-   [ ] Test CRUD operations
-   [ ] Verify cold start behavior
-   [ ] Check error handling
-   [ ] Confirm PWA functionality
-   [ ] Review security settings

---

**Last Updated:** December 2, 2025
**Deployment Status:** ✅ Production Ready (Migrated to Cloudflare Pages)

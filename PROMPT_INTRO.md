# Bloom Budget Tracker - Project Overview

## What is Bloom?

Bloom is a personal balance-based weekly budget tracking web application. It helps users manage their finances across 4-week salary periods with automatic carryover logic between weeks.

**Key Features:**
- Balance-based budgeting (debit card + credit card tracking)
- 4-week salary periods with weekly budget breakdowns
- Automatic weekly carryover calculations
- Expense/income tracking with categorization
- Debt management and payment allocation
- Recurring expense automation (60-day lookahead)
- Bank CSV import functionality
- Password reset via email (SendGrid)
- PWA support (offline capability)
- Dark mode with warm plum-tinted theme

## Technology Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **HTTP Client:** Axios with JWT interceptors
- **PWA:** Vite PWA plugin with service workers
- **Build Tool:** Vite 5.4

### Backend
- **Framework:** Flask 3.0 (Python 3.11)
- **Database:** Turso (libSQL - SQLite-compatible cloud database)
- **ORM:** SQLAlchemy 2.0 with Flask-SQLAlchemy
- **Authentication:** Flask-JWT-Extended (JWT tokens)
- **Password Hashing:** Werkzeug
- **CORS:** Flask-CORS
- **Email:** SendGrid API
- **Server:** Gunicorn (4 workers in production)

### Development Tools
- **Version Control:** Git + GitHub
- **Code Quality:** Black (formatter), Flake8 (linter), ESLint
- **Testing:** Pytest (backend), Vitest (frontend)
- **Pre-commit Hooks:** Custom pre-push hook (security checks, formatting, linting, build validation)
- **AI Assistant:** GitHub Copilot (paid subscription)

## Hosting & Deployment

**All services are on FREE tiers (no paid features):**

### Frontend Hosting: Cloudflare Pages
- **Plan:** Free tier (unlimited bandwidth, unlimited builds)
- **URL:** https://bloom-tracker.app (custom domain via Cloudflare DNS)
- **Default URL:** https://bloom-budget-tracker.pages.dev
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist`
- **Deployment:** Auto-deploy disabled (manual deploys only)
- **Features:** Global CDN, automatic HTTPS, SPA routing via `_routes.json`

### Backend Hosting: Render
- **Plan:** Free tier (750 hours/month, sleeps after 15min inactivity)
- **URL:** https://bloom-backend-b44r.onrender.com
- **Deployment:** Auto-deploy disabled (manual deploys only)
- **Runtime:** Python 3.11.9
- **Server:** Gunicorn with 4 workers
- **Cold Start:** ~30-60 seconds (free tier limitation)

### Database: Turso
- **Plan:** Free tier (5GB storage, 500M reads/month, 10M writes/month)
- **Type:** libSQL (SQLite-compatible cloud database)
- **Connection:** libsql+https:// protocol with auth token
- **Location:** AWS EU-West-1 region
- **Features:** Edge replication, point-in-time restore (1 day retention)

### Email Service: SendGrid
- **Plan:** Free tier (100 emails/day)
- **Usage:** Password reset emails only
- **Sender:** support@bloom-tracker.app (verified via Cloudflare Email Routing)
- **Rate Limit:** 3 password reset emails per hour per user

### DNS & Domain: Cloudflare
- **Plan:** Free tier
- **Domain:** bloom-tracker.app
- **Features:** DNS management, email routing, SSL/TLS certificates
- **Email Routing:** Forwards support@bloom-tracker.app to personal email

### CI/CD: GitHub Actions
- **Plan:** Free tier (2,000 minutes/month for private repos)
- **Workflows:**
  - CI/CD: Runs tests, linting, formatting checks on push
  - Database Backup: Daily at 2 AM UTC (backs up Turso database)
  - Recurring Expenses: Generates recurring expenses 60 days ahead

## Environment Variables

### Backend (.env / Render Environment)

**Flask Configuration:**
- `SECRET_KEY` - Flask session secret
- `JWT_SECRET_KEY` - JWT token signing key
- `FLASK_ENV` - Environment (development/production)

**Database:**
- `DATABASE_URL` - Turso database URL (libsql://...)
- `TURSO_AUTH_TOKEN` - Turso authentication token

**CORS:**
- `CORS_ORIGINS` - Allowed frontend origins (comma-separated)
- `FRONTEND_URL` - Frontend URL for email links

**Email (SendGrid):**
- `SENDGRID_API_KEY` - SendGrid API key
- `SENDGRID_FROM_EMAIL` - Sender email address (support@bloom-tracker.app)

**Optional:**
- `CREDIT_CARD_LIMIT` - Default credit card limit in cents (default: 1500 = €15.00)
- `SIMULATE_COLD_START` - Testing flag for cold start behavior (default: false)

### Frontend (.env.local - Local Development Only)

**API Configuration:**
- `VITE_API_URL` - Backend API URL (default: http://localhost:5000)

**Note:** Production frontend uses runtime API URL from `axios` baseURL, not env vars.

### GitHub Secrets (Actions Workflows)

**For automated workflows:**
- `DATABASE_URL` - Turso database connection string (for backups)
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Project Structure

```
bloom-budget-tracker/
├── backend/                 # Flask API
│   ├── app.py              # Flask app factory
│   ├── config.py           # Configuration classes
│   ├── models/             # SQLAlchemy models
│   ├── routes/             # API blueprints
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   └── tests/              # Backend tests
├── frontend/               # React app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Route pages
│   │   ├── contexts/       # Context providers (Auth, Theme)
│   │   ├── api.js          # Axios instance with JWT
│   │   └── main.jsx        # Entry point
│   ├── public/
│   │   ├── _routes.json    # Cloudflare Pages SPA routing
│   │   └── _headers        # Security headers (CSP, HSTS, etc.)
│   └── dist/               # Build output (gitignored)
├── docs/                   # Documentation
├── scripts/                # Maintenance scripts
├── instance/               # SQLite database (local dev)
├── .github/                # GitHub Actions workflows
├── requirements.txt        # Python dependencies (backend)
├── package.json            # Node dependencies (frontend)
├── render.yaml             # Render deployment config
└── .env                    # Environment variables (gitignored)
```

## Key Architecture Decisions

### Database Migration History
- **Original:** Render PostgreSQL (free tier, 90-day expiration limit)
- **Migration Date:** December 3-4, 2025
- **Current:** Turso (libSQL) - no expiration, better for personal use
- **Migration Script:** `scripts/migrate_postgres_to_sqlite.py` (preserved for reference)

### Two-Tier Period System
- **Salary Periods:** 4-week parent periods with balance tracking
- **Budget Periods:** Individual weekly periods (auto-generated, 4 per salary period)
- **Carryover Logic:** Overspending in Week 1 automatically reduces Week 2's adjusted budget

### Money Storage Convention
- All monetary values stored as **integers in cents** throughout the database
- Example: `amount: 1500` = €15.00
- Frontend converts to currency display using `formatCurrency(cents)` helper

### PWA Strategy
- **Development:** PWA disabled to prevent stale code caching
- **Production:** Full PWA with offline support and service worker caching
- **Config:** `frontend/vite.config.js` controls PWA behavior per environment

## Cost Breakdown

**Monthly Costs:**
- Cloudflare Pages: **$0** (free tier, unlimited)
- Render Backend: **$0** (free tier, 750 hours/month)
- Turso Database: **$0** (free tier, 5GB storage)
- SendGrid Email: **$0** (free tier, 100 emails/day)
- Cloudflare DNS: **$0** (free tier)
- GitHub Actions: **$0** (free tier, 2,000 minutes/month)
- **GitHub Copilot:** **~$10/month** (paid subscription)

**Total Monthly Cost:** ~$10/month (GitHub Copilot only)

## Development Workflow

### Local Development
```powershell
# Start backend
.venv\Scripts\Activate.ps1
python run.py  # Runs on http://localhost:5000

# Start frontend (separate terminal)
cd frontend
npm run dev  # Runs on http://localhost:3000
```

### Git Workflow
- **Pre-push Hook:** Automatically runs security checks, formatting (black), linting (flake8, ESLint), and frontend build
- **Branch Protection:** Disabled (direct push to main)
- **Deployment:** Manual deploys on Cloudflare Pages and Render (auto-deploy disabled for both)

### Testing
```powershell
# Backend tests
pytest backend/tests/

# Frontend tests
cd frontend
npm test
```

## Resource Limits & Constraints

**Render Free Tier:**
- Backend sleeps after 15 minutes of inactivity
- Cold start time: 30-60 seconds
- 750 hours/month (enough for personal use)

**Turso Free Tier:**
- 5GB total storage (plenty for budget tracking)
- 500 million rows read/month
- 10 million rows written/month

**SendGrid Free Tier:**
- 100 emails/day
- **IMPORTANT:** Always mock email service in tests to avoid hitting limits

**Cloudflare Pages Free Tier:**
- Unlimited builds
- Unlimited bandwidth
- 500 builds/month (before rate limiting)

## Security Considerations

- JWT-based authentication (24-hour expiry)
- Password hashing with Werkzeug
- CORS restricted to frontend domain only
- CSP headers via `_headers` file
- Rate limiting on password reset (3 per hour)
- Pre-push hook checks for hardcoded secrets
- Environment variables for all sensitive data
- HTTPS enforced on all production domains

## Future Scaling Path

When ready to scale beyond personal use:
- **Database:** Turso scales with usage-based pricing ($4.99/month for 500 active DBs)
- **Backend:** Render Starter ($7/month) for always-on, faster cold starts
- **Alternative:** Migrate to managed Postgres (Supabase, Neon) - already compatible via SQLAlchemy

## Documentation

- **User Guide:** `docs/USER_GUIDE.md`
- **API Reference:** `docs/API.md` (957 lines, all endpoints)
- **Deployment Guide:** `docs/DEPLOYMENT.md`
- **Database Migration:** `docs/DATABASE_MIGRATION.md`
- **Decision Log:** `DECISION_LOG.md` (chronological development decisions)

---

**Last Updated:** December 4, 2025
**App Status:** ✅ Live in production (personal use)
**Next Milestone:** Consider public release with multi-user support

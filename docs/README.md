# Bloom Documentation

Comprehensive documentation for the Bloom budget tracking application.

## 📚 Core Documentation

### [DEPLOYMENT.md](DEPLOYMENT.md)

**Production deployment and hosting:**

-   Cloudflare Pages (frontend) + Render (backend) + Neon (database)
-   Environment variables and CORS configuration
-   Build commands and continuous deployment
-   Troubleshooting and monitoring

### [USER_GUIDE.md](USER_GUIDE.md)

**End-user documentation:**

-   Getting started and account setup
-   Dashboard and transaction management
-   Salary periods and weekly budgets
-   Recurring expenses and debt tracking
-   Import/export functionality

### [SECURITY.md](SECURITY.md)

**Security implementation:**

-   JWT authentication and password hashing
-   API security and rate limiting
-   Environment variable management
-   Production security best practices

## 🔧 Development Documentation

### [TESTING.md](TESTING.md)

**Test suite and CI/CD:**

-   Backend tests (28 tests: auth, CRUD, business logic)
-   Email service mocking and quota protection
-   GitHub Actions CI/CD pipeline
-   Running tests locally

### [MOBILE_DEV.md](MOBILE_DEV.md)

**Testing on actual mobile devices:**

-   Network setup and IP configuration
-   Backend CORS and frontend API configuration
-   Step-by-step mobile testing workflow
-   Troubleshooting common connection issues

## 🛠️ Feature Documentation

### [RECURRING_EXPENSES.md](RECURRING_EXPENSES.md)

**Automation system for repeating expenses:**

-   Data model and API endpoints
-   Frontend components and UI
-   Scheduling options (weekly/biweekly/monthly/custom)
-   Auto-generation with 60-day lookahead

### [BANK_IMPORT.md](BANK_IMPORT.md)

**CSV import functionality:**

-   Supported bank formats
-   Import workflow and validation
-   Duplicate detection
-   Troubleshooting

### [FEATURE_FLAGS.md](FEATURE_FLAGS.md)

**Experimental features system:**

-   Feature flag management
-   User opt-in/opt-out
-   Testing unreleased features

### [EMAIL_SETUP.md](EMAIL_SETUP.md)

**Email integration (SendGrid):**

-   Password reset emails
-   Configuration and environment variables
-   Development vs production modes
-   Troubleshooting and rate limiting

## 🗄️ Infrastructure Documentation

### [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md)

**Database management and scaling:**

-   Current: SQLite on Render persistent disk (free, no expiration)
-   ✅ Migrated to Neon PostgreSQL (Dec 4, 2025)
-   Future scaling: Neon Launch ($19/month) for 3GB + unlimited compute
-   Backup strategies and cost comparison

### [CLOUDFLARE_MIGRATION.md](CLOUDFLARE_MIGRATION.md)

**✅ Completed migration (Dec 2, 2025):**

-   Netlify → Cloudflare Pages migration
-   Configuration and setup steps
-   Post-migration checklist

## 🧪 Development Documentation

### [API.md](API.md)

**Complete API reference:**

-   All endpoints with request/response examples
-   Authentication and JWT tokens
-   Query parameters and filtering
-   Error responses and rate limiting
-   Amount/date formats and pagination

### [TESTING.md](TESTING.md)

**Test suite and CI/CD:**

-   Backend tests (28 tests: auth, CRUD, business logic)
-   Email service mocking and quota protection
-   GitHub Actions CI/CD pipeline
-   Running tests locally

### [MOBILE_DEV.md](MOBILE_DEV.md)

**Testing on actual mobile devices:**

-   Network setup and IP configuration
-   Backend CORS and frontend API configuration
-   Step-by-step mobile testing workflow
-   Troubleshooting common connection issues

## 📦 Quick Links

-   [Main README](../README.md) - Project overview and local setup
-   [Scripts Documentation](../scripts/README.md) - Maintenance and utility scripts
-   [Decision Log](../DECISION_LOG.md) - Development decisions and changes
-   [Internal Reference](../INTERNAL_REFERENCE.md) - Technical architecture
-   [Archive](archive/) - Historical and outdated documentation

## 📋 Archived Documentation

The following documents have been moved to `archive/` as they're no longer current or have been consolidated:

-   **API_VERSIONING.md** - Consolidated into DEPLOYMENT.md
-   **DATABASE_BACKUP.md** - Consolidated into DEPLOYMENT.md
-   **PRE_PUSH_SETUP_COMPLETE.md** - Pre-push hook setup (now integrated)
-   **EMAIL_INTEGRATION_ISSUE.md** - Feature spec (implemented, see EMAIL_SETUP.md)
-   **LOADING_ANIMATION_CONCEPTS.md** - Design concepts (implemented)
-   **DEPLOYMENT_SAFEGUARDS.md** - Early deployment strategies (superseded by DEPLOYMENT.md)
-   **CUSTOM_DOMAIN.md** - Netlify domain setup (migrated to Cloudflare Pages)

## 🎯 Documentation Principles

-   **Actionable** - Focus on what to do, not just what exists
-   **Current** - Archive outdated docs, update regularly
-   **Concise** - Link to external docs when appropriate
-   **User-focused** - Write for the intended audience (users vs developers)

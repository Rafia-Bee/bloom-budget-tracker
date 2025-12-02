# Bloom Budget Tracker - Deployment Guide

This guide covers the production deployment setup for Bloom Budget Tracker.

---

## Current Production Setup

### Hosting Services

**Frontend (Cloudflare Pages)**
- URL: https://bloom-tracker.app (custom domain)
- Default URL: https://bloom-budget-tracker.pages.dev
- Framework: React + Vite
- Auto-deploys from: `main` branch
- Build command: `cd frontend && npm install && npm run build`
- Build output: `frontend/dist`

**Backend (Render)**
- URL: https://bloom-backend-b44r.onrender.com
- Framework: Flask (Python)
- Plan: Free tier
- Auto-deploys from: `main` branch
- Start command: `gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app`

**Database (Render)**
- Type: PostgreSQL
- Plan: Free tier
- SSL: Required
- Backup: Automatic daily backups

---

## Environment Variables

### Backend Environment Variables (Render)

Required variables to set in Render dashboard:

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=<generate-strong-secret-key>
JWT_SECRET_KEY=<generate-strong-jwt-secret>

# Database
DATABASE_URL=<automatically-set-by-render-postgres>

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
const API_URL = import.meta.env.VITE_API_URL || 'https://bloom-backend-b44r.onrender.com';
```

---

## Deployment Process

### Initial Setup

**1. Backend (Render)**

1. Connect GitHub repository to Render
2. Create new Web Service
3. Configure build settings:
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `gunicorn -w 4 -b 0.0.0.0:$PORT backend.app:app`
   - Python Version: 3.11.9
4. Add PostgreSQL database
5. Set environment variables
6. Deploy

**2. Frontend (Cloudflare Pages)**

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

- **Cloudflare Pages**: Builds and deploys frontend automatically (~2-3 minutes)
- **Render**: Builds and deploys backend automatically (~3-5 minutes)

**Note:** Free tier services sleep after 15 minutes of inactivity. First request after sleep takes 30-60 seconds (cold start).

---

## Database Management

### Migrations

Database schema changes are handled automatically through Flask-SQLAlchemy:

```python
# In backend/models/database.py
with app.app_context():
    db.create_all()  # Creates tables if they don't exist
```

For manual migrations, connect to the database:

```bash
# Get database connection string from Render dashboard
psql <DATABASE_URL>
```

### Backups

- **Automatic**: Render performs daily backups (free tier: 7-day retention)
- **Manual**: Export from Render dashboard or use `pg_dump`

---

## Security Considerations

### Secrets Management

- ✅ All secrets stored as environment variables
- ✅ `.env` files in `.gitignore`
- ✅ Separate dev/production configurations
- ⚠️ Rotate secrets regularly

### CORS Configuration

Production CORS is restricted to frontend domains:

```python
CORS_ORIGINS=https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev
```

Update in Render dashboard when domain changes.

### Database Security

- ✅ SSL/TLS required for connections
- ✅ Connection pooling with `pool_pre_ping`
- ✅ No public database access

---

## Performance Optimization

### Backend (Render Free Tier)

**Limitations:**
- Sleeps after 15 minutes of inactivity
- 512 MB RAM
- Shared CPU

**Optimizations:**
- Gunicorn with 4 workers
- Connection pooling enabled
- JWT tokens with 24-hour expiry (offline support)

### Frontend (Cloudflare Pages)

**Optimizations:**
- Vite production build (minified, tree-shaken)
- Progressive Web App (PWA) for offline support
- Service worker caching
- Cloudflare CDN edge caching
- Unlimited bandwidth and builds

---

## Monitoring

### Current Setup

**Custom Loading Animations**
- Displays cute cat animations during cold starts
- Minimum 3-second display to ensure animation completion
- Improves perceived performance

### Recommended (To Implement)

- [ ] Error tracking: Sentry integration
- [ ] Uptime monitoring: UptimeRobot or similar
- [ ] Performance monitoring: Web vitals tracking
- [ ] Log aggregation: Render logs dashboard

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
- Sleeps after inactivity → Upgrade to Starter ($7/month) for always-on
- 750 hours/month limit

**Render PostgreSQL:**
- 1 GB storage → Upgrade for more space
- 7-day backup retention → Upgrade for 30-day retention

**Cloudflare Pages Frontend:**
- Unlimited bandwidth
- Unlimited builds
- 500 builds/month for preview deployments

### Recommended Upgrades (When Needed)

1. **Always-on backend**: Render Starter plan ($7/month)
2. **More database storage**: Render PostgreSQL Starter ($7/month)
3. **Custom domain**: Already configured (bloom-tracker.app)
4. **CDN caching**: Already included with Cloudflare Pages

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

## CI/CD (Future Enhancement)

### GitHub Actions (Planned)

**Automated checks on PR:**
- Run tests
- Lint code
- Check for security vulnerabilities

**Automated deployment:**
- Already handled by Cloudflare Pages/Render
- Could add pre-deployment checks

**Example workflow** (to implement):
```yaml
name: CI/CD Pipeline
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run backend tests
        run: |
          pip install -r backend/requirements.txt
          pytest
      - name: Run frontend tests
        run: |
          cd frontend
          npm install
          npm test
```

---

## Support & Resources

**Documentation:**
- [Render Docs](https://render.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Flask Deployment](https://flask.palletsprojects.com/en/2.3.x/deploying/)

**Monitoring:**
- Render Dashboard: Monitor backend health
- Cloudflare Pages Dashboard: Monitor frontend builds and analytics
- PostgreSQL: Check database metrics

---

## Checklist for New Deployments

- [ ] Environment variables configured
- [ ] Database connected and initialized
- [ ] CORS origins updated
- [ ] Frontend API URL points to backend
- [ ] Test login/register flow
- [ ] Test CRUD operations
- [ ] Verify cold start behavior
- [ ] Check error handling
- [ ] Confirm PWA functionality
- [ ] Review security settings

---

**Last Updated:** December 2, 2025
**Deployment Status:** ✅ Production Ready (Migrated to Cloudflare Pages)

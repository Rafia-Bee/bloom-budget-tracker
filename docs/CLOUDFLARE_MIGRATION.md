# Cloudflare Pages Migration Guide

**Migration from Netlify to Cloudflare Pages**
**Date:** December 2, 2025
**Reason:** Netlify free tier deploy credits exhausted

## Why Cloudflare Pages?

- ✅ **Unlimited deployments** (no build credits)
- ✅ **Perfect Vite/PWA compatibility** (zero config)
- ✅ **Already using Cloudflare DNS** (seamless domain integration)
- ✅ **Excellent service worker support** (PWA ready)
- ✅ **Free password protection** (Cloudflare Access for up to 50 users)
- ✅ **Superior caching** (global CDN with edge workers)

## Migration Steps

### 1. Prepare Repository (Already Done)

Created Cloudflare Pages configuration files:

- `frontend/public/_routes.json` - SPA routing fallback (all routes → index.html)
- `frontend/public/_headers` - Security headers (migrated from netlify.toml)

### 2. Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
3. Select your GitHub repository: `Rafia-Bee/bloom-budget-tracker`
4. Configure build settings:
   - **Production branch:** `main`
   - **Build command:** `cd frontend && npm run build`
   - **Build output directory:** `frontend/dist`
   - **Root directory:** `/` (leave empty or use root)

### 3. Environment Variables

No environment variables needed for frontend (all API calls use runtime URLs).

### 4. Domain Configuration

**Option A: Use Cloudflare Pages subdomain** (Immediate)
- Your site will be available at: `bloom-budget-tracker.pages.dev`

**Option B: Custom domain** (Recommended - 5 minutes)
1. In Cloudflare Pages project → **Custom domains** → **Set up a custom domain**
2. Add: `bloom-tracker.app`
3. Cloudflare will auto-configure DNS (you're already using Cloudflare DNS)
4. SSL certificate auto-provisioned

### 5. Deploy & Test

1. **Trigger deploy:** Push to `main` branch or click "Retry deployment"
2. **Verify deployment:**
   - Check service worker registration (DevTools → Application → Service Workers)
   - Test PWA install (Chrome → Install app)
   - Test API connectivity (Dashboard → check data loads)
   - Test routing (navigate between pages, refresh on /debts, /recurring-expenses)
3. **Test dark mode:** Ensure theme toggle works and persists

### 6. Update Backend CORS (Important!)

Update Render backend environment variable:

```python
# backend/config.py - Already configured for multiple origins
ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://bloom-tracker.app',
    'https://bloom-budget-tracker.pages.dev',  # Add Cloudflare Pages default domain
]
```

Add to Render environment variables:
- Key: `FRONTEND_URL`
- Value: `https://bloom-tracker.app,https://bloom-budget-tracker.pages.dev`

### 7. Cleanup Netlify (After Verification)

Once Cloudflare Pages is confirmed working:

1. Update DNS (if not using Cloudflare DNS already)
2. Cancel Netlify site (or keep as backup with 0 deploys)
3. Remove `netlify.toml` from repository (optional - won't interfere)

## Build Configuration Details

### Cloudflare Pages Build Settings

```yaml
Build command: cd frontend && npm run build
Build output directory: frontend/dist
Root directory: (leave empty)
Node version: 18 (auto-detected from package.json engines or use CF default)
```

### SPA Routing (_routes.json)

Cloudflare Pages uses `_routes.json` to handle SPA routing:

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
```

This ensures all routes fall back to `index.html` (React Router handles client-side routing).

### Security Headers (_headers)

Cloudflare Pages reads `_headers` file from build output:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: [policy]
```

Headers automatically applied to all routes.

## PWA Compatibility

Cloudflare Pages **fully supports** PWA features:

- ✅ Service worker registration (no special config needed)
- ✅ Workbox runtime caching
- ✅ Offline functionality
- ✅ App manifest (`manifest.json` auto-served)
- ✅ Push notifications (future feature)

**No changes needed** to `vite.config.js` or PWA configuration.

## Deployment Workflow

### Automatic Deploys (CI/CD)

Cloudflare Pages automatically deploys on:
- Every push to `main` branch (production)
- Every pull request (preview deployments with unique URLs)

### Preview Deployments

Every PR gets a unique preview URL:
- `https://<commit-hash>.bloom-budget-tracker.pages.dev`
- Perfect for testing before merging

### Manual Deploys

Use Cloudflare Dashboard:
1. Go to project → **Deployments**
2. Click **Retry deployment** or **Create deployment**

## Monitoring & Logs

### Build Logs

View in Cloudflare Dashboard:
- **Deployments** tab shows all builds
- Click deployment → **View build logs**

### Analytics

Cloudflare provides:
- Page views
- Bandwidth usage
- Geographic distribution
- Performance metrics (Web Vitals)

Free tier includes basic analytics.

## Troubleshooting

### Build Fails

1. Check Node version compatibility
2. Verify `cd frontend` works (build command must be relative to root)
3. Check build output path: `frontend/dist`

### Routes Not Working

1. Verify `_routes.json` exists in `frontend/public/`
2. Check file is copied to `dist/` after build
3. Test: Open DevTools → Network → Navigate to `/debts` → should return `index.html`

### Service Worker Issues

1. Clear browser cache
2. Unregister old service worker (DevTools → Application → Service Workers → Unregister)
3. Hard refresh (Ctrl+Shift+R)
4. Check Cloudflare cache purge if needed

### CORS Errors

1. Verify backend `FRONTEND_URL` includes Cloudflare Pages domain
2. Check `ALLOWED_ORIGINS` in `backend/config.py`
3. Test API endpoint directly: `curl -H "Origin: https://bloom-tracker.app" https://bloom-backend-b44r.onrender.com/api/health`

## Rollback Plan

If issues arise:

1. **Immediate:** Point DNS back to Netlify (if still active)
2. **Short-term:** Use Cloudflare Pages preview deployment while debugging
3. **Long-term:** Keep Netlify site frozen as backup (0 deploys = free)

## Cost Comparison

| Feature | Netlify Free | Cloudflare Pages Free |
|---------|--------------|----------------------|
| Build minutes | 300/month | Unlimited |
| Bandwidth | 100GB/month | Unlimited |
| Sites | 1 | Unlimited |
| Team members | 1 | Unlimited |
| Preview deploys | ✅ | ✅ |
| Custom domains | ✅ | ✅ (unlimited) |
| SSL | ✅ | ✅ |
| Password protection | ❌ (paid) | ✅ Free (50 users) |

## References

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Deploy a Vite Site](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite-site/)
- [SPA Routing](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)
- [Headers](https://developers.cloudflare.com/pages/configuration/headers/)

## Post-Migration Checklist

- [ ] Cloudflare Pages project created and connected to GitHub
- [ ] First deployment successful
- [ ] Custom domain configured (bloom-tracker.app)
- [ ] SSL certificate provisioned
- [ ] API calls working (check Dashboard loads data)
- [ ] PWA install works
- [ ] Service worker registers correctly
- [ ] Dark mode persists across sessions
- [ ] All routes work (refresh on any page)
- [ ] Backend CORS updated with Cloudflare Pages domain
- [ ] DNS propagated (check from multiple locations)
- [ ] Netlify site disabled/removed
- [ ] Update DEPLOYMENT.md with new hosting info

## Next Steps After Migration

1. Update `docs/DEPLOYMENT.md` with Cloudflare Pages instructions
2. Remove Netlify-specific configuration from repository
3. Set up Cloudflare Access for password protection (optional)
4. Configure branch previews for staging environment
5. Set up Cloudflare Web Analytics (free)

---

**Migration Time Estimate:** 10-15 minutes
**Zero Downtime:** Use preview deployment to test before switching DNS

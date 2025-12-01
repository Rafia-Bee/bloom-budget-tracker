# Custom Domain Setup - bloom-tracker.app

## Overview

The Bloom Budget Tracker is deployed at **https://bloom-tracker.app** (custom domain purchased from Namecheap).

## DNS Configuration (Namecheap)

### A Records
Point your domain to Netlify's load balancer:

```
Type: A Record
Host: @
Value: 75.2.60.5
TTL: Automatic
```

### CNAME Record (www subdomain)
```
Type: CNAME Record
Host: www
Value: the-bloom-tracker.netlify.app
TTL: Automatic
```

## Netlify Configuration

### 1. Add Custom Domain in Netlify Dashboard

1. Go to your Netlify site dashboard
2. Navigate to **Domain Settings**
3. Click **Add custom domain**
4. Enter: `bloom-tracker.app`
5. Verify DNS configuration

### 2. Enable HTTPS

Netlify automatically provisions Let's Encrypt SSL certificate for custom domains.

- Wait 24 hours for DNS propagation
- Certificate auto-renews every 90 days

### 3. Primary Domain Setting

Set `bloom-tracker.app` as the primary domain so `the-bloom-tracker.netlify.app` redirects to it.

## Redirects

The `netlify.toml` file includes automatic redirects:
- `the-bloom-tracker.netlify.app/*` → `bloom-tracker.app/*` (301 permanent)

## Backend CORS Configuration

Update Render environment variables:

```bash
CORS_ORIGINS=https://bloom-tracker.app
FRONTEND_URL=https://bloom-tracker.app
```

## Troubleshooting

### Service Worker CSP Errors

If you see Content Security Policy errors after domain changes:

1. Visit: https://bloom-tracker.app/clear-cache.html
2. Click "Clear Service Worker & Cache"
3. Close browser tab
4. Clear browser cache
5. Revisit the app

### DNS Not Propagating

Check DNS propagation:
```bash
# Windows PowerShell
nslookup bloom-tracker.app

# Should return Netlify's IP
```

Use online tools:
- https://dnschecker.org
- https://www.whatsmydns.net

### SSL Certificate Issues

If SSL cert doesn't provision:
1. Verify DNS is pointing correctly
2. Wait 24-48 hours for propagation
3. In Netlify, try "Renew certificate" button
4. Contact Netlify support if issues persist

## Email Configuration

Email is routed through Cloudflare Email Routing:
- `support@bloom-tracker.app` → your Gmail
- `no-reply@bloom-tracker.app` → SendGrid (transactional)

See `docs/EMAIL_SETUP.md` for details.

## Current URLs

- **Production Frontend**: https://bloom-tracker.app
- **Production Backend**: https://bloom-backend-b44r.onrender.com
- **Netlify Subdomain**: https://the-bloom-tracker.netlify.app (redirects to main domain)

## Files Modified for Custom Domain

- `netlify.toml` - Netlify configuration with redirects
- `frontend/public/_headers` - CSP updated to allow backend
- `.env.example` - Updated with bloom-tracker.app
- All documentation updated with correct URLs

## Testing Checklist

- [ ] https://bloom-tracker.app loads correctly
- [ ] https://www.bloom-tracker.app redirects to apex domain
- [ ] https://the-bloom-tracker.netlify.app redirects to bloom-tracker.app
- [ ] SSL certificate is valid (green lock icon)
- [ ] Login works without CSP errors
- [ ] API calls to backend succeed
- [ ] Service worker loads without errors

## Notes

- DNS changes can take 24-48 hours to propagate globally
- Always test in incognito/private window after domain changes
- Service worker cache can cause issues - use clear-cache.html if needed

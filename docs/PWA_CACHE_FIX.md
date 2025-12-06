# PWA Cache Busting Fix

## Problem
Service worker caches old assets (CSS/JS) and doesn't update them on deployment, causing:
- MIME type errors (trying to load deleted CSS files)
- Stale JavaScript code
- Users need hard refresh to see new features

## Root Cause
PWA service worker aggressively caches assets. When you deploy:
1. New build creates `index-BwRBVixk.css`
2. Service worker still serves cached `index-DbVw77X6.css`
3. Browser tries to load old file → 404 → returns HTML → MIME error

## Solution Applied

### 1. Added Cache Busting Config (`vite.config.js`)
```javascript
workbox: {
    cleanupOutdatedCaches: true,  // Auto-delete old caches
    skipWaiting: true,            // Install new SW immediately
    clientsClaim: true,           // Take control of pages immediately
}
```

### 2. Added Manifest Version
```javascript
manifest: {
    version: "1.2.0",  // Increment on every deployment
}
```

## Deployment Process (Going Forward)

### Before Every Deploy:
1. **Increment version in `vite.config.js`:**
   ```javascript
   version: "1.2.0" → "1.2.1" → "1.2.2" etc.
   ```

2. **Build frontend:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "chore: bump version to 1.2.1"
   git push origin main
   ```

4. **Manual deploy on Cloudflare Pages**

### After Deploy:
Users will auto-update on next page load (no hard refresh needed)

## Alternative: Force Immediate Update

If you need users to update RIGHT NOW, add this to `frontend/src/main.jsx`:

```javascript
// Force service worker update on load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.update())
  })
}
```

## Testing
1. Deploy with version bump
2. Visit site in incognito window
3. Check DevTools → Application → Service Workers
4. Should see new version activate immediately

## Emergency Cache Clear (Production)

If users are stuck on old version, tell them:
1. Chrome: Settings → Privacy → Clear browsing data → Cached images and files
2. Or: Hold Ctrl+Shift+R (hard refresh)

---

**Note:** With `skipWaiting: true` and `clientsClaim: true`, new deployments will automatically take effect on next page load. Version bumping is still recommended for tracking.

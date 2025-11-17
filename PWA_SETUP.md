# PWA Setup for Bloom

## What Was Added

### Files Created:
1. `frontend/public/manifest.json` - PWA configuration
2. `frontend/public/sw.js` - Service worker for offline caching
3. `frontend/index.html` - Updated with PWA meta tags
4. `frontend/vite.config.js` - Added PWA plugin

### Features Enabled:
✅ **Offline Support** - App works without internet after first load
✅ **Install on iPad** - Add to home screen as standalone app
✅ **API Caching** - Recent data cached for offline use
✅ **Auto-Updates** - App updates automatically when online

---

## How to Use on iPad

### Step 1: Deploy & Access (Do Before Flight)

**Option A: Quick Deploy to Netlify** (Easiest)
```powershell
cd frontend
npm install -g netlify-cli
npm run build
netlify deploy --prod
```
This gives you a URL like `https://bloom-budget.netlify.app`

**Option B: Use Local Network** (If still at home)
```powershell
# Find your IP
ipconfig | findstr IPv4

# Update backend to allow network access
# In run.py, ensure: app.run(host='0.0.0.0', port=5000)

# Start servers
.\start.ps1

# Access from iPad (on same WiFi)
# http://YOUR_IP:3000
```

### Step 2: Install on iPad

1. **Open Safari** on iPad
2. **Go to your Bloom URL**
3. **Tap Share button** (square with arrow)
4. **Scroll down, tap "Add to Home Screen"**
5. **Name it "Bloom"** and tap "Add"
6. **Icon appears** on home screen like a native app!

### Step 3: Use Offline

1. **While online**, open the app and browse all pages
2. **Data is cached** automatically
3. **Go offline** (airplane mode)
4. **Open Bloom** from home screen - it works!

---

## Important Notes

### What Works Offline:
✅ App interface and navigation
✅ Recently viewed data (cached)
✅ Screenshots and screen recording
✅ UI/UX documentation work

### What Needs Internet:
❌ Creating new transactions
❌ Loading fresh data
❌ Syncing changes

### For Your Flight Documentation:
1. **Before takeoff**: Load all pages while online (Dashboard, Debts, Recurring, etc.)
2. **Cache fills**: All UI and recent data stored locally
3. **During flight**: Take screenshots, record videos, write docs - everything works!
4. **After landing**: Sync any changes when back online

---

## Creating App Icons

You need actual PNG icons. Here's how to create them:

### Quick Option: Use an online tool
1. Go to https://favicon.io/favicon-generator/
2. Text: "B" (for Bloom)
3. Background: #ec4899 (pink)
4. Text color: White
5. Download and extract
6. Rename files to `icon-192.png` and `icon-512.png`
7. Place in `frontend/public/`

### Or use existing logo:
If you have a logo, resize to 192x192 and 512x512 and save as PNG in `frontend/public/`

---

## Test PWA Locally

```powershell
cd frontend
npm run build
npm run preview
```

Then:
1. Open http://localhost:4173 in Chrome
2. Open DevTools (F12)
3. Go to Application tab → Service Workers
4. Check if service worker is registered
5. Test offline mode (check "Offline" in Network tab)

---

## Deploy Commands

### Netlify (Recommended - Free & Fast)
```powershell
cd frontend
npm run build
npx netlify-cli deploy --prod
```

### Vercel
```powershell
cd frontend
npm install -g vercel
vercel --prod
```

### GitHub Pages
```powershell
cd frontend
npm run build
# Push dist folder to gh-pages branch
```

---

## Next Steps

1. Create icon images (192px and 512px)
2. Deploy to hosting service
3. Test install on your iPad
4. Go offline and verify it works
5. Ready for flight! ✈️

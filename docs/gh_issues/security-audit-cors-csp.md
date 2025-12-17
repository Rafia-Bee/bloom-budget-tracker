# Security: Overly Permissive CORS Configuration

## Priority

🟡 **MEDIUM** - Infrastructure security

## Description

The application uses wildcard CORS (`*`) in development mode, which could accidentally be deployed to production. Additionally, the CSP policy includes unsafe directives that reduce XSS protection effectiveness.

## Security Risk

-   **Impact**: Medium - Could enable cross-origin attacks
-   **Likelihood**: Medium - Development configs often deployed accidentally
-   **CVSS**: Medium (5.0+)

## Vulnerable Configuration

### Wildcard CORS in Development

**File**: `backend/app.py:52`

```python
# For development, allow all local network IPs (192.168.x.x, 10.x.x.x)
if config_name == "development":
    # Allow all origins in development for mobile testing
    cors_origins.append("*")  # DANGEROUS: Allows any origin
```

### Weak Content Security Policy

**File**: `backend/app.py:105-112`

```python
csp_policy = (
    "default-src 'self'; "
    f"connect-src 'self' {' '.join(cors_origins)}; "
    "img-src 'self' data: blob:; "
    "media-src 'self' blob:; "
    "style-src 'self' 'unsafe-inline'; "  # Allows inline styles
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # Allows inline scripts & eval
    "font-src 'self' data:; "
    "frame-ancestors 'none'; "
    "form-action 'self'; "
    "base-uri 'self';"
)
```

## Risk Scenarios

### Scenario 1: Accidental Production Deployment

1. Developer deploys with `FLASK_ENV=development`
2. CORS allows requests from any origin (`*`)
3. Malicious site can make authenticated requests to API
4. User session hijacking or data theft possible

### Scenario 2: CSP Bypass for XSS

1. Attacker finds stored XSS vulnerability
2. `'unsafe-inline'` allows inline script execution
3. `'unsafe-eval'` enables dynamic code execution
4. CSP provides no protection against XSS

### Scenario 3: Mobile Development Exposure

1. Development server exposed on network for mobile testing
2. Wildcard CORS allows any device to access API
3. Malicious app on same network can abuse API
4. Authentication tokens could be compromised

## Current CORS Implementation Issues

### Environment Detection Problem

```python
# Problem: Environment detection not foolproof
if config_name == "development":
    cors_origins.append("*")

# Risk: Production could accidentally use development config
# Better: Explicit whitelist always
```

### Production CORS Configuration

```python
# Current production CORS
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000",
).split(",")

# Issues:
# - Localhost origins in production
# - No validation of origin format
# - Could include malicious origins via env var
```

## Secure Solutions

### Option 1: Strict Environment-Based CORS

```python
# backend/app.py - Secure CORS configuration
def configure_cors(app, config_name):
    """Configure CORS with strict security"""

    if config_name == "production":
        # Production: Only allow specific domains
        allowed_origins = [
            "https://bloom-tracker.app",
            "https://bloom-budget-tracker.pages.dev"
        ]

        # Allow additional domains via environment (with validation)
        extra_origins = os.getenv("EXTRA_CORS_ORIGINS", "")
        if extra_origins:
            for origin in extra_origins.split(","):
                origin = origin.strip()
                # Validate origin format
                if origin.startswith(("https://", "http://localhost:")):
                    allowed_origins.append(origin)
                else:
                    app.logger.warning(f"Invalid CORS origin rejected: {origin}")

    elif config_name == "development":
        # Development: Specific local network ranges
        allowed_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
        ]

        # Add local network IPs for mobile testing (with validation)
        local_network = os.getenv("DEV_NETWORK_CORS", "")
        if local_network:
            for origin in local_network.split(","):
                origin = origin.strip()
                # Validate local network patterns
                if re.match(r'^http://(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)', origin):
                    allowed_origins.append(origin)

    else:
        # Testing or unknown: Very restrictive
        allowed_origins = ["http://localhost:3000"]

    CORS(app,
         origins=allowed_origins,
         supports_credentials=True,
         expose_headers=["Content-Range", "X-Content-Range"])

    return allowed_origins
```

### Option 2: Dynamic CORS with Validation

```python
# backend/utils/cors_validator.py
import re
from urllib.parse import urlparse

class CORSValidator:
    def __init__(self, config_name):
        self.config_name = config_name
        self.allowed_patterns = self._get_allowed_patterns()

    def _get_allowed_patterns(self):
        """Get allowed origin patterns based on environment"""
        if self.config_name == "production":
            return [
                r'^https://bloom-tracker\.app$',
                r'^https://bloom-budget-tracker\.pages\.dev$',
                # Add more production domains as needed
            ]
        elif self.config_name == "development":
            return [
                r'^http://localhost:\d+$',
                r'^http://127\.0\.0\.1:\d+$',
                r'^http://192\.168\.\d+\.\d+:\d+$',  # Local network
                r'^http://10\.\d+\.\d+\.\d+:\d+$',   # Private network
            ]
        else:
            return [r'^http://localhost:3000$']  # Test only

    def is_origin_allowed(self, origin):
        """Check if origin matches allowed patterns"""
        if not origin:
            return False

        # Parse URL to validate format
        try:
            parsed = urlparse(origin)
            if not parsed.scheme or not parsed.netloc:
                return False
        except Exception:
            return False

        # Check against patterns
        for pattern in self.allowed_patterns:
            if re.match(pattern, origin):
                return True

        return False

def dynamic_cors_validator(origin):
    """CORS origin validation function"""
    app = current_app
    validator = CORSValidator(app.config.get('ENV', 'production'))
    return validator.is_origin_allowed(origin)
```

### Option 3: Strict CSP with Nonces

```python
# backend/app.py - Enhanced CSP with nonces
import secrets

@app.after_request
def add_security_headers(response):
    # Generate nonce for each request
    nonce = secrets.token_urlsafe(16)

    # Store nonce in request context for template use
    g.csp_nonce = nonce

    # Strict CSP policy
    csp_policy = (
        "default-src 'self'; "
        f"script-src 'self' 'nonce-{nonce}'; "  # Only allow nonce scripts
        "style-src 'self' 'unsafe-inline'; "   # Still allow inline styles for now
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://bloom-backend-b44r.onrender.com; "
        "font-src 'self' data:; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "upgrade-insecure-requests;"
    )

    response.headers["Content-Security-Policy"] = csp_policy
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    if config_name == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response
```

## Recommended Implementation

### Step 1: Remove Wildcard CORS

```python
# backend/app.py - Immediate security fix
def create_app(config_name="development"):
    # ... existing setup ...

    # Secure CORS configuration
    if config_name == "production":
        cors_origins = [
            "https://bloom-tracker.app",
            "https://bloom-budget-tracker.pages.dev"
        ]
    elif config_name == "development":
        cors_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000"
        ]

        # Allow specific local network for mobile (NO WILDCARD)
        dev_mobile = os.getenv("DEV_MOBILE_ORIGINS", "")
        if dev_mobile:
            for origin in dev_mobile.split(","):
                origin = origin.strip()
                if origin.startswith(("http://192.168.", "http://10.")):
                    cors_origins.append(origin)
    else:
        cors_origins = ["http://localhost:3000"]

    # Remove wildcard addition
    # cors_origins.append("*")  # REMOVE THIS LINE

    CORS(app, origins=cors_origins, supports_credentials=True)
```

### Step 2: Environment Variable Validation

```python
# backend/config.py - Add CORS validation
class Config:
    @staticmethod
    def validate_cors_origins(origins_string, environment):
        """Validate CORS origins for security"""
        if not origins_string:
            return []

        validated_origins = []
        for origin in origins_string.split(","):
            origin = origin.strip()

            if environment == "production":
                # Production: Only HTTPS (except localhost for testing)
                if origin.startswith("https://") or origin.startswith("http://localhost:"):
                    validated_origins.append(origin)
                else:
                    print(f"WARNING: Rejecting non-HTTPS origin in production: {origin}")

            elif environment == "development":
                # Development: HTTP allowed for local/network
                if origin.startswith(("http://localhost:", "http://127.0.0.1:", "http://192.168.", "http://10.")):
                    validated_origins.append(origin)
                else:
                    print(f"WARNING: Rejecting origin in development: {origin}")

        return validated_origins
```

### Step 3: Strengthen CSP Gradually

```python
# Phase 1: Remove unsafe-eval
csp_policy = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "  # Keep for now, remove later
    "style-src 'self' 'unsafe-inline'; "   # Keep for CSS compatibility
    # ... rest of policy
)

# Phase 2: Move to nonce-based scripts
# Phase 3: Remove unsafe-inline for styles
```

## Implementation Steps

### Phase 1: Remove Wildcard CORS (Immediate)

-   [ ] Remove `cors_origins.append("*")` from development config
-   [ ] Add explicit local network origins for mobile testing
-   [ ] Test mobile development workflow still works
-   [ ] Update deployment documentation

### Phase 2: Add CORS Validation

-   [ ] Create origin validation functions
-   [ ] Add environment variable validation
-   [ ] Test with various origin configurations
-   [ ] Add logging for rejected origins

### Phase 3: Strengthen CSP

-   [ ] Remove `'unsafe-eval'` from script-src
-   [ ] Implement nonce-based scripts where needed
-   [ ] Test frontend functionality with stricter CSP
-   [ ] Gradually remove `'unsafe-inline'` for scripts

### Phase 4: Production Hardening

-   [ ] Audit all CORS configurations
-   [ ] Implement CSP reporting
-   [ ] Add security header testing
-   [ ] Monitor for CSP violations

## Mobile Development Workflow

### Secure Mobile Testing Setup

```bash
# Developer's local environment
# Instead of wildcard, add specific IP
export DEV_MOBILE_ORIGINS="http://192.168.1.100:3000,http://192.168.1.100:3001"

# Start backend with specific mobile CORS
npm run dev
```

```powershell
# PowerShell script for mobile setup
# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"}).IPAddress[0]
$env:DEV_MOBILE_ORIGINS = "http://$localIP:3000"

Write-Host "Mobile development CORS set to: $env:DEV_MOBILE_ORIGINS"
```

## Files to Modify

-   `backend/app.py` - CORS configuration and CSP headers
-   `backend/config.py` - Environment validation
-   `docs/MOBILE_DEV.md` - Update mobile testing setup
-   `docs/DEPLOYMENT.md` - CORS security guidelines
-   `docs/SECURITY.md` - CSP and CORS documentation

## Testing Requirements

-   [ ] Production deployment rejects wildcard CORS
-   [ ] Mobile development works with specific origins
-   [ ] CSP blocks unsafe content injection
-   [ ] Environment variable validation works
-   [ ] CORS preflight requests handled correctly

## Related Security Issues

-   Content Security Policy enhancement (#XX)
-   Environment variable validation (#XX)
-   XSS prevention measures (#XX)

## Labels

`security`, `medium`, `cors`, `csp`, `infrastructure`, `backend`

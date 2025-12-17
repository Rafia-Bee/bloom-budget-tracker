# Security: Enforce Strong Secret Keys in Production

## Priority

🔴 **CRITICAL** - Security vulnerability

## Description

The application uses weak default secret keys that could accidentally be deployed to production. Currently, if `SECRET_KEY` or `JWT_SECRET_KEY` environment variables are not set, the application falls back to weak defaults and only logs warnings.

## Security Risk

-   **Impact**: High - Compromises authentication and session security
-   **Likelihood**: Medium - Easy to misconfigure in production
-   **CVSS**: High (7.5+)

## Current Code Issues

### Weak Default Values

**File**: `backend/config.py:9`

```python
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
```

### Insufficient Validation

**File**: `backend/app.py:33`

```python
if not secret_key or secret_key == "dev-secret-key-change-in-production":
    print("WARNING: SECRET_KEY not properly set in production!")
    # Should FAIL startup, not just warn
```

## Expected Behavior

-   Production deployments should **FAIL TO START** with weak/missing secrets
-   Development can use defaults for convenience
-   Clear error messages for operators

## Solution Requirements

1. **Fail-fast validation**: Application should refuse to start in production with weak secrets
2. **Environment detection**: Only allow defaults in development mode
3. **Secret strength validation**: Minimum entropy requirements
4. **Clear error messages**: Guide operators to fix configuration

## Implementation Plan

```python
# backend/config.py - Enhanced validation
class ProductionConfig(Config):
    def __init__(self):
        # Validate secrets at startup
        self._validate_production_secrets()

    def _validate_production_secrets(self):
        secret_key = os.getenv("SECRET_KEY")
        jwt_secret = os.getenv("JWT_SECRET_KEY")

        # Check if secrets exist and aren't defaults
        weak_secrets = [
            "dev-secret-key",
            "jwt-secret-key",
            "dev-secret-key-change-in-production",
            "jwt-secret-key-change-in-production"
        ]

        if not secret_key or secret_key in weak_secrets:
            raise ValueError(
                "SECURITY ERROR: SECRET_KEY not set or using default value. "
                "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(64))'"
            )

        if not jwt_secret or jwt_secret in weak_secrets:
            raise ValueError(
                "SECURITY ERROR: JWT_SECRET_KEY not set or using default value. "
                "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(64))'"
            )

        # Validate minimum length
        if len(secret_key) < 32 or len(jwt_secret) < 32:
            raise ValueError("SECURITY ERROR: Secret keys must be at least 32 characters long")
```

## Verification Steps

-   [ ] Production deployment fails with weak secrets
-   [ ] Development mode still works with defaults
-   [ ] Clear error messages guide configuration
-   [ ] Documentation updated with secret generation instructions

## Files to Modify

-   `backend/config.py` - Add secret validation
-   `backend/app.py` - Update startup validation
-   `docs/SECURITY.md` - Update secret generation guide
-   `docs/DEPLOYMENT.md` - Add troubleshooting section

## Related Security Issues

-   Rate limiting bypass (#XX)
-   JWT token storage vulnerability (#XX)

## Labels

`security`, `critical`, `backend`, `deployment`, `production`

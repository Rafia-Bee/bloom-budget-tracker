# Security: Information Disclosure in Development Mode

## Priority

🟠 **HIGH** - Information disclosure

## Description

Password reset tokens are exposed in API responses and UI when running in development mode. This creates risk of token leakage through logs, browser storage, or accidental deployment of development configurations to production.

## Security Risk

-   **Impact**: High - Password reset bypass possible
-   **Likelihood**: Medium - Common to deploy with debug settings
-   **CVSS**: Medium-High (6.0+)

## Vulnerable Code Locations

### API Response Exposure

**File**: `backend/routes/password_reset.py:76`

```python
# In development mode, always include token for testing (even if email is configured)
if current_app.config.get("DEBUG"):
    response_data["reset_token"] = token  # Development only!
    current_app.logger.info(
        f"Development mode: Reset token for {user.email}: {token}"
    )
```

### Frontend UI Exposure

**File**: `frontend/src/pages/Login.jsx:46`

```javascript
const handleForgotPasswordSuccess = (message, token) => {
    if (token) {
        // Development mode: Email service not configured, show token for testing
        setResetMessage(
            `${message}\n\n🔧 Development Mode: Email not configured\n\nReset Token: ${token}\n\nTest URL: http://localhost:3000/reset-password?token=${token}`
        );
    }
};
```

### Server Logging

Token values logged to server logs in development:

```python
current_app.logger.info(f"Development mode: Reset token for {user.email}: {token}")
```

## Risk Scenarios

### Scenario 1: Accidental Production Deployment

1. Developer deploys with `DEBUG=True` or `FLASK_ENV=development`
2. Password reset requests include tokens in API response
3. Tokens logged in production server logs
4. Attacker gains access to logs and can reset any password

### Scenario 2: Development Log Leakage

1. Development logs contain reset tokens
2. Logs accidentally committed to version control
3. Logs shared for debugging purposes
4. Tokens used to compromise accounts

### Scenario 3: Browser Storage/Network Exposure

1. Reset tokens in API responses cached by browser
2. Browser dev tools show token values
3. Network monitoring tools capture tokens
4. Shared development environments expose tokens

## Current Detection Gaps

### Environment Detection Issues

```python
# Problematic: DEBUG flag could be True in production
if current_app.config.get("DEBUG"):
    response_data["reset_token"] = token

# Better: Explicit environment check
if os.getenv("FLASK_ENV") == "development":
    response_data["reset_token"] = token
```

## Secure Solutions

### Option 1: Remove Token Exposure (Recommended)

```python
# backend/routes/password_reset.py
@password_reset_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    # ... existing logic ...

    response_data = {
        "message": "If an account exists with this email, a password reset link has been sent."
    }

    # NEVER include token in response
    # Use proper email service for all environments

    # Log success without sensitive data
    if current_app.config.get("DEBUG"):
        current_app.logger.info(
            f"Development mode: Reset email would be sent to {email}"
        )

    return jsonify(response_data), 200
```

### Option 2: Secure Development Testing

```python
# Alternative: Secure development helper endpoint
@password_reset_bp.route("/dev/last-reset-token", methods=["GET"])
def get_last_reset_token_dev():
    """Development-only endpoint to get last reset token for testing"""
    if not current_app.config.get("DEBUG"):
        abort(404)

    # Require special header or parameter for extra security
    dev_key = request.headers.get("X-Dev-Token")
    if dev_key != os.getenv("DEV_ACCESS_KEY"):
        abort(403)

    # Return last token for current user only
    user_id = int(get_jwt_identity())
    last_token = PasswordResetToken.query.filter_by(
        user_id=user_id,
        is_used=False
    ).order_by(PasswordResetToken.created_at.desc()).first()

    if not last_token:
        return jsonify({"error": "No recent reset token found"}), 404

    return jsonify({"token": last_token.token}), 200
```

### Option 3: Mock Email Service for Development

```python
# backend/services/email_service.py
class MockEmailService:
    """Development-only email service that logs instead of sending"""

    def send_password_reset_email(self, to_email, reset_token, frontend_url):
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        # Log email content instead of exposing token
        current_app.logger.info(
            f"MOCK EMAIL to {to_email}:\n"
            f"Subject: Reset Your Password\n"
            f"Reset link: {reset_link}\n"
            f"(Email would be sent in production)"
        )

        return {"success": True, "message": "Mock email logged"}

# Use mock service in development
if current_app.config.get("DEBUG") and not os.getenv("SENDGRID_API_KEY"):
    email_service = MockEmailService()
else:
    email_service = EmailService()
```

## Recommended Implementation

### Step 1: Remove Immediate Exposure

```python
# backend/routes/password_reset.py - Remove token from response
def forgot_password():
    # ... existing validation ...

    response_data = {
        "message": "If an account exists with this email, a password reset link has been sent."
    }

    # Remove this block:
    # if current_app.config.get("DEBUG"):
    #     response_data["reset_token"] = token

    return jsonify(response_data), 200
```

### Step 2: Secure Development Workflow

```javascript
// frontend/src/components/ForgotPasswordModal.jsx
const handleSubmit = async (e) => {
    try {
        const response = await api.post("/auth/forgot-password", {
            email: email.trim(),
        });

        // Always show standard message
        onSuccess(response.data.message);

        // Remove development token display:
        // onSuccess(response.data.message, response.data.reset_token);
    } catch (error) {
        setError(error.response?.data?.error || "Unable to send reset email");
    }
};
```

### Step 3: Enhanced Development Testing

```bash
# Development environment setup
# Use proper email service even in development
SENDGRID_API_KEY=<test-api-key>
SENDGRID_FROM_EMAIL=dev@localhost

# Or use mock email service
EMAIL_SERVICE_MODE=mock
```

## Implementation Steps

### Phase 1: Remove Token Exposure

-   [ ] Remove token from API response in password reset
-   [ ] Remove token display in frontend UI
-   [ ] Update development workflow documentation

### Phase 2: Secure Development Testing

-   [ ] Implement mock email service for development
-   [ ] Create development testing documentation
-   [ ] Set up proper development email configuration

### Phase 3: Environment Validation

-   [ ] Add environment validation for production deployments
-   [ ] Ensure DEBUG=False in production
-   [ ] Add deployment checks for sensitive information

## Files to Modify

-   `backend/routes/password_reset.py` - Remove token exposure
-   `frontend/src/pages/Login.jsx` - Remove token display
-   `frontend/src/components/ForgotPasswordModal.jsx` - Update success handling
-   `backend/services/email_service.py` - Add mock service
-   `docs/DEVELOPMENT.md` - Update testing workflow
-   `docs/DEPLOYMENT.md` - Add security checks

## Testing Requirements

-   [ ] Password reset works without token exposure
-   [ ] Development testing still functional
-   [ ] Production deployment validates environment
-   [ ] No sensitive data in logs or responses

## Related Security Issues

-   Environment variable validation (#XX)
-   Email service security configuration (#XX)

## Labels

`security`, `high`, `information-disclosure`, `backend`, `frontend`, `development`

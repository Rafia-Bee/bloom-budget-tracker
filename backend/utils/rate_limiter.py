"""
Bloom - Rate Limiting Utilities

Database-backed rate limiter for protecting authentication endpoints.
Persists across restarts (CRITICAL-2).
"""

from functools import wraps
from flask import request, jsonify, current_app
from datetime import datetime, timedelta, timezone
import random
from backend.models.database import db, RateLimit

# Rate limits: {endpoint: (max_requests, time_window_seconds)}
RATE_LIMITS = {
    "auth.login": (50, 300),  # 50 attempts per 5 minutes (increased for dev)
    "auth.register": (10, 3600),  # 10 registrations per hour
    # 3 password reset emails per hour
    "password_reset.forgot_password": (3, 3600),
    "default": (1000, 60),  # 1000 requests per minute for other endpoints
}


def rate_limit(endpoint_name=None):
    """
    Rate limiting decorator.

    Args:
        endpoint_name: Name of the endpoint (for custom rate limits)
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if rate limiting is disabled (e.g., in tests)
            if not current_app.config.get("RATELIMIT_ENABLED", True):
                return f(*args, **kwargs)

            # Get client IP
            client_ip = request.remote_addr or "unknown"

            # Get rate limit for this endpoint
            limit_key = endpoint_name or "default"
            max_requests, window_seconds = RATE_LIMITS.get(
                limit_key, RATE_LIMITS["default"]
            )

            key = f"{client_ip}:{limit_key}"
            now = datetime.now(timezone.utc)
            cutoff = now - timedelta(seconds=window_seconds)

            try:
                # Count requests in window
                request_count = RateLimit.query.filter(
                    RateLimit.key == key, RateLimit.timestamp > cutoff
                ).count()

                # Check if limit exceeded
                if request_count >= max_requests:
                    return (
                        jsonify(
                            {
                                "error": "Too many requests. Please try again later.",
                                "retry_after": window_seconds,
                            }
                        ),
                        429,
                    )

                # Log this request
                db.session.add(RateLimit(key=key, timestamp=now))

                # Cleanup old entries (1% probability)
                if random.random() < 0.01:
                    RateLimit.query.filter(RateLimit.timestamp < cutoff).delete()

                db.session.commit()

            except Exception as e:
                # Fallback if DB fails (e.g. during migration or connection issue)
                current_app.logger.error(f"Rate limiter error: {str(e)}")
                # Allow request to proceed if rate limiter fails
                pass

            # Execute the actual endpoint
            return f(*args, **kwargs)

        return decorated_function

    return decorator

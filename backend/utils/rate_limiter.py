"""
Bloom - Rate Limiting Utilities

Simple in-memory rate limiter for protecting authentication endpoints.
For production, consider using Redis-based solution.
"""

from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta
from collections import defaultdict

# Store: {ip_address: [(timestamp, endpoint), ...]}
_request_history = defaultdict(list)

# Rate limits: {endpoint: (max_requests, time_window_seconds)}
RATE_LIMITS = {
    "auth.login": (50, 300),  # 50 attempts per 5 minutes (increased for dev)
    "auth.register": (10, 3600),  # 10 registrations per hour
    "password_reset.forgot_password": (3, 3600),  # 3 password reset emails per hour
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
            # Get client IP
            client_ip = request.remote_addr or "unknown"

            # Get rate limit for this endpoint
            limit_key = endpoint_name or "default"
            max_requests, window_seconds = RATE_LIMITS.get(
                limit_key, RATE_LIMITS["default"]
            )

            # Clean up old entries
            now = datetime.utcnow()
            cutoff = now - timedelta(seconds=window_seconds)
            _request_history[client_ip] = [
                (ts, ep) for ts, ep in _request_history[client_ip] if ts > cutoff
            ]

            # Count requests for this endpoint in the time window
            endpoint_requests = [
                ts for ts, ep in _request_history[client_ip] if ep == limit_key
            ]

            # Check if limit exceeded
            if len(endpoint_requests) >= max_requests:
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
            _request_history[client_ip].append((now, limit_key))

            # Execute the actual endpoint
            return f(*args, **kwargs)

        return decorated_function

    return decorator

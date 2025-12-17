# Security: Rate Limiting Bypass via Server Restarts

## Priority

🟡 **MEDIUM** - Security vulnerability

## Description

Rate limiting is implemented using in-memory storage that resets on server restarts. This creates a bypass opportunity, especially on platforms like Render that frequently restart containers for free tier services.

## Security Risk

-   **Impact**: Medium - Authentication brute force attacks possible
-   **Likelihood**: High - Render cold starts happen frequently
-   **CVSS**: Medium (5.5+)

## Current Implementation Issues

### In-Memory Storage

**File**: `backend/utils/rate_limiter.py:17`

```python
# Store: {ip_address: [(timestamp, endpoint), ...]}
_request_history = defaultdict(list)
```

### Reset on Restart Risk

Rate limits completely reset when:

-   Server restarts (Render cold starts)
-   Application crashes and restarts
-   Deployment updates
-   Memory cleanup operations

## Attack Scenarios

### Scenario 1: Brute Force with Restart Exploitation

1. Attacker attempts 5 login attempts (hits rate limit)
2. Waits for cold start or triggers restart
3. Rate limit counter resets to 0
4. Continues brute force attack
5. Repeats process indefinitely

### Scenario 2: Coordinated Attack

1. Multiple attackers coordinate timing
2. Exploit known restart windows
3. Bypass email flooding protections
4. Overwhelm authentication system

## Current Rate Limits

**File**: `backend/utils/rate_limiter.py:19-24`

```python
RATE_LIMITS = {
    "auth.login": (50, 300),  # 50 attempts per 5 minutes
    "auth.register": (10, 3600),  # 10 registrations per hour
    "password_reset.forgot_password": (3, 3600),  # 3 password reset emails per hour
    "default": (1000, 60),  # 1000 requests per minute for other endpoints
}
```

## Persistent Storage Solutions

### Option 1: Redis-based Rate Limiting (Recommended)

```python
# backend/utils/redis_rate_limiter.py
import redis
from datetime import datetime, timedelta
from flask import current_app

redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

def redis_rate_limit(endpoint_name=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr or "unknown"
            limit_key = endpoint_name or "default"
            max_requests, window_seconds = RATE_LIMITS.get(limit_key, RATE_LIMITS["default"])

            # Redis key for this IP + endpoint
            key = f"rate_limit:{client_ip}:{limit_key}"

            # Get current count
            current_count = redis_client.get(key)

            if current_count is None:
                # First request in window
                redis_client.setex(key, window_seconds, 1)
                return f(*args, **kwargs)

            current_count = int(current_count)

            if current_count >= max_requests:
                return jsonify({
                    "error": "Too many requests. Please try again later.",
                    "retry_after": redis_client.ttl(key)
                }), 429

            # Increment counter
            redis_client.incr(key)
            return f(*args, **kwargs)

        return decorated_function
    return decorator
```

### Option 2: Database-based Rate Limiting

```python
# backend/models/database.py
class RateLimitEntry(db.Model):
    __tablename__ = "rate_limits"

    id = db.Column(db.Integer, primary_key=True)
    client_ip = db.Column(db.String(45), nullable=False)  # IPv6 support
    endpoint = db.Column(db.String(100), nullable=False)
    request_count = db.Column(db.Integer, default=1)
    window_start = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    __table_args__ = (
        db.Index('idx_rate_limit_lookup', 'client_ip', 'endpoint'),
        db.Index('idx_rate_limit_cleanup', 'expires_at'),
    )

def database_rate_limit(endpoint_name=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr or "unknown"
            limit_key = endpoint_name or "default"
            max_requests, window_seconds = RATE_LIMITS.get(limit_key, RATE_LIMITS["default"])

            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window_seconds)

            # Clean up expired entries
            RateLimitEntry.query.filter(RateLimitEntry.expires_at < now).delete()

            # Check current usage
            current_entry = RateLimitEntry.query.filter_by(
                client_ip=client_ip,
                endpoint=limit_key
            ).filter(RateLimitEntry.window_start > window_start).first()

            if current_entry:
                if current_entry.request_count >= max_requests:
                    return jsonify({
                        "error": "Too many requests. Please try again later.",
                        "retry_after": int((current_entry.expires_at - now).total_seconds())
                    }), 429

                # Increment existing entry
                current_entry.request_count += 1
            else:
                # Create new entry
                new_entry = RateLimitEntry(
                    client_ip=client_ip,
                    endpoint=limit_key,
                    request_count=1,
                    window_start=now,
                    expires_at=now + timedelta(seconds=window_seconds)
                )
                db.session.add(new_entry)

            db.session.commit()
            return f(*args, **kwargs)

        return decorated_function
    return decorator
```

### Option 3: Hybrid Approach

```python
# Combine in-memory (fast) with persistent backup
def hybrid_rate_limit(endpoint_name=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Try in-memory first (fast)
            try:
                return in_memory_rate_limit(endpoint_name)(f)(*args, **kwargs)
            except RateLimitExceeded:
                # Verify with persistent storage
                return persistent_rate_limit(endpoint_name)(f)(*args, **kwargs)
        return decorated_function
    return decorator
```

## Recommended Implementation (Redis)

### Step 1: Redis Integration

```python
# backend/config.py - Add Redis configuration
class Config:
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    RATE_LIMIT_STORAGE = os.getenv('RATE_LIMIT_STORAGE', 'memory')  # 'redis' or 'memory'

# backend/app.py - Initialize Redis
from redis import Redis
import redis

def create_app(config_name="development"):
    app = Flask(__name__)
    # ... existing setup ...

    # Initialize Redis for rate limiting
    if app.config.get('RATE_LIMIT_STORAGE') == 'redis':
        try:
            app.redis = Redis.from_url(app.config['REDIS_URL'])
            app.redis.ping()  # Test connection
        except Exception as e:
            app.logger.warning(f"Redis unavailable, falling back to in-memory rate limiting: {e}")
            app.redis = None

    return app
```

### Step 2: Fallback Strategy

```python
# backend/utils/rate_limiter.py - Enhanced with fallback
def rate_limit(endpoint_name=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if hasattr(current_app, 'redis') and current_app.redis:
                return redis_rate_limit(endpoint_name)(f)(*args, **kwargs)
            else:
                return memory_rate_limit(endpoint_name)(f)(*args, **kwargs)
        return decorated_function
    return decorator
```

## Implementation Plan

### Phase 1: Redis Integration

-   [ ] Add Redis configuration to deployment
-   [ ] Implement Redis-based rate limiter
-   [ ] Add fallback to in-memory for development
-   [ ] Test rate limiting persistence across restarts

### Phase 2: Enhanced Monitoring

-   [ ] Add rate limit metrics and logging
-   [ ] Monitor abuse patterns
-   [ ] Alert on suspicious activity
-   [ ] Dashboard for rate limit status

### Phase 3: Advanced Features

-   [ ] Different limits per user type
-   [ ] IP whitelist/blacklist functionality
-   [ ] Adaptive rate limiting based on server load
-   [ ] Integration with fail2ban or similar tools

## Deployment Requirements

### Redis Hosting Options

1. **Redis Cloud**: Free tier available
2. **Heroku Redis**: If migrating from Render
3. **AWS ElastiCache**: For production scaling
4. **Self-hosted**: Redis container on same platform

### Environment Variables

```bash
# Production environment
REDIS_URL=redis://user:pass@host:port/0
RATE_LIMIT_STORAGE=redis

# Development fallback
RATE_LIMIT_STORAGE=memory
```

## Files to Modify

-   `backend/utils/rate_limiter.py` - Add Redis support
-   `backend/config.py` - Redis configuration
-   `backend/app.py` - Redis initialization
-   `requirements.txt` - Add Redis dependency
-   `docs/DEPLOYMENT.md` - Redis setup instructions
-   `render.yaml` - Add Redis service configuration

## Testing Requirements

-   [ ] Rate limits persist across server restarts
-   [ ] Fallback works when Redis unavailable
-   [ ] Performance acceptable under load
-   [ ] Cleanup of expired entries works
-   [ ] Multiple instances sync correctly

## Performance Considerations

-   Redis adds ~1-2ms per request
-   In-memory fallback maintains speed
-   Redis connection pooling important
-   Monitor Redis memory usage

## Related Security Issues

-   Account lockout mechanism (#XX)
-   Brute force protection enhancement (#XX)

## Labels

`security`, `medium`, `backend`, `rate-limiting`, `infrastructure`, `redis`

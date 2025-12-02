# API Versioning

Bloom Budget Tracker uses API versioning to ensure backward compatibility and safe evolution of the API.

## Current Version

**v1** - `/api/v1/*`

All API endpoints are now prefixed with `/api/v1/`:

```
/api/v1/auth/login
/api/v1/auth/register
/api/v1/expenses
/api/v1/income
/api/v1/debts
/api/v1/budget-periods
/api/v1/salary-periods
/api/v1/recurring-expenses
/api/v1/recurring-generation
/api/v1/export
/api/v1/import
```

## Frontend Configuration

**Development (`.env`):**
```env
VITE_API_URL=http://localhost:5000/api/v1
```

**Production (`.env.production`):**
```env
VITE_API_URL=https://bloom-backend-b44r.onrender.com/api/v1
```

## Backward Compatibility

Legacy routes (without `/api/v1` prefix) are still available for backward compatibility but will be deprecated in a future release:

```
⚠️ DEPRECATED (will be removed in v2):
/auth/login          → Use /api/v1/auth/login
/expenses            → Use /api/v1/expenses
/income              → Use /api/v1/income
```

**Migration Timeline:**
- **Now:** Both versioned and legacy routes work
- **v1.1:** Deprecation warnings added to legacy routes
- **v2.0:** Legacy routes removed completely

## Adding New Versions

When breaking changes are needed:

1. **Create new version file:**
   ```python
   # backend/routes/api_v2.py
   def create_v2_blueprint():
       v2_bp = Blueprint('api_v2', __name__, url_prefix='/api/v2')
       # Register v2 routes
       return v2_bp
   ```

2. **Register in app.py:**
   ```python
   from backend.routes.api_v2 import create_v2_blueprint

   v2_bp = create_v2_blueprint()
   app.register_blueprint(v2_bp)
   ```

3. **Update frontend:**
   ```env
   VITE_API_URL=http://localhost:5000/api/v2
   ```

## Version Deprecation Policy

- **Minimum Support:** 2 major versions (v1 + v2 when v3 released)
- **Deprecation Notice:** 6 months before removal
- **Documentation:** Clearly mark deprecated endpoints
- **Migration Guide:** Provide upgrade path for each breaking change

## Benefits

✅ **Backward Compatibility** - Old clients continue working during upgrades
✅ **Safe Refactoring** - Make breaking changes without disrupting users
✅ **Clear Communication** - Version in URL makes API contract explicit
✅ **Gradual Migration** - Users can upgrade at their own pace
✅ **Professional API** - Industry-standard versioning approach

## Testing Different Versions

**Using curl:**
```bash
# v1
curl http://localhost:5000/api/v1/expenses

# Legacy (deprecated)
curl http://localhost:5000/expenses
```

**Using frontend:**
```javascript
// api.js automatically uses VITE_API_URL
const API_URL = import.meta.env.VITE_API_URL || "/api/v1";
```

## Version History

### v1 (2025-11-30)
- Initial versioned API release
- All existing endpoints moved under `/api/v1/`
- Legacy routes maintained for compatibility

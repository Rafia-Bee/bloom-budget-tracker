# Test Suite

Quick reference for running tests safely without consuming service quotas.

## ✅ Safe Tests (Run Unlimited Times)

All pytest tests use **in-memory SQLite** and **mocked external services**.
No real emails, no Neon DB usage, no API calls.

```powershell
# Activate venv
.\.venv\Scripts\Activate.ps1

# Run all tests - 100% safe, fully mocked
pytest

# With coverage
pytest --cov=backend --cov-report=html
```

## Service Limit Protection

### Email (SendGrid - 100/day)
✅ **All pytest tests mock EmailService** - conftest.py patches globally
⚠️ **scripts/test_email.py sends 1 REAL email** - use max 1-2 times/day!

### Database (Neon - 100 compute hours/month)
✅ **All pytest tests use in-memory SQLite** - zero Neon usage
⚠️ **Manual scripts may connect to real DB** - check before running

### Rate Limiting
✅ **Disabled in tests** via RATELIMIT_ENABLED = False

## Frontend Tests (Vitest)

```powershell
cd frontend

# Run tests
npm test

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

## Test Files

**Backend:**
- `backend/tests/test_auth.py` - Authentication
- `backend/tests/test_crud.py` - CRUD operations
- `backend/tests/test_business_logic.py` - Business logic

**Frontend:**
- `frontend/src/test/AddExpenseModal.test.jsx` - Expense modal

See `docs/TESTING.md` for detailed guide.

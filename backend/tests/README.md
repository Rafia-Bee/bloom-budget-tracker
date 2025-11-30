# Test Suite

Quick reference for running tests.

## Backend Tests (pytest)

```powershell
# Activate venv
.\.venv\Scripts\Activate.ps1

# Run all tests
pytest

# With coverage
pytest --cov=backend --cov-report=html
```

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

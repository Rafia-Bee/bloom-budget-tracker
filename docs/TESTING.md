# Testing Guide

## Overview

Bloom uses **pytest** for backend testing and **Vitest + React Testing Library** for frontend testing.

## Backend Tests

### Running Tests

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest backend/tests/test_auth.py

# Run specific test
pytest backend/tests/test_auth.py::TestAuthRegistration::test_register_success
```

### Test Structure

- `backend/tests/conftest.py` - Fixtures and test configuration
- `backend/tests/test_auth.py` - Authentication flow tests
- `backend/tests/test_crud.py` - CRUD operation tests
- `backend/tests/test_business_logic.py` - Business logic tests

### Key Fixtures

- `app` - Flask app with test configuration
- `client` - Test client for API calls
- `auth_headers` - Authenticated user headers
- `salary_period` - Pre-created salary period for tests

## Frontend Tests

### Running Tests

```powershell
# Navigate to frontend
cd frontend

# Install dependencies (if not done)
npm install

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Test Structure

- `frontend/src/test/setup.js` - Test environment setup
- `frontend/src/test/utils.js` - Testing utilities
- `frontend/src/test/*.test.jsx` - Component tests

### Writing Tests

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

## Test Coverage

Current test coverage focuses on:

### Backend
- ✅ Auth flows (register, login, token validation)
- ✅ CRUD operations (expenses, income, periods)
- ✅ Carryover logic
- ✅ Recurring expense generation
- ✅ Debt auto-archiving
- ✅ Expense date assignment

### Frontend
- ✅ AddExpenseModal rendering and validation
- ⏳ SalaryPeriodWizard (to be expanded)
- ⏳ LeftoverBudgetModal (to be expanded)
- ⏳ Dashboard integration tests (to be expanded)

## CI/CD Integration

### GitHub Actions (Future)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest --cov=backend

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm test
```

## Best Practices

1. **Write tests first** - TDD approach when adding new features
2. **Keep tests isolated** - Each test should be independent
3. **Use descriptive names** - Test names should explain what they test
4. **Mock external dependencies** - Don't make real API calls
5. **Test edge cases** - Not just happy paths
6. **Maintain coverage** - Aim for >80% coverage on critical paths

## Debugging Tests

### Backend
```powershell
# Run with verbose output
pytest -v

# Run with print statements
pytest -s

# Run with debugger
pytest --pdb
```

### Frontend
```powershell
# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Debug specific test
npm test -- AddExpenseModal
```

## Common Issues

### Backend
- **Import errors**: Ensure virtual environment is activated
- **Database errors**: Tests use in-memory SQLite, no migration needed
- **Token errors**: Check JWT configuration in conftest.py

### Frontend
- **Component not found**: Check import paths
- **Async errors**: Use `await` with user events
- **DOM errors**: Ensure proper cleanup with `afterEach`

## Future Enhancements

- [ ] Integration tests with real database
- [ ] E2E tests with Playwright
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Load testing for API endpoints

# Contributing to Bloom

Thank you for your interest in contributing to Bloom! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. **Fork and clone the repository**

   ```powershell
   git clone https://github.com/your-username/bloom-budget-tracker.git
   cd bloom-budget-tracker
   ```

2. **Install dependencies**

   Backend:
   ```powershell
   pip install -r requirements.txt
   ```

   Frontend:
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and configure as needed.

4. **Run database migrations**

   ```powershell
   python scripts/maintenance.py migrate
   ```

5. **Seed test data (optional)**

   ```powershell
   python -m backend.seed_data
   ```

## Development Workflow

### Running the Application

Use the PowerShell startup script:

```powershell
.\start.ps1
```

Or manually start both servers:

```powershell
# Terminal 1 - Backend
python run.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Making Changes

1. **Create a feature branch**

   ```powershell
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the code style guidelines (see below)
   - Add tests if applicable
   - Update documentation

3. **Test your changes**

   Run the test suite:
   ```powershell
   python scripts/test_api.py
   ```

   Verify database integrity:
   ```powershell
   python scripts/maintenance.py verify-db
   ```

4. **Commit your changes**

   Use descriptive commit messages:
   ```powershell
   git add -A
   git commit -m "feat: add new feature description"
   ```

   Commit message format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. **Push to your fork**

   ```powershell
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes

## Code Style Guidelines

### Python (Backend)

- Follow PEP 8 style guide
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions focused and small
- Use type hints where applicable

Example:
```python
def calculate_total_expenses(user_id: int, period_id: int) -> int:
    """
    Calculate total expenses for a user in a specific budget period.

    Args:
        user_id: The ID of the user
        period_id: The ID of the budget period

    Returns:
        Total expenses in cents
    """
    expenses = Expense.query.filter_by(
        user_id=user_id,
        budget_period_id=period_id
    ).all()

    return sum(expense.amount for expense in expenses)
```

### JavaScript/React (Frontend)

- Use functional components with hooks
- Follow ESLint configuration
- Use meaningful component and variable names
- Keep components small and focused
- Use PropTypes or TypeScript for type checking

Example:
```jsx
const ExpenseCard = ({ expense, onEdit, onDelete }) => {
  const formattedAmount = (expense.amount / 100).toFixed(2);

  return (
    <div className="expense-card">
      <h3>{expense.name}</h3>
      <p className="amount">€{formattedAmount}</p>
      <div className="actions">
        <button onClick={() => onEdit(expense.id)}>Edit</button>
        <button onClick={() => onDelete(expense.id)}>Delete</button>
      </div>
    </div>
  );
};
```

## Project Structure

```
Bloom/
├── backend/           # Flask API
│   ├── models/       # SQLAlchemy models
│   ├── routes/       # API route handlers
│   └── utils/        # Helper functions
├── frontend/         # React application
│   └── src/
│       ├── components/  # Reusable components
│       ├── pages/       # Page components
│       └── api.js       # API client
├── scripts/          # Utility scripts
├── docs/             # Documentation
└── instance/         # SQLite database (gitignored)
```

## Adding New Features

### Backend (API Endpoint)

1. Create or update model in `backend/models/database.py`
2. Create route handler in `backend/routes/`
3. Register blueprint in `backend/app.py`
4. Add to seed data if applicable (`backend/seed_data.py`)
5. Document in `docs/FEATURES.md`

### Frontend (UI Component)

1. Create component in `frontend/src/components/`
2. Add API client methods in `frontend/src/api.js`
3. Integrate into relevant page component
4. Update `docs/FRONTEND_REQUIREMENTS.md`

### Database Changes

1. Create migration function in `scripts/maintenance.py`
2. Update model in `backend/models/database.py`
3. Test migration with `python scripts/maintenance.py migrate`
4. Document changes in commit message

## Testing

### Manual Testing Checklist

- [ ] Test on Chrome, Firefox, and Safari
- [ ] Test on mobile viewport (responsive design)
- [ ] Test authentication flow (login/logout)
- [ ] Test CRUD operations for all entities
- [ ] Test edge cases (empty states, errors)
- [ ] Verify database integrity after operations

### API Testing

Run the test script:
```powershell
python scripts/test_api.py
```

### Database Verification

```powershell
python scripts/maintenance.py verify-db
```

## Documentation

When adding new features:

1. **Update README.md** - Add to feature list if user-facing
2. **Update docs/FEATURES.md** - Detailed feature specifications
3. **Update docs/FRONTEND_REQUIREMENTS.md** - UI/UX requirements
4. **Add inline comments** - Explain complex logic
5. **Update API documentation** - Document new endpoints

## Maintenance Scripts

### Database Maintenance

```powershell
# Run all migrations
python scripts/maintenance.py migrate

# Clean up orphaned records
python scripts/maintenance.py cleanup-recurring

# Remove duplicates
python scripts/maintenance.py remove-duplicates

# Verify database integrity
python scripts/maintenance.py verify-db
```

See [scripts/README.md](scripts/README.md) for details.

## Common Tasks

### Adding a New Database Model

1. Define model in `backend/models/database.py`
2. Create migration in `scripts/maintenance.py`
3. Run migration: `python scripts/maintenance.py migrate`
4. Add to seed data for testing
5. Create CRUD routes in `backend/routes/`

### Adding a New API Endpoint

1. Create route handler in appropriate file in `backend/routes/`
2. Add JWT authentication if needed: `@jwt_required()`
3. Test endpoint with Postman or `scripts/test_api.py`
4. Add corresponding frontend API method in `frontend/src/api.js`

### Adding a New UI Component

1. Create component file in `frontend/src/components/`
2. Import and use in relevant page
3. Add necessary API calls
4. Test responsive design
5. Update documentation

## Getting Help

- Check existing documentation in `docs/`
- Review closed issues on GitHub
- Ask questions in pull request comments
- Contact maintainers

## License

By contributing to Bloom, you agree that your contributions will be licensed under the project's license.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

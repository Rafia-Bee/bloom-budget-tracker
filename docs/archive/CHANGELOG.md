# Changelog

All notable changes to Bloom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CONTRIBUTING.md with development guidelines
- CHANGELOG.md for version tracking
- Comprehensive documentation structure in `docs/` directory
- Consolidated maintenance script in `scripts/maintenance.py`
- Scripts README with usage documentation

### Changed
- Reorganized project structure for better maintainability
- Moved all documentation to `docs/` directory
- Moved utility scripts to `scripts/` directory
- Consolidated one-time migration scripts into maintenance.py
- Updated README.md with new structure and documentation links

### Removed
- Individual migration scripts (now in maintenance.py):
  - `backend/migrate_add_archived.py`
  - `backend/migrate_add_recurring_expenses.py`
  - `backend/cleanup_recurring_expenses.py`
  - `backend/remove_duplicate_recurring.py`

## [0.2.0] - 2025-11-15

### Added
- **Recurring Expenses Automation**
  - RecurringExpense model with flexible scheduling (weekly/biweekly/monthly/custom)
  - Full CRUD API with JWT authentication
  - AddRecurringExpenseModal component (367 lines)
  - RecurringExpenses management page (398 lines)
  - Auto-generation utility with 60-day lookahead
  - "⚡ Generate Now" button with result notifications
  - Recurring checkbox in Add Expense modal
  - Purple "Recurring" badge on Dashboard transactions
  - Scrollable modal layout (max-h-[90vh])
  - Scheduled task runner script
  - 10 sample recurring templates in seed data
  - Complete documentation (RECURRING_EXPENSES.md)

### Fixed
- Future period generation now creates expenses 60 days ahead
- Generated expenses properly assigned to budget periods
- Modal overflow issues on smaller screens

## [0.1.0] - 2025-11-15

### Added
- **Core Features**
  - User authentication with JWT tokens
  - Flexible budget periods (weekly, monthly, custom)
  - Unified transaction tracking (expenses and income)
  - Transaction editing and deletion
  - Debit/Credit card payment tracking
  - Balance limit warnings

- **Debt Management**
  - Full CRUD debt tracking system
  - Debts page with summary cards
  - Auto-updating debt balances
  - Visual progress bars and payoff projections
  - Expandable payment history
  - Debt archive system (auto-archives when paid off)
  - AddDebtPaymentModal component

- **User Experience**
  - Period calendar UI with grid/list toggle
  - Sticky header navigation
  - User email display with dropdown menu
  - Streamlined floating action menu
  - Future/scheduled transaction indicators
  - Comprehensive seed data (62 transactions)

- **Documentation**
  - README.md with quick start guide
  - FEATURES.md with detailed specifications
  - FRONTEND_REQUIREMENTS.md with design system

### Changed
- Default period type to weekly intervals
- Period type dropdown order (Weekly first)
- Credit card visibility logic

### Fixed
- Income API filtering bug (was missing budget_period_id)
- Balance carry-over between periods
- New transactions not linked to budget periods
- 401 errors on login page
- Archived debts count display on page load

## [0.0.1] - 2025-11-13

### Added
- Initial project setup
- Flask backend with SQLAlchemy
- React frontend with Vite and Tailwind CSS
- Basic database schema
- Authentication system
- Development startup script (start.ps1)

[Unreleased]: https://github.com/Rafia-Bee/bloom-budget-tracker/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Rafia-Bee/bloom-budget-tracker/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Rafia-Bee/bloom-budget-tracker/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/Rafia-Bee/bloom-budget-tracker/releases/tag/v0.0.1

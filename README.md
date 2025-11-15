# Bloom

> Financial Habits That Grow With You

A flexible web-based budget tracking application accessible from any device (Android, iPad, PC).

## Current Status

✅ **Fully Functional Budget Tracker** - All core features implemented and working

### Completed Features

- ✅ User authentication with JWT tokens
- ✅ Flexible budget periods (weekly, monthly, custom intervals)
- ✅ Unified transaction tracking (expenses and income)
- ✅ Transaction editing and deletion
- ✅ Debit/Credit card payment tracking with balance limits
- ✅ Debt management with automatic balance updates
- ✅ Debt payment tracking with expandable history
- ✅ Debt archive system (auto-archives when paid off)
- ✅ Visual progress indicators and payoff projections
- ✅ Period-based transaction filtering
- ✅ Cumulative balance calculations across periods
- ✅ Future/scheduled transaction indicators
- ✅ Sticky navigation with user email display
- ✅ Streamlined debt payment workflow
- ✅ Recurring expenses automation with smart scheduling
- ✅ Auto-generation of recurring expenses (60-day lookahead)
- ✅ Recurring expense templates management
- ✅ Purple "Recurring" badge on Dashboard transactions
- ✅ Comprehensive seed data for testing

### In Development

- 🚧 End-of-period suggestions
- 📋 Budget categories & spending limits
- 📋 Reports & analytics

## Core Features

### Budget Management

- **Flexible Budget Periods**: User-defined periods (weekly, bi-weekly, monthly, custom)
- **Cross-Platform**: Web interface accessible from all devices
- **Budget Monitoring**: Visual progress tracking against budget limits
- **Period History**: View past budget periods and spending patterns

### Quick Expense Entry (Max 3-4 Clicks)

- **Smart Defaults**: Pre-filled form with most common expense (Wolt, Flex category, Food subcategory)
- **Quick Save**: Enter amount only and press Enter/Save
- **Flexible Override**: Can modify any pre-filled field when needed
- **Date Auto-Fill**: Defaults to current date
- **Payment Method**: Credit card checkbox (default: checked)

### Expense Categories

1. **Fixed Expenses**: Rent, bills, subscriptions, insurance
2. **Debt Payments**: Student loans, personal loans, credit card debt (paid monthly on payday)
3. **Sinking Funds**: Travel savings, clothing fund, etc.
4. **Flexible Expenses**: Food, shopping, cat food
5. **Investments**: Funds, ETFs (tracked separately, excluded from Total Balance)
6. **Savings**: Money to savings account (tracked separately, excluded from Total Balance)

### AI-Powered Subcategorization

- **Automatic Classification**: Expense names automatically subcategorized
  - "wolt" → Food
  - "netflix" → Entertainment
  - "temu", "shein" → Shopping
  - "zooplus" → Cat Stuff
- **Manual Updates**: Developer periodically updates subcategories via database access
- **No API Key Needed**: Assistant manually categorizes new expense names

### Payment Method Tracking

- **Debit Card**: Default bank account balance
- **Credit Card**: €1,500 credit limit with goal to pay off monthly
- **No Cash Tracking**: App handles card payments only
- Each expense can be assigned to either debit or credit card

### Income Tracking

1. **Salary**:
   - Fixed amount paid on the 20th of each month
   - Auto-adjusts to previous Friday if 20th falls on weekend
2. **Savings**:
   - Auto-calculated from Savings category expenses
   - Displayed separately, excluded from Total Balance
3. **Investments**:
   - Similar to Savings tracking
   - Excluded from Total Balance

### End-of-Period Suggestions

- **Smart Recommendations**: App suggests how to use leftover balance
  - Priority 1: Pay off credit card in full
  - Priority 2: Make extra debt payments
  - Priority 3: Add to savings
- **User Choice**: Accept all, customize, or decline suggestions

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Flask (Python) - RESTful API
- **Database**: SQLite
- **Styling**: Tailwind CSS
- **Authentication**: JWT tokens

## Project Structure

```text
Bloom/
├── backend/              # Flask API
│   ├── models/          # Database models (User, BudgetPeriod, Expense, Income, Debt)
│   ├── routes/          # API endpoints (auth, budget_periods, expenses, income, debts)
│   ├── utils/           # Helper functions (recurring expense generation)
│   ├── app.py           # Flask application setup
│   ├── config.py        # Configuration
│   ├── seed_data.py     # Test data generation
│   └── run_recurring_generation.py  # Scheduled task for recurring expenses
├── frontend/            # React web app
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Main pages (Dashboard, Debts, Login, Register, RecurringExpenses)
│       ├── api.js       # API client
│       └── main.jsx     # App entry point
├── scripts/             # Utility scripts
│   ├── maintenance.py   # Database maintenance & migrations
│   ├── test_api.py      # API testing script
│   └── README.md        # Scripts documentation
├── docs/                # Documentation
│   ├── FEATURES.md      # Feature specifications
│   ├── FRONTEND_REQUIREMENTS.md  # UI/UX requirements
│   ├── RECURRING_EXPENSES.md     # Recurring expenses documentation
│   └── README.md        # Documentation index
├── instance/            # SQLite database (gitignored)
├── run.py              # Application entry point
├── start.ps1           # Development startup script
└── requirements.txt    # Python dependencies
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+

### Installation

1. **Install backend dependencies:**

   ```powershell
   pip install -r requirements.txt
   ```

2. **Install frontend dependencies:**

   ```powershell
   cd frontend
   npm install
   cd ..
   ```

3. **Seed test data (optional):**

   ```powershell
   python -m backend.seed_data
   ```

   Creates test user (email: `test@test.com`, password: `test`) with 4 weekly November periods and 62 sample transactions.

4. **Run database migrations (if upgrading from older version):**

   ```powershell
   python scripts/maintenance.py migrate
   ```

### Running the Application

**Development mode (concurrent servers):**

```powershell
.\start.ps1
```

This starts both backend (port 5000) and frontend (port 3000) simultaneously.

**Manual start:**

```powershell
# Terminal 1 - Backend
python run.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the app at `http://localhost:3000`

## Usage

### First Time Setup

1. Register a new account or use test credentials:
   - Email: `test@test.com`
   - Password: `test`

2. Create your first budget period:
   - Click "Create New Period" button
   - Choose period type (weekly/monthly/custom)
   - Set start and end dates

3. Add transactions:
   - Use floating "+" button for quick access
   - Add Income, Add Expense, or Debt Payment
   - Transactions are automatically linked to the active period

### Managing Debts

1. Navigate to "Debts" page
2. Click "Add Debt" to create a new debt
3. Record payments via "Debt Payment" button (pre-fills category)
5. View payment history by expanding debt cards
6. Archived debts (fully paid) appear in collapsible "Archived Debts" section

### Managing Recurring Expenses

1. Navigate to "Recurring" page from Dashboard or Debts page
2. Click "Add Recurring Expense" to create templates
3. Choose frequency (weekly, biweekly, monthly, or custom intervals)
4. Set scheduling options (day of week/month, start/end dates)
5. Click "⚡ Generate Now" to manually create expenses from templates
6. View active and paused templates with edit/delete options

**Quick Create:** Use "Make this recurring" checkbox in Add Expense modal for faster template creation.

## Documentation

- **[Feature Specifications](docs/FEATURES.md)** - Detailed feature documentation
- **[Frontend Requirements](docs/FRONTEND_REQUIREMENTS.md)** - UI/UX design system
- **[Recurring Expenses](docs/RECURRING_EXPENSES.md)** - Automation setup and usage
- **[Scripts](scripts/README.md)** - Maintenance and utility scripts

## Utility Scripts

### Database Maintenance

```powershell
# Run all migrations
python scripts/maintenance.py migrate

# Remove orphaned recurring expenses
python scripts/maintenance.py cleanup-recurring

# Remove duplicate recurring templates
python scripts/maintenance.py remove-duplicates

# Verify database integrity
python scripts/maintenance.py verify-db
```

See [scripts/README.md](scripts/README.md) for full documentation.

## Next Steps

1. ~~Set up development environment~~ ✅
2. ~~Design database schema~~ ✅
3. ~~Build backend API with Flask~~ ✅
4. ~~Build frontend with React~~ ✅
5. ~~Implement core features (expense tracking, budget monitoring)~~ ✅
6. ~~Implement recurring expenses automation~~ ✅
7. Add end-of-period suggestions
8. Add budget categories with spending limits
9. Improve period selector UI (calendar view)
10. Test across devices (Android, iPad, PC)
11. Deploy to production
12. Add budget visualizations and spending trends

# Bloom

> Financial Habits That Grow With You

A flexible web-based budget tracking application accessible from any device (Android, iPad, PC).

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

## Tech Stack Suggestions

- **Frontend**: React (responsive web app)
- **Backend**: Flask (Python) - RESTful API
- **Database**: SQLite (development) / PostgreSQL (production)
- **Styling**: Tailwind CSS or Material-UI
- **Hosting**: Can be deployed to Heroku, Render, or similar platforms

## Project Structure

```text
Bloom/
├── backend/          # Flask API
├── frontend/         # React web app
├── database/         # Schema and migrations
└── tests/           # Unit and integration tests
```

## Next Steps

1. Set up development environment
2. Design database schema (users, budget_periods, expenses, categories, debts)
3. Build backend API with Flask
4. Build frontend with React
5. Implement core features (expense tracking, budget monitoring)
6. Add Phase 1 enhancements (recurring expenses, PWA, undo functionality)
7. Test across devices (Android, iPad, PC)
8. Deploy to production
9. Iterate with Phase 2-4 features based on usage

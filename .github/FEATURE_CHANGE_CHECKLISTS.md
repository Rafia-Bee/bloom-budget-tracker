# Feature Change Checklists

When making changes to specific areas of Bloom, use these checklists to ensure all related code areas are updated consistently.

---

## 📝 Transactions (Expenses/Income)

Any change or addition related to expense or income handling:

### Frontend Components

- [ ] `AddExpenseModal.jsx` / `AddIncomeModal.jsx` - Create new transactions
- [ ] `EditExpenseModal.jsx` / `EditIncomeModal.jsx` - Modify existing transactions
- [ ] `TransactionCard.jsx` - Transaction display component
- [ ] `ExpenseList.jsx` - Transaction list rendering
- [ ] `FilterTransactionsModal.jsx` - Search/filter capabilities

### Pages That Display Transactions

- [ ] `Dashboard.jsx` - Main transaction view, period selector
- [ ] `Reports.jsx` - Transaction summaries and breakdowns
- [ ] `Goals.jsx` - Contributions are income-like transactions
- [ ] `Debts.jsx` - Debt payments are expense-like transactions
- [ ] `RecurringExpenses.jsx` - Templates that generate transactions
- [ ] `Trash.jsx` - Soft-deleted transaction recovery

### Backend Routes

- [ ] `expenses.py` - CRUD operations for expenses
- [ ] `income.py` - CRUD operations for income
- [ ] `recurring_generation.py` - Auto-generated transactions

### Backend Services

- [ ] `balance_service.py` - Balance calculations after transactions
- [ ] `budget_service.py` - Budget impact calculations
- [ ] `cleanup_service.py` - Soft delete handling

### Data Operations

- [ ] `export_import.py` - Financial data export/import
- [ ] `user_data.py` - Delete all user data functionality

### Tests

- [ ] `test_crud.py` - Backend transaction CRUD tests
- [ ] `test_business_logic.py` - Budget/balance impact tests
- [ ] `test_export_import.py` - Data portability tests
- [ ] Frontend component tests in `frontend/src/test/`

---

## 📅 Salary/Budget Periods

Changes to period structure, creation, or management:

### Frontend Components

- [ ] `SalaryPeriodWizard.jsx` - Period creation wizard
- [ ] `PeriodSelector.jsx` - Period navigation
- [ ] `PeriodInfoModal.jsx` - Period details display
- [ ] `DateNavigator.jsx` - Date-based period navigation
- [ ] `SalaryPeriodRolloverPrompt.jsx` - End-of-period prompts
- [ ] `LeftoverBudgetModal.jsx` - Carryover handling
- [ ] `BudgetRecalculationModal.jsx` - Budget adjustment modal
- [ ] `WeeklyBudgetCard.jsx` - Budget status display

### Pages

- [ ] `Dashboard.jsx` - Period selector, transaction filtering by period
- [ ] `Reports.jsx` - Period-based summaries
- [ ] `Settings.jsx` - Period preferences

### Backend Routes

- [ ] `salary_periods.py` - Salary period CRUD
- [ ] `budget_periods.py` - Budget period operations

### Backend Services

- [ ] `budget_service.py` - Weekly budget calculations, carryover logic
- [ ] `balance_service.py` - Period-based balance calculations

### Data Operations

- [ ] `export_import.py` - Period data export/import
- [ ] `user_data.py` - Delete all user data

### Tests

- [ ] `test_budget_periods.py` - Period logic tests
- [ ] `test_budget_service.py` - Budget calculation tests
- [ ] `test_business_logic.py` - Carryover and rollover tests

---

## 🔄 Recurring Transactions

Changes to recurring expense or income templates:

### Frontend Components

- [ ] `AddRecurringExpenseModal.jsx` / `AddRecurringIncomeModal.jsx`
- [ ] `EditExpenseModal.jsx` (when editing linked expense)

### Pages

- [ ] `RecurringExpenses.jsx` - Recurring management page
- [ ] `Dashboard.jsx` - Generated transactions display
- [ ] `Reports.jsx` - Recurring expense summaries

### Backend Routes

- [ ] `recurring_expenses.py` - Recurring expense CRUD
- [ ] `recurring_income.py` - Recurring income CRUD
- [ ] `recurring_generation.py` - Transaction generation logic

### Backend Services

- [ ] `budget_service.py` - Fixed bill calculations in weekly budget

### Models

- [ ] `database.py` - RecurringExpense, RecurringIncome models

### User Settings

- [ ] `User.recurring_lookahead_days` - Lookahead configuration
- [ ] `User.payment_date_adjustment` - Payment date handling

### Data Operations

- [ ] `export_import.py` - Recurring template export/import
- [ ] `user_data.py` - Delete all user data

### Tests

- [ ] `test_recurring_expense_routes.py`
- [ ] `test_business_logic.py` - Generation tests

---

## 💰 Balance Calculations

Changes to how balances (debit/credit) are calculated or displayed:

### Frontend Components

- [ ] `WeeklyBudgetCard.jsx` - Budget remaining display
- [ ] `BalanceModeModal.jsx` - Sync vs Budget mode selection
- [ ] `PeriodInfoModal.jsx` - Balance breakdown display
- [ ] `dashboard/` components - Various balance displays

### Backend Services

- [ ] `balance_service.py` - **PRIMARY** - All balance logic
- [ ] `budget_service.py` - Budget-based calculations

### Backend Routes

- [ ] Any route that returns balance data
- [ ] `salary_periods.py` - Initial balance handling
- [ ] `expenses.py` / `income.py` - Transaction balance impact

### Models

- [ ] `User` - `balance_mode`, initial balance fields
- [ ] `SalaryPeriod` - Period-specific initial balances

### Tests

- [ ] `test_budget_service.py`
- [ ] `test_business_logic.py`

---

## 🎯 Goals

Changes to savings goals functionality:

### Frontend Components

- [ ] `CreateGoalModal.jsx` - Goal creation
- [ ] `EditGoalModal.jsx` - Goal modification

### Pages

- [ ] `Goals.jsx` - Goal management page
- [ ] `Reports.jsx` - Goal progress in reports
- [ ] `Dashboard.jsx` - Goal contributions as transactions

### Backend Routes

- [ ] `goals.py` - Goal CRUD operations

### Data Operations

- [ ] `export_import.py` - Goal data export/import
- [ ] `user_data.py` - Delete all user data

### Tests

- [ ] `test_goals.py`

---

## 💳 Debts

Changes to debt tracking functionality:

### Frontend Components

- [ ] `AddDebtModal.jsx` - Create new debt
- [ ] `EditDebtModal.jsx` - Modify debt
- [ ] `AddDebtPaymentModal.jsx` - Record debt payments

### Pages

- [ ] `Debts.jsx` - Debt management page
- [ ] `Reports.jsx` - Debt summary in reports

### Backend Routes

- [ ] `debts.py` - Debt CRUD operations

### Data Operations

- [ ] `export_import.py` - Debt data export/import
- [ ] `user_data.py` - Delete all user data

### Tests

- [ ] `test_debts.py`

---

## 🏷️ Categories/Subcategories

Changes to expense categorization:

### Frontend Components

- [ ] `AddExpenseModal.jsx` - Category selection
- [ ] `EditExpenseModal.jsx` - Category editing
- [ ] `CreateSubcategoryModal.jsx` - Custom subcategory creation
- [ ] `EditSubcategoryModal.jsx` - Subcategory management
- [ ] `FilterTransactionsModal.jsx` - Filter by category

### Pages

- [ ] `Reports.jsx` - Category breakdown reports
- [ ] `Settings.jsx` - Category management

### Backend Routes

- [ ] `subcategories.py` - Custom subcategory CRUD
- [ ] `expenses.py` - Category validation

### Data Operations

- [ ] `export_import.py` - Category data in exports

### Tests

- [ ] `test_crud.py` - Category validation tests

---

## 💱 Currency

Changes to multi-currency support:

### Frontend Components

- [ ] `CurrencySelector.jsx` - Currency picker component
- [ ] `CurrencySettingsModal.jsx` - Currency preferences
- [ ] All components using `formatCurrency()` utility

### Frontend Context

- [ ] `contexts/CurrencyContext.jsx` - Currency state management

### Backend Routes

- [ ] `currency.py` - Exchange rate operations

### Backend Services

- [ ] `currency_service.py` - Currency conversion logic

### User Settings

- [ ] `User.default_currency` - User's base currency

### Tests

- [ ] `test_currency_routes.py`

---

## 📤 Import/Export

Changes to data portability features:

### Frontend Components

- [ ] `ExportImportModal.jsx` - Export/Import UI
- [ ] `BankImportModal.jsx` - Bank statement import

### Backend Routes

- [ ] `export_import.py` - **PRIMARY** - All export/import logic

### Related Data

When adding new data types, ensure they're included in:

- [ ] Export JSON structure
- [ ] Import validation
- [ ] Import processing
- [ ] Schema documentation

### Tests

- [ ] `test_export_import.py`

---

## 🗑️ Soft Delete / Trash

Changes to deletion and recovery:

### Frontend

- [ ] `Trash.jsx` - Trash management page
- [ ] Delete confirmation in all modals

### Backend

- [ ] `cleanup_service.py` - Soft delete logic
- [ ] `SoftDeleteMixin` in `database.py`
- [ ] Route-specific delete handlers

### Tests

- [ ] `test_cleanup_py` - Soft delete tests

---

## 👤 User Settings

Changes to user preferences or profile:

### Frontend

- [ ] `Settings.jsx` - Settings page
- [ ] Various settings modals

### Backend

- [ ] `auth.py` - Profile updates
- [ ] `User` model fields

### Tests

- [ ] `test_auth.py`

---

## 🔐 Authentication

Changes to login, registration, or security:

### Frontend Components

- [ ] `ForgotPasswordModal.jsx`

### Frontend Pages

- [ ] `Login.jsx`
- [ ] `Register.jsx`
- [ ] `ResetPassword.jsx`

### Backend Routes

- [ ] `auth.py` - Authentication logic
- [ ] `password_reset.py` - Password reset flow

### Backend Services

- [ ] `email_service.py` - Password reset emails

### Backend Utils

- [ ] Rate limiting configuration
- [ ] JWT configuration

### Tests

- [ ] `test_auth.py`
- [ ] `test_password_reset.py`

---

## 📊 Reports

Changes to reporting and analytics:

### Frontend

- [ ] `Reports.jsx` - Main reports page
- [ ] `reports/` components directory

### Backend

- [ ] `analytics.py` - Analytics endpoints

### Related Considerations

- [ ] Ensure all transaction types are included
- [ ] Period-based filtering works correctly
- [ ] Category breakdowns are complete

---

## 🚀 Quick Reference: New Feature Checklist

When adding a **completely new feature**:

1. **Backend Model** - Add to `database.py` with soft delete mixin if applicable
2. **Backend Routes** - Create new route file, register in `api_v1.py`
3. **Backend Tests** - Create `test_<feature>.py`
4. **Frontend API** - Add endpoints to `api.js`
5. **Frontend Components** - Create Add/Edit/Delete modals
6. **Frontend Page** - Create or update relevant page
7. **Export/Import** - Add to `export_import.py`
8. **User Data Delete** - Add to `user_data.py`
9. **Documentation** - Update API.md, ARCHITECTURE.md
10. **E2E Tests** - Add to `frontend/e2e/`

---

## 📋 Cross-Cutting Concerns

Always consider these when making ANY change:

- [ ] **Money as Cents** - All amounts stored/transmitted as integer cents
- [ ] **Soft Delete** - Use soft delete pattern for user data
- [ ] **User Isolation** - All queries filter by `user_id`
- [ ] **Error Handling** - Frontend and backend error states
- [ ] **Loading States** - Frontend loading indicators
- [ ] **Mobile Responsiveness** - Tailwind responsive classes
- [ ] **Accessibility** - ARIA labels, keyboard navigation
- [ ] **Tests** - Backend unit tests, frontend component tests

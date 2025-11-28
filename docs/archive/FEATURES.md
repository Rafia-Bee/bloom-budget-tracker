# Budget Tracker - Detailed Feature Specifications

**App Name:** Bloom
**Tagline:** Financial Habits That Grow With You

## 1. Quick Expense Entry

### Default Values

- **Expense Name**: "Wolt"
- **Category**: "Flexible Expenses"
- **Subcategory**: "Food"
- **Date**: Current date
- **Amount**: Empty (user input required)
- **Payment Method**: Credit Card (checkbox checked)

### User Flow

1. Click "+ Expense" button
2. Modal opens with pre-filled fields
3. User enters amount
4. Press Enter or click Save
5. Entry saved, modal closes

### Override Capability

- All fields editable
- Dropdown for categories
- Auto-suggest for expense names (based on history)
- Date picker available

## 2. Expense Categories & Structure

### Category Hierarchy

#### Fixed Expenses

- Rent
- Bills (utilities, phone, internet)
- Subscriptions (streaming, software)
- Insurance (health, car, home)

#### Debt Payments

- Student loans
- Personal loans
- Credit card debt
- Other debt obligations
- Paid monthly on payday along with bills

#### Sinking Funds

- Travel savings
- Clothing fund
- Emergency fund
- Other planned purchases

#### Flexible Expenses

- Food (groceries, dining out, delivery)
- Shopping (general purchases)
- Cat food & supplies
- Entertainment
- Transportation

#### Investment Accounts

- Funds
- ETFs
- Stocks
- Other investment vehicles

#### Savings

- Monthly transfer to savings account
- Additional savings

## 3. AI Subcategorization

### Expense Name → Subcategory Mapping

| Expense Name | Subcategory | Notes |
|-------------|-------------|-------|
| wolt | Food | Food delivery |
| foodora | Food | Food delivery |
| uber eats | Food | Food delivery |
| netflix | Entertainment | Streaming |
| spotify | Entertainment | Music streaming |
| disney+ | Entertainment | Streaming |
| temu | Shopping | Online retail |
| shein | Shopping | Fashion retail |
| amazon | Shopping | Online retail |
| zooplus | Cat Stuff | Pet supplies |
| H&M | Shopping | Clothing |
| ikea | Shopping | Furniture/Home |
| lidl | Food | Groceries |
| k-market | Food | Groceries |

### Implementation

- Database table: `expense_name_mappings`
- Fields: `expense_name`, `subcategory`, `confidence`, `last_updated`
- Developer manually updates mappings periodically
- Case-insensitive matching
- Partial string matching for flexibility

## 4. Income Types

### Salary

- **Payment Day**: 20th of each month
- **Weekend Adjustment**: If 20th is Saturday/Sunday, pay on previous Friday
- **Amount**: Fixed (user-configurable)
- **Included in**: Total Balance calculation
- **Date Format**: "dd MMM, YYYY" (e.g., "20 Nov, 2025")

### Savings Income

- **Source**: Sum of "Savings" category expenses
- **Calculation**: Automatic, real-time
- **Display**: Separate section in Income view
- **Excluded from**: Total Balance
- **Logic**: Money moved out of available funds

### Investments

- **Source**: Sum of "Investments" category expenses
- **Calculation**: Automatic, real-time
- **Display**: Separate section in Income view
- **Excluded from**: Total Balance
- **Logic**: Money moved out of available funds

## 5. Payment Method Tracking

### Payment Methods

- **Debit Card**: Default bank account
- **Credit Card**: Credit limit €1,500

### Expense Payment Logic

- Each expense has a checkbox: "Paid with Credit Card"
- If checked: deducts from Credit Card balance
- If unchecked: deducts from Debit Card balance

### Credit Card Management

- **Credit Limit**: €1,500
- **Available Credit**: €1,500 - (Sum of credit card expenses)
- **Goal**: Pay off fully each month
- **Display**: Show available credit prominently with usage bar

## 6. Balance Calculations

### Debit Balance Formula

```text
Debit Balance = Salary - (Debit Card Expenses)
Debit Card Expenses = Fixed + Debt Payments + Sinking Funds + Flexible (debit only)
```

### Credit Card Balance Formula

```text
Credit Card Used = Sum(Expenses where payment_method = 'credit')
Credit Card Available = €1,500 - Credit Card Used
```

### Tracking Balance Formula

```text
Savings Balance = Sum(Savings category expenses)
Investment Balance = Sum(Investments category expenses)
```

### Display Structure

```text
Income
├── Salary: €X,XXX
└── Total: €X,XXX

Card Balances
├── Debit Card: €X,XXX
└── Credit Card: €X,XXX available (of €1,500)

Expenses by Category
├── Fixed: €XXX
├── Debt Payments: €XXX
├── Sinking Funds: €XXX
├── Flexible: €XXX
└── Total: €X,XXX

Savings & Investments (Tracked Separately)
├── Savings: €X,XXX
└── Investments: €X,XXX
```

## 7. End-of-Period Suggestions

### Leftover Balance Analysis

At the end of each budget period, the app analyzes remaining balance and suggests actions:

**If Debit Balance > 0:**

1. **Priority 1**: Pay off Credit Card in full (if balance exists)
2. **Priority 2**: Pay down Debt (if exists)
3. **Priority 3**: Add to Savings

**Suggestion Display:**

```text
"You have €XXX remaining this period!

Recommended actions:
✓ Pay Credit Card: €XXX (full balance)
✓ Extra Debt Payment: €XXX
○ Add to Savings: €XXX

Would you like to apply these suggestions?"
```

### User Options

- Accept all suggestions (auto-create transactions)
- Customize amounts manually
- Decline and keep balance in debit
- Partially accept (select which suggestions to apply)

## 8. Database Schema (Preliminary)

### Tables

#### users

- id, email, password_hash, created_at

#### budget_periods

- id, user_id, start_date, end_date, period_type, created_at

#### expenses

- id, user_id, budget_period_id, name, amount, category, subcategory, date, payment_method (debit/credit), created_at

#### income

- id, user_id, budget_period_id, type, amount, scheduled_date, actual_date, created_at

#### expense_name_mappings

- id, expense_name, subcategory, confidence, last_updated

#### user_defaults

- id, user_id, default_expense_name, default_category, default_subcategory, default_payment_method

#### credit_card_settings

- id, user_id, credit_limit, created_at, updated_at

#### period_suggestions

- id, user_id, budget_period_id, suggestion_type, amount, status (pending/accepted/declined), created_at

## 9. Future Features (Pending)

### Phase 1 - Quick Wins

- Recurring expenses automation
- Undo toast notifications
- Expense duplication
- Progressive Web App (PWA)
- Quick dashboard filters

### Phase 2 - UX Enhancements

- Budget period templates
- Expense receipts & notes
- Spending insights widget
- Keyboard shortcuts
- Offline support

### Phase 3 - Advanced Features

- Voice input for expenses
- Data export & import (JSON, CSV)
- Budget sharing (multi-user)
- Streak tracking
- Financial milestones
- Dark mode (pastel theme)
- Multi-currency support

### Phase 4 - Analytics & Long-term

- Spending analytics page with charts
- Budget goals tracking
- Expense tags
- Performance optimizations
- Enhanced security (2FA)
- Push notifications
- Mobile native app (React Native)

# Frontend Test Coverage Summary

> **Last Updated:** December 24, 2025
> **Total Tests:** 312 passing (Frontend) + 45 business logic tests (Backend)
> **Test Framework:** Vitest + React Testing Library (Frontend), pytest (Backend)

## Coverage Analysis

### Overall Coverage

| Metric     | Coverage |
| ---------- | :------: |
| Statements |  11.13%  |
| Branches   |  72.18%  |
| Functions  |  40.77%  |
| Lines      |  11.13%  |

_Note: Low overall coverage due to many untested page components (Dashboard, Goals, Debts, etc.)_

### Component Coverage (Tested Files)

| Component              | Stmts | Branch | Funcs | Lines | Status  |
| ---------------------- | :---: | :----: | :---: | :---: | :-----: |
| TransactionCard.jsx    | 100%  |  100%  | 100%  | 100%  | ✅ Full |
| WeeklyBudgetCard.jsx   | 100%  |  88%   | 100%  | 100%  | ✅ Full |
| ExpenseList.jsx        |  99%  |  95%   | 100%  |  99%  | ✅ Full |
| SalaryPeriodWizard.jsx |  95%  |  90%   |  53%  |  95%  | ✅ Good |
| AddExpenseModal.jsx    |  83%  |  64%   |  63%  |  83%  | ✅ Good |
| ExportImportModal.jsx  |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| EditExpenseModal.jsx   |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| BankImportModal.jsx    |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| AddIncomeModal.jsx     |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| Header.jsx             |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| AddDebtModal.jsx       |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |

---

| [SalaryPeriodWizard.test.jsx](src/test/SalaryPeriodWizard.test.jsx) | 29 | Budget setup wizard | **High** |
| [WeeklyBudgetCard.test.jsx](src/test/WeeklyBudgetCard.test.jsx) | 33 | Budget display card | **High** |
| [ExportImportModal.test.jsx](src/test/ExportImportModal.test.jsx) | 20 | Data export/import | **High** |
| [BankImportModal.test.jsx](src/test/BankImportModal.test.jsx) | 35 | Bank transaction import | **High** |
| [Header.test.jsx](src/test/Header.test.jsx) | 24 | Navigation & user menu | **High** |
| [AddDebtModal.test.jsx](src/test/AddDebtModal.test.jsx) | 33 | Debt creation form | **High** |
| [EditExpenseModal.test.jsx](src/test/EditExpenseModal.test.jsx) | 21 | Edit expense form | Medium |
| [AddIncomeModal.test.jsx](src/test/AddIncomeModal.test.jsx) | 29 | Add income form | Medium |
| [TransactionCard.test.jsx](src/test/TransactionCard.test.jsx) | 32 | Transaction display | Medium |
| [ExpenseList.test.jsx](src/test/ExpenseList.test.jsx) | 22 | Expense list with filtering | Low |

---

## Detailed Coverage

### 🔴 High Priority Components

#### AddDebtModal (33 tests) - NEW

Debt creation form with validation and cents conversion.

**Covered:**

-   ✅ Form rendering with all fields (name, current balance, original amount, monthly payment)
-   ✅ Input validation (name and current balance required)
-   ✅ Optional fields (original amount defaults to current balance, monthly payment defaults to 0)
-   ✅ Cents conversion for all monetary fields
-   ✅ Loading states during submission
-   ✅ Error handling with dismissible messages

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 5 |
| Form Fields | 4 |
| Input Validation | 7 |
| Form Interactions | 4 |
| Modal Close Actions | 2 |
| Form Submission | 8 |
| Error Handling | 3 |

---

#### Header (24 tests) - NEW

Navigation and user menu functionality.

**Covered:**

-   ✅ Desktop navigation links (Dashboard, Goals, Recurring, Debts)
-   ✅ Mobile menu toggle and navigation items
-   ✅ User menu with email display
-   ✅ Theme toggle integration
-   ✅ Import/Export submenu with callbacks
-   ✅ Logout functionality (API + state)
-   ✅ Link href validation

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 5 |
| User Menu | 6 |
| Import/Export Submenu | 4 |
| Logout | 2 |
| Mobile Menu | 2 |
| Navigation Links | 4 |
| User Initial Display | 2 |

---

#### BankImportModal (35 tests) - NEW

Bank transaction import functionality with preview and confirmation.

**Covered:**

-   ✅ Input step: instructions, payment method, fixed bills checkbox
-   ✅ Transaction data textarea with example paste
-   ✅ Preview API call with correct parameters
-   ✅ Preview step: transaction table display
-   ✅ Import confirmation API call
-   ✅ Success message with imported expenses list
-   ✅ Error handling and dismissal
-   ✅ Back to edit navigation
-   ✅ Loading states during preview/import

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering - Input Step | 9 |
| Input Step - Interactions | 7 |
| Preview API Call | 5 |
| Preview Step - Display | 8 |
| Import Confirmation | 5 |
| Error Dismissal | 1 |

---

#### ExportImportModal (20 tests) - NEW

Critical data export/import functionality.

**Covered:**

-   ✅ Export mode: all checkboxes rendered (Debts, Recurring, Salary Periods, Expenses, Income, Goals)
-   ✅ Export format selection (JSON/CSV)
-   ✅ Export type toggling
-   ✅ API integration (POST /data/export)
-   ✅ Error handling (no types selected, API errors)
-   ✅ Loading state during export
-   ✅ Success message display
-   ✅ Import mode rendering
-   ✅ File input with JSON acceptance
-   ✅ Invalid JSON error handling
-   ✅ Dismissible error messages

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Export Mode - Rendering | 5 |
| Export Mode - Interactions | 4 |
| Export Mode - API Integration | 5 |
| Import Mode - Rendering | 3 |
| Import Mode - File Upload | 2 |
| Message/Error Dismissal | 1 |

---

#### SalaryPeriodWizard (29 tests)

Critical business logic for budget setup.

**Covered:**

-   ✅ Multi-step form navigation (3 steps)
-   ✅ Form validation (debit balance required)
-   ✅ Currency parsing (dollars → cents)
-   ✅ Edit mode pre-fill
-   ✅ Rollover mode pre-fill with date calculation
-   ✅ Fixed bills management
-   ✅ Credit debt calculation
-   ✅ API integration (POST/PUT)
-   ✅ Error handling

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Step 1 - Basic Rendering | 5 |
| Step 1 - Form Interactions | 5 |
| Step 1 - Validation | 2 |
| Step 1 - Edit Mode Pre-fill | 1 |
| Step 1 - Rollover Mode | 1 |
| Step 2 - Fixed Bills | 4 |
| Step 3 - Confirmation | 5 |
| Form Submission | 5 |
| Modal Actions | 1 |

---

#### WeeklyBudgetCard (33 tests)

Core budget tracking display.

**Covered:**

-   ✅ Loading skeleton state
-   ✅ No period setup prompt
-   ✅ Error state handling
-   ✅ Budget/Spent/Remaining display
-   ✅ Progress bar with color thresholds (75%, 90%)
-   ✅ Week navigation dropdown
-   ✅ Carryover display (positive/negative)
-   ✅ Adjusted budget display
-   ✅ Allocate leftover button
-   ✅ `forwardRef` + `useImperativeHandle` refresh pattern

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Loading State | 1 |
| No Period State | 4 |
| Error State | 1 |
| Budget Display | 5 |
| Progress Bar | 4 |
| Week Navigation | 5 |
| Carryover Display | 3 |
| Adjusted Budget | 1 |
| Allocate Leftover Button | 4 |
| Settings Button | 1 |
| Ref Methods | 2 |
| Negative Remaining | 1 |

---

### 🟡 Medium Priority Components

#### AddExpenseModal (22 tests)

**Covered:**

-   ✅ Form field rendering
-   ✅ Input interactions
-   ✅ Category/subcategory selection
-   ✅ Payment method selection
-   ✅ Recurring expense toggle
-   ✅ Form submission

---

#### EditExpenseModal (21 tests) - NEW

Edit expense form with pre-filled data.

**Covered:**

-   ✅ Pre-fill name, amount, date, category, payment method from expense
-   ✅ Amount conversion (cents → display format)
-   ✅ Date parsing (display format → input format)
-   ✅ Form field updates
-   ✅ Category and payment method changes
-   ✅ Form submission with cents conversion
-   ✅ Loading state during save
-   ✅ Error handling and display

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 3 |
| Pre-fill Expense Data | 5 |
| Form Interactions | 4 |
| Modal Actions | 2 |
| Form Submission | 3 |
| Error Handling | 2 |
| Category/Payment Options | 2 |

---

#### AddIncomeModal (29 tests) - NEW

Income entry form with type selection.

**Covered:**

-   ✅ Form fields rendering (type, amount, date)
-   ✅ Default values (Salary, today's date)
-   ✅ Income type options (Salary, Bonus, Freelance, Other)
-   ✅ Form interactions and value updates
-   ✅ Modal close actions (Cancel, X button)
-   ✅ Form submission with cents conversion
-   ✅ Loading state during submission
-   ✅ Error handling and dismissal
-   ✅ Amount validation (min, step, required)

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 6 |
| Default Values | 3 |
| Income Type Options | 2 |
| Form Interactions | 4 |
| Modal Close Actions | 2 |
| Form Submission | 6 |
| Error Handling | 3 |
| Amount Validation | 3 |

---

#### TransactionCard (32 tests)

**Covered:**

-   ✅ Expense vs Income display logic
-   ✅ Payment method indicator (pink/mint dots)
-   ✅ Future transaction "Scheduled" badge
-   ✅ Recurring expense "Recurring" badge
-   ✅ Selection mode checkbox
-   ✅ Edit/Delete button callbacks
-   ✅ Amount sign (+/-)
-   ✅ Background color by type

---

### 🟢 Low Priority Components

#### ExpenseList (22 tests)

**Covered:**

-   ✅ Expense rendering with formatting
-   ✅ Payment method filtering (All/Debit/Credit)
-   ✅ Empty state display
-   ✅ Delete functionality
-   ✅ Filter button styling

---

#### Utility Functions (12 tests)

**Covered:**

-   ✅ `formatDate()` - "21 Dec, 2025" format
-   ✅ `formatShortDate()` - "21 Dec" format
-   ✅ `formatDateRange()` - range formatting
-   ✅ Currency formatting (cents → euros)

---

## Running Tests

```bash
# Run all tests
npm test -- --run

# Run specific test file
npm test -- --run SalaryPeriodWizard

# Run tests in watch mode
npm test

# Run with verbose output
npm test -- --run --reporter=verbose
```

---

## Backend Business Logic Tests (NEW)

### Budget Service Unit Tests (37 tests)

Pure function tests for core budget math - no database required.

**File:** `backend/tests/test_budget_service.py`

| Test Class                      | Tests | Description                       |
| ------------------------------- | :---: | --------------------------------- |
| TestCalculateWeeklyBudget       |  10   | Division of budget across weeks   |
| TestCalculateAdjustedBudget     |   5   | Base budget + carryover           |
| TestCalculateRemaining          |   5   | Remaining after spending          |
| TestCalculateCarryover          |   5   | Carryover determination logic     |
| TestCalculateWeeksWithCarryover |   7   | Multi-week carryover accumulation |
| TestWeeksToDict                 |   2   | API response conversion           |
| TestRealWorldScenarios          |   3   | Realistic budget scenarios        |

**Key Math Verified:**

-   ✅ Weekly budget division (integer cents)
-   ✅ Carryover from underspend
-   ✅ Debt carryover from overspend
-   ✅ Cascading debt across weeks
-   ✅ Current/future weeks don't contribute carryover
-   ✅ Typical monthly salary period
-   ✅ Emergency expense scenarios

**Example Test:**

```python
def test_week_with_overspend():
    # Week 1: €100 budget, €50 spent = €50 carryover
    # Week 2: €150 adjusted, €200 spent = -€50 carryover (debt)
    # Week 3: €50 adjusted budget (reduced by debt)
```

---

## Coverage Gaps (Not Yet Tested)

### Pages (0% coverage - High Impact)

-   `Dashboard.jsx` - 1759 lines, main app page
-   `RecurringExpenses.jsx` - 632 lines
-   `Goals.jsx` - 425 lines
-   `Debts.jsx` - 732 lines
-   `Settings.jsx` - 477 lines
-   `Login.jsx` / `Register.jsx` - Auth pages

### Components (0% coverage)

-   `Header.jsx` - 455 lines
-   `EditExpenseModal.jsx` - 309 lines
-   `EditGoalModal.jsx` - 329 lines
-   `BankImportModal.jsx` - 394 lines
-   `ExportModal.jsx` - 355 lines
-   `ManageBudgetModal.jsx` - 348 lines

### Utilities needing tests:

-   `api.js` - API wrapper functions
-   `AuthContext.jsx` - Authentication context

---

## Test Quality Guidelines

1. **Use exact text matchers** when possible to avoid multiple element matches
2. **Mock API calls** are handled globally in `setup.js`
3. **Use `waitFor`** for async state changes
4. **Test user interactions** with `userEvent.setup()`
5. **Test business logic** thresholds (progress colors, validation)

---

## Commit Commands

```powershell
# Add all test files
git add frontend/src/test/*.test.jsx

# Commit with message
git commit -m "test: comprehensive frontend component tests

- SalaryPeriodWizard: 29 tests (multi-step wizard)
- WeeklyBudgetCard: 33 tests (budget display)
- TransactionCard: 32 tests (transaction rendering)
- ExpenseList: 22 tests (filtering)
- AddExpenseModal: 22 tests (form handling)
- Utils: 12 tests (formatters)

Total: 150 frontend tests passing"
```

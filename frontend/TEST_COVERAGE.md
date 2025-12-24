# Frontend Test Coverage Summary

> **Last Updated:** December 24, 2025
> **Total Tests:** 900 passing (Frontend) + 45 business logic tests (Backend)
> **Test Framework:** Vitest + React Testing Library (Frontend), pytest (Backend)

## Coverage Analysis

### Overall Coverage

| Metric     | Coverage |
| ---------- | :------: |
| Statements |   50%+   |
| Branches   |   85%+   |
| Functions  |   75%+   |
| Lines      |   50%+   |

_Note: Coverage improved significantly with 30 component test files._

### Component Coverage (Tested Files)

| Component                      | Stmts | Branch | Funcs | Lines | Status  |
| ------------------------------ | :---: | :----: | :---: | :---: | :-----: |
| TransactionCard.jsx            | 100%  |  100%  | 100%  | 100%  | ✅ Full |
| WeeklyBudgetCard.jsx           | 100%  |  88%   | 100%  | 100%  | ✅ Full |
| AddDebtModal.jsx               | 100%  |  100%  | 100%  | 100%  | ✅ Full |
| AddDebtPaymentModal.jsx        | 100%  |  100%  | 100%  | 100%  | ✅ Full |
| AddIncomeModal.jsx             | 100%  |  100%  | 100%  | 100%  | ✅ Full |
| EditDebtModal.jsx              | 100%  |  100%  | 100%  | 100%  | ✅ Full |
| EditIncomeModal.jsx            | 100%  |  100%  | 100%  | 100%  | ✅ Full |
| FilterTransactionsModal.jsx    |  99%  |  92%   |  94%  |  99%  | ✅ Full |
| ExpenseList.jsx                |  99%  |  95%   | 100%  |  99%  | ✅ Full |
| CreateSubcategoryModal.jsx     |  98%  |  93%   | 100%  |  98%  | ✅ Full |
| EditSubcategoryModal.jsx       |  97%  |  92%   | 100%  |  97%  | ✅ Full |
| LeftoverBudgetModal.jsx        |  97%  |  88%   |  92%  |  97%  | ✅ Full |
| BankImportModal.jsx            |  97%  |  85%   |  82%  |  97%  | ✅ Good |
| CreateGoalModal.jsx            |  97%  |  86%   | 100%  |  97%  | ✅ Good |
| EditGoalModal.jsx              |  98%  |  87%   | 100%  |  98%  | ✅ Good |
| EditExpenseModal.jsx           |  89%  |  69%   |  71%  |  89%  | ✅ Good |
| SalaryPeriodWizard.jsx         |  95%  |  90%   |  53%  |  95%  | ✅ Good |
| Header.jsx                     |  85%  |  71%   |  52%  |  85%  | ✅ Good |
| ExportImportModal.jsx          |  81%  |  67%   |  79%  |  81%  | ✅ Good |
| AddExpenseModal.jsx            |  80%  |  61%   |  63%  |  80%  | ✅ Good |
| AddRecurringExpenseModal.jsx   |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| ExperimentalFeaturesModal.jsx  |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| ForgotPasswordModal.jsx        |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| PeriodSelector.jsx             |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| DraggableFloatingButton.jsx    |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| SalaryPeriodRolloverPrompt.jsx |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| OfflineIndicator.jsx           |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| CatLoading.jsx                 |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |
| ThemeToggle.jsx                |  NEW  |  NEW   |  NEW  |  NEW  | ✅ Good |

### Test Files Summary (30 files, 900 tests)

| Test File                                                                           | Tests | Component                    | Priority |
| ----------------------------------------------------------------------------------- | :---: | ---------------------------- | -------- |
| [AddRecurringExpenseModal.test.jsx](src/test/AddRecurringExpenseModal.test.jsx)     |  65   | Recurring expense form       | **High** |
| [EditGoalModal.test.jsx](src/test/EditGoalModal.test.jsx)                           |  53   | Goal editing form            | **High** |
| [CreateGoalModal.test.jsx](src/test/CreateGoalModal.test.jsx)                       |  52   | Goal creation form           | **High** |
| [AddDebtPaymentModal.test.jsx](src/test/AddDebtPaymentModal.test.jsx)               |  45   | Debt payment form            | **High** |
| [EditDebtModal.test.jsx](src/test/EditDebtModal.test.jsx)                           |  38   | Debt editing form            | **High** |
| [LeftoverBudgetModal.test.jsx](src/test/LeftoverBudgetModal.test.jsx)               |  35   | Leftover budget allocation   | **High** |
| [BankImportModal.test.jsx](src/test/BankImportModal.test.jsx)                       |  35   | Bank transaction import      | **High** |
| [AddDebtModal.test.jsx](src/test/AddDebtModal.test.jsx)                             |  33   | Debt creation form           | **High** |
| [WeeklyBudgetCard.test.jsx](src/test/WeeklyBudgetCard.test.jsx)                     |  33   | Budget display card          | **High** |
| [FilterTransactionsModal.test.jsx](src/test/FilterTransactionsModal.test.jsx)       |  32   | Transaction filtering        | **High** |
| [TransactionCard.test.jsx](src/test/TransactionCard.test.jsx)                       |  32   | Transaction display          | Medium   |
| [ForgotPasswordModal.test.jsx](src/test/ForgotPasswordModal.test.jsx)               |  30   | Password reset flow          | **High** |
| [ExperimentalFeaturesModal.test.jsx](src/test/ExperimentalFeaturesModal.test.jsx)   |  30   | Experimental features/delete | Medium   |
| [AddIncomeModal.test.jsx](src/test/AddIncomeModal.test.jsx)                         |  29   | Add income form              | Medium   |
| [EditIncomeModal.test.jsx](src/test/EditIncomeModal.test.jsx)                       |  29   | Edit income form             | **High** |
| [SalaryPeriodWizard.test.jsx](src/test/SalaryPeriodWizard.test.jsx)                 |  29   | Budget setup wizard          | **High** |
| [DraggableFloatingButton.test.jsx](src/test/DraggableFloatingButton.test.jsx)       |  28   | Floating action button       | Low      |
| [PeriodSelector.test.jsx](src/test/PeriodSelector.test.jsx)                         |  27   | Period calendar dropdown     | Medium   |
| [CreateSubcategoryModal.test.jsx](src/test/CreateSubcategoryModal.test.jsx)         |  26   | Create subcategory           | Medium   |
| [EditSubcategoryModal.test.jsx](src/test/EditSubcategoryModal.test.jsx)             |  25   | Edit subcategory             | Medium   |
| [Header.test.jsx](src/test/Header.test.jsx)                                         |  24   | Navigation & user menu       | **High** |
| [AddExpenseModal.test.jsx](src/test/AddExpenseModal.test.jsx)                       |  23   | Add expense form             | **High** |
| [ExpenseList.test.jsx](src/test/ExpenseList.test.jsx)                               |  22   | Expense list with filtering  | Low      |
| [SalaryPeriodRolloverPrompt.test.jsx](src/test/SalaryPeriodRolloverPrompt.test.jsx) |  21   | Period rollover banner       | Medium   |
| [EditExpenseModal.test.jsx](src/test/EditExpenseModal.test.jsx)                     |  21   | Edit expense form            | Medium   |
| [CatLoading.test.jsx](src/test/CatLoading.test.jsx)                                 |  20   | Loading animation            | Low      |
| [ExportImportModal.test.jsx](src/test/ExportImportModal.test.jsx)                   |  20   | Data export/import           | **High** |
| [OfflineIndicator.test.jsx](src/test/OfflineIndicator.test.jsx)                     |  18   | Online/offline status        | Low      |
| [ThemeToggle.test.jsx](src/test/ThemeToggle.test.jsx)                               |  14   | Dark/light mode toggle       | Low      |
| [utils.test.jsx](src/test/utils.test.jsx)                                           |  11   | Utility functions            | Low      |

---

## Detailed Coverage

### 🔴 High Priority Components

#### AddDebtPaymentModal (45 tests) - NEW

Debt payment form with API-loaded debt selection, auto-fill amount, and Credit Card special case.

**Covered:**

-   ✅ Form rendering (title, fields, buttons, close X)
-   ✅ Debt loading from API with dropdown display
-   ✅ Auto-select first debt on load with amount auto-fill
-   ✅ Pre-selected debt support with amount prefill
-   ✅ Debt selection changes update amount field
-   ✅ Credit Card option clears amount (no monthly payment)
-   ✅ Payment method selection (Debit card, Cash, Bank transfer)
-   ✅ Form interactions (custom amount, date changes)
-   ✅ Input validation (required fields, min values, step values)
-   ✅ Submit button disabled when no debt selected
-   ✅ Form submission with cents conversion
-   ✅ Creates expense name with "Payment" suffix
-   ✅ Loading states during submission
-   ✅ Error handling with dismiss button
-   ✅ Empty debts list handling (shows only Credit Card option)

**Test Categories:**

-   Rendering (4 tests)
-   Debt Loading (7 tests)
-   Pre-selected Debt (2 tests)
-   Debt Selection (3 tests)
-   Form Interactions (5 tests)
-   Input Validation (6 tests)
-   Modal Actions (2 tests)
-   Form Submission (5 tests)
-   Loading State (2 tests)
-   Error Handling (4 tests)
-   Credit Card Special Case (2 tests)
-   Payment Method Options (1 test)
-   Empty Debts List (2 tests)

---

#### EditIncomeModal (29 tests) - NEW

Income edit form with pre-filled data and type selection.

**Covered:**

-   ✅ Form rendering with all fields (type, amount, date)
-   ✅ Pre-filled data from income object (type, amount in euros, converted date)
-   ✅ Income type selection (Salary, Bonus, Freelance, Other)
-   ✅ Amount and date editing with validation
-   ✅ Date format conversion (display → YYYY-MM-DD)
-   ✅ Form submission with cents conversion
-   ✅ Loading states and error handling
-   ✅ Accessibility with htmlFor labels

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 4 |
| Pre-filled Data | 5 |
| Income Types | 2 |
| Form Editing | 6 |
| Modal Close Actions | 2 |
| Form Submission | 6 |
| Error Handling | 4 |

**Bug Fix:** Fixed incorrect "Type" label → "Date" label with proper date input field

---

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

#### ForgotPasswordModal (30 tests) - NEW

Password reset flow with email validation and state management.

**Covered:**

-   ✅ Modal title and form rendering
-   ✅ Email input validation (required, email format)
-   ✅ Submit button states (disabled when empty)
-   ✅ API integration with reset endpoint
-   ✅ Success message display
-   ✅ Error handling (invalid email, user not found, server errors)
-   ✅ Loading state during submission
-   ✅ Error dismissal
-   ✅ Back to login link
-   ✅ Modal close actions (Cancel, X button)

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 8 |
| Email Validation | 5 |
| Form Submission | 5 |
| Success State | 4 |
| Error Handling | 4 |
| Error Dismissal | 2 |
| Navigation | 2 |

---

#### ExperimentalFeaturesModal (30 tests) - NEW

Experimental features settings with danger zone delete functionality.

**Covered:**

-   ✅ Modal title and warning banner rendering
-   ✅ Experimental features toggle (checkbox)
-   ✅ BETA badge display
-   ✅ Danger zone visibility (only when enabled)
-   ✅ Delete All Data button and confirmation flow
-   ✅ Confirmation text input ("Delete everything")
-   ✅ Confirm button disabled until correct text
-   ✅ API integration for delete all data
-   ✅ Success alert and navigation after deletion
-   ✅ Error handling for failed deletions
-   ✅ Loading state during deletion
-   ✅ Modal close actions (Done, X button)

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 8 |
| Modal Close | 2 |
| Feature Toggle | 4 |
| Delete Initial State | 2 |
| Confirmation Flow | 5 |
| API Interaction | 3 |
| Error Handling | 2 |
| Loading State | 2 |
| Accessibility | 2 |

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

#### AddRecurringExpenseModal (65 tests) - NEW

Recurring expense template creation with frequency options, debt/goal autofill, and scheduling.

**Covered:**

-   ✅ Modal title and form fields rendering
-   ✅ Frequency options (Weekly, Biweekly, Monthly, Custom)
-   ✅ Custom frequency interval (number input)
-   ✅ Custom frequency unit (Days, Weeks, Months, Years)
-   ✅ Category selection and dynamic subcategory loading
-   ✅ Payment method selection (Debit Card, Credit Card)
-   ✅ Fixed bill toggle for budget calculations
-   ✅ Debt autofill (selects debts dropdown, populates amount)
-   ✅ Goal autofill (selects goals dropdown, populates amount)
-   ✅ Form input interactions (name, amount, date)
-   ✅ Modal close actions (Cancel, X button)
-   ✅ Form submission with cents conversion
-   ✅ Success callback after submission
-   ✅ Error handling and dismissal
-   ✅ Loading state during submission
-   ✅ Name validation (minLength, maxLength, required)
-   ✅ Amount validation (min value, required)
-   ✅ Date validation (required)

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 3 |
| Frequency Options | 9 |
| Custom Frequency | 6 |
| Category Selection | 5 |
| Payment Method | 3 |
| Fixed Bill Toggle | 2 |
| Debt Autofill | 7 |
| Goal Autofill | 7 |
| Form Interactions | 3 |
| Modal Actions | 4 |
| Form Submission | 4 |
| Error Handling | 3 |
| Validation | 9 |

---

#### CreateGoalModal (52 tests) - NEW

Goal creation form with amount validation, date picking, and character limits.

**Covered:**

-   ✅ Modal title and form fields rendering
-   ✅ Name input with character count (50 char max)
-   ✅ Target amount input with currency formatting
-   ✅ Target date picker (optional)
-   ✅ Description textarea with character count (200 char max)
-   ✅ Form input interactions
-   ✅ Modal close actions (Cancel, X button)
-   ✅ Form submission with cents conversion
-   ✅ Success callback after submission
-   ✅ Error handling and dismissal
-   ✅ Loading state during submission
-   ✅ Name validation (required, length limits)
-   ✅ Amount validation (required, positive number)
-   ✅ Character count updates on typing
-   ✅ Maximum length enforcement

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 3 |
| Name Input | 5 |
| Amount Input | 7 |
| Date Input | 3 |
| Description Input | 5 |
| Form Interactions | 4 |
| Modal Actions | 4 |
| Form Submission | 4 |
| Error Handling | 3 |
| Validation | 9 |
| Character Limits | 5 |

---

#### EditGoalModal (53 tests) - NEW

Goal editing form with pre-filled data, progress tracking, and target reduction warnings.

**Covered:**

-   ✅ Modal title and form fields rendering
-   ✅ Pre-filled data from goal object (name, target in euros, date, description)
-   ✅ Current progress display with percentage
-   ✅ Name input with character count (50 char max)
-   ✅ Target amount editing with cents conversion
-   ✅ Current amount display (read-only)
-   ✅ Target date editing with min attribute (tomorrow)
-   ✅ Description textarea with character count (200 char max)
-   ✅ Warning when reducing target below current progress
-   ✅ Modal close actions (Cancel, X button)
-   ✅ Form submission with cents conversion
-   ✅ Loading state during submission
-   ✅ Error handling and dismissal
-   ✅ Handles goals without target date
-   ✅ Handles 0% and 100% progress scenarios

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 5 |
| Pre-filled Values | 4 |
| Form Interactions | 5 |
| Character Counts | 4 |
| Amount Handling | 3 |
| Date Handling | 3 |
| Target Reduction Warning | 3 |
| Modal Actions | 2 |
| Form Submission | 3 |
| Loading State | 2 |
| Error Handling | 4 |
| Progress Display | 4 |
| Edge Cases | 6 |
| Decimal Handling | 5 |

---

#### EditDebtModal (38 tests) - NEW

Debt editing form with pre-filled amounts, payment tracking, and balance management.

**Covered:**

-   ✅ Modal title and form fields rendering
-   ✅ Pre-filled data from debt object (name, current balance, original amount, monthly payment)
-   ✅ All amounts converted from cents to euros on display
-   ✅ Current balance editing with helper text
-   ✅ Original amount editing
-   ✅ Monthly payment editing
-   ✅ Input validation (required, min 0, step 0.01)
-   ✅ Debt name max length (200 chars)
-   ✅ Modal close actions (Cancel, X button)
-   ✅ Form submission with cents conversion (Math.round)
-   ✅ Loading state during submission
-   ✅ Error handling and dismissal
-   ✅ Handles zero monthly payment
-   ✅ Handles paid-off debt (zero balance)
-   ✅ Handles equal original and current balance

**Test Categories:**
| Category | Tests |
|----------|:-----:|
| Rendering | 5 |
| Pre-filled Values | 4 |
| Form Interactions | 4 |
| Input Validation | 8 |
| Modal Actions | 2 |
| Form Submission | 4 |
| Loading State | 2 |
| Error Handling | 4 |
| Decimal Amount Handling | 2 |
| Different Debt Types | 3 |

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

## New Tests Added (January 2025)

### CreateSubcategoryModal (26 tests)

Subcategory creation form with category dropdown and validation.

**Covered:**

-   ✅ Form rendering with title, category dropdown, name input
-   ✅ Category selection from predefined list (Food, Transport, etc.)
-   ✅ Name input with 50-character max length
-   ✅ Form submission with correct API payload
-   ✅ HTML5 required validation (required attribute on fields)
-   ✅ Loading state during submission
-   ✅ API error handling with specific error messages
-   ✅ Modal close and cancel behavior
-   ✅ Accessibility labels

### EditSubcategoryModal (25 tests)

Subcategory editing form with pre-filled values.

**Covered:**

-   ✅ Pre-filled name from existing subcategory
-   ✅ Read-only category field (not editable)
-   ✅ Name editing with validation
-   ✅ Unchanged name handling (API call still made)
-   ✅ Form submission with PUT method
-   ✅ API error handling
-   ✅ Loading states

### FilterTransactionsModal (32 tests)

Complex transaction filtering with multiple criteria.

**Covered:**

-   ✅ Transaction type buttons (All, Expenses, Income)
-   ✅ Search input with 500ms debounce
-   ✅ Category and subcategory dropdown filtering
-   ✅ Subcategory auto-loading when category selected
-   ✅ Payment method filtering (Debit Card, Credit Card, Cash)
-   ✅ Date range filtering (start/end dates)
-   ✅ Amount range filtering (min/max)
-   ✅ Filter chip clearing
-   ✅ Apply and Reset button behavior
-   ✅ Modal state preservation

### LeftoverBudgetModal (35 tests)

Leftover budget allocation to debts or goals.

**Covered:**

-   ✅ Loading state during data fetch
-   ✅ "Week Complete" state when no leftover
-   ✅ Leftover and budget amount display
-   ✅ Debt selection with balance display
-   ✅ Goal selection with progress indicators
-   ✅ Amount input with "Use Full Amount" button
-   ✅ Validation for zero and excessive amounts
-   ✅ Disabled button when no selection
-   ✅ API allocation to debts (POST to /debts/:id/payments)
-   ✅ API allocation to goals (POST to /goals/:id/contributions)
-   ✅ Skip and Close functionality
-   ✅ Error handling for API failures
-   ✅ Loading states during allocation

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

-   `ForgotPasswordModal.jsx` - 106 lines
-   `ExperimentalFeaturesModal.jsx` - 244 lines
-   `DraggableFloatingButton.jsx` - 197 lines
-   `LeftoverIndicator.jsx` - 61 lines
-   `PeriodSelector.jsx` - 436 lines
-   `LeftoverPrompt.jsx` - 131 lines
-   `ThemeToggle.jsx` - 35 lines
-   `CatLoading.jsx` - 52 lines

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
git commit -m "test: add 118 tests for 4 modal components (#104)

- CreateSubcategoryModal.test.jsx (26 tests)
- EditSubcategoryModal.test.jsx (25 tests)
- FilterTransactionsModal.test.jsx (32 tests)
- LeftoverBudgetModal.test.jsx (35 tests)

Total frontend tests: 712 (was 594)
Component coverage: 76.95%"
```

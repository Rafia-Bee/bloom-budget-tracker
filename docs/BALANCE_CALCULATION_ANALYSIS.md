# Balance Calculation System - Technical Reference

**Date:** January 5, 2026
**Last Updated:** January 7, 2026
**Issue:** #149 - Initial balances don't accumulate across multiple salary periods
**Status:** In Progress (Phase 3)

---

## Executive Summary

The balance calculation system supports two distinct use cases through a "Balance Mode" toggle:

1. **Sync with Bank** (`sync`) - App mirrors your real bank balance (cumulative)
2. **Budget Tracker** (`budget`) - Pure budgeting tool (isolated periods)

---

## Core Concept: The Anchor Balance

When a user creates their **FIRST ever salary period**, that period's `initial_debit_balance` becomes the **anchor balance**. This is stored in `User.user_initial_debit_balance`.

All subsequent balance calculations are based on this anchor:

```
Current Balance = Anchor Balance + All Income - All Expenses
```

**IMPORTANT:** The anchor is set ONCE and never changes, even when creating past or future periods.

---

## Balance Mode Definitions

| Mode               | Value    | Description                        | Balance Behavior                     |
| ------------------ | -------- | ---------------------------------- | ------------------------------------ |
| **Sync with Bank** | `sync`   | App mirrors your real bank balance | Balances **CUMULATE** across periods |
| **Budget Tracker** | `budget` | Pure budgeting tool                | Each period is **ISOLATED**          |

---

## Sync with Bank Mode (Default)

In this mode, the app's balance should always match the user's real bank balance.

### Core Principle

-   Your app balance = your real bank balance
-   All income and expenses across ALL periods contribute to ONE cumulative balance
-   User is responsible for ensuring all transactions are recorded to "balance the books"

### Calculation Formula

```
Current Balance = User.user_initial_debit_balance
                + SUM(all income since balance_start_date)
                - SUM(all debit expenses since balance_start_date)
                + SUM(past periods' initial_debit_balance as "past income")
```

### Creating a Past Period (Detailed Scenario)

**Scenario Setup:**

1. User creates their FIRST period (Jan 6 - Feb 5) with €1000 debit balance

    - This becomes the **anchor balance**: `User.user_initial_debit_balance = 100000` (cents)
    - `User.balance_start_date = 2026-01-06`

2. User later creates a PAST period (Dec 6 - Jan 5) with €100 debit balance
    - This is BEFORE the anchor date

**What happens in Sync Mode:**

The past period's €100 balance is treated as **"past income"** - money that existed before the anchor date. This gets ADDED to the cumulative balance.

-   **Expected Current Period Balance:** €1000 + €100 = €1100
-   **Expected Past Period Balance:** €100 (its own starting balance)

**Why this makes sense:**

-   The €100 represents historical money that the user had before their first tracked period
-   By adding it as income, the app knows this money existed
-   User must now add past expenses from Dec 6 - Jan 5 to "balance the books"
-   Once past expenses are added, the balance will match the bank again

**Example with past expenses added:**

1. User adds €50 of past expenses in the Dec period
2. Current balance becomes: €1100 - €50 = €1050
3. If user's bank shows €1050, the books are balanced!
4. If bank shows €1000, user is missing €50 of past expenses

### Why We Don't Use Only User.user_initial_debit_balance

The naive approach would be:

```
Balance = User.user_initial_debit_balance + income - expenses
```

But this fails when user creates past periods because:

-   The anchor was set on Jan 6 with €1000
-   Past period's €100 would be invisible
-   No way to track historical transactions

### Creating a Future Period

When user creates a future period in Sync mode:

-   The future period's `initial_debit_balance` represents expected future income
-   Show informational modal: "This balance will be added when the period starts"
-   User should add any expected income/expenses to match their expectations
-   App can prompt: "Do you plan to receive income or pay debts before this period?"

---

## Budget Tracker Mode

In this mode, each salary period is completely independent.

### Core Principle

-   Each period has its own isolated budget
-   Period 1 balance has NO effect on Period 2 balance
-   Useful for pure budgeting without bank synchronization

### Calculation Formula

```
Period Balance = Period.initial_debit_balance
               + SUM(income within period dates)
               - SUM(expenses within period dates)
```

### Creating a Past Period

In Budget mode, past periods are simply isolated budgets. No special handling needed.

-   Past period: Shows its own €100 balance
-   Current period: Shows its own €1000 balance
-   No interaction between them

---

## User Model Fields

```python
class User(db.Model):
    # Balance tracking (set when first period created)
    balance_start_date = db.Column(db.Date, nullable=True)
    user_initial_debit_balance = db.Column(db.Integer, default=0)  # cents
    user_initial_credit_limit = db.Column(db.Integer, default=0)   # cents
    user_initial_credit_debt = db.Column(db.Integer, default=0)    # cents

    # Balance mode
    balance_mode = db.Column(db.String(20), default="sync")  # "sync" or "budget"
```

---

## UI Touchpoints for Balance Mode

1. **New User Onboarding** - Ask which mode during first salary period creation
2. **User Menu Submenu** - "Balance Settings" option (clearly visible)
3. **Salary Period Wizard** - Toggle switch at bottom of Step 1
4. **Settings Page** - Under a new "Balance" section

---

## Phase 5: Informational Modal (NOT Recalculation)

The modal for past/future periods is **informational only**. It doesn't change any calculations - it just explains what will happen based on the user's current mode.

### Implementation (Jan 2026)

**Files Created:**

-   `frontend/src/components/PeriodInfoModal.jsx` - Reusable modal component

**Integration:**

-   `SalaryPeriodWizard.jsx` - Added past period detection, shows modal before creation
-   Detection: `startDate < balance_start_date` = past period
-   Modal shows: Current mode effects, option to switch modes
-   "Change to X Mode" shows explanation before switching, then continues

**Notes:**

-   Future periods in Sync mode already have `showFutureIncomePrompt` (separate flow)
-   Past periods now use `PeriodInfoModal` for both modes
-   Mode change affects ALL periods (global user setting)

### Past Period Modal - Sync Mode

```
┌─────────────────────────────────────────┐
│  ℹ️  Adding Past Period                 │
├─────────────────────────────────────────┤
│  You have Sync with Bank mode selected. │
│                                         │
│  This period's €100 balance will be     │
│  added to your cumulative total.        │
│                                         │
│  Add expenses in this past period to    │
│  balance the books with your real bank. │
│                                         │
│  [Continue]  [Change to Budget Tracker] │
└─────────────────────────────────────────┘
```

### Past Period Modal - Budget Mode

```
┌─────────────────────────────────────────┐
│  ℹ️  Adding Past Period                 │
├─────────────────────────────────────────┤
│  You have Budget Tracker mode selected. │
│                                         │
│  This period will have its own isolated │
│  €100 budget, separate from your other  │
│  periods.                               │
│                                         │
│  [Continue]  [Change to Sync with Bank] │
└─────────────────────────────────────────┘
```

### Future Period Modal - Sync Mode

```
┌─────────────────────────────────────────┐
│  ℹ️  Adding Future Period               │
├─────────────────────────────────────────┤
│  You have Sync with Bank mode selected. │
│                                         │
│  Before this period starts, your books  │
│  should be balanced. Add any expected:  │
│  • Income (salary, etc.)                │
│  • Credit card debt payments            │
│  • Other transactions                   │
│                                         │
│  [Continue]  [Change to Budget Tracker] │
└─────────────────────────────────────────┘
```

---

## Credit Card Handling

**Decision:** Credit card debt is **GLOBAL** regardless of mode.

-   Credit debt always interacts with the Debts page
-   In Sync mode: Credit payments affect cumulative balance
-   In Budget mode: Credit debt is still global (not per-period)

### Edge Cases

1. **Past period with more debt than current:**

    - Inform user they currently have €0 credit available
    - Prompt: "Did you pay back some of this debt? Add debt payments to track correctly."

2. **Future period with less debt than current:**
    - Prompt: "Your future credit debt is less than current. Do you plan to pay back? When?"

---

## Implementation Phases

| Phase     | Description              | Time       | Status      |
| --------- | ------------------------ | ---------- | ----------- |
| Phase 1   | Database schema update   | 1 hour     | ✅ Complete |
| Phase 2   | Data migration script    | 1 hour     | ✅ Complete |
| Phase 3   | Balance service refactor | 2 hours    | ✅ Complete |
| Phase 4   | Balance Mode UI          | 2 hours    | ✅ Complete |
| Phase 5   | Informational modal      | 1.5 hours  | ✅ Complete |
| Phase 6   | Cleanup + feature flag   | 1 hour     | 🔄 Pending  |
| **Total** |                          | ~8.5 hours |             |

---

## Success Criteria

-   [x] Phase 1-2: User fields populated, old code still works
-   [x] Phase 3: Balance calculation respects mode correctly
-   [x] Phase 4: Users can toggle mode in 4 places
-   [x] Phase 5: Past/future period creation shows info modal
-   [ ] Phase 6: Feature flag controls rollout
-   [ ] No "Initial Balance" entries in income list
-   [ ] All tests pass

---

## Testing Checklist

### Prerequisites

-   Balance Mode Selection feature flag enabled
-   New user OR existing user with all data deleted
-   Note the current date for period date reference

### Budget Mode Test

**Setup:**

1. Delete all data (Settings → Delete All Data)
2. Ensure "Budget Tracker" mode is selected

**Steps:**

1. Create current period (e.g., Jan 6 - Feb 5, 2026) with €1000 debit
2. Create past period (e.g., Dec 6 - Jan 5, 2026) with €100 debit
3. Navigate between periods

**Expected Results:**
| View | Debit Available | All-Time Income |
|------|-----------------|-----------------|
| Current period | €1000 | €1000 |
| Past period | €100 | €1000 |

**Notes:**

-   Each period is isolated
-   All-Time Income shows anchor only (no accumulation)

### Sync Mode Test

**Setup:**

1. Delete all data (Settings → Delete All Data)
2. Select "Sync with Bank" mode

**Steps:**

1. Create current period (e.g., Jan 6 - Feb 5, 2026) with €1000 debit
    - This becomes the **anchor balance**
2. Create past period (e.g., Dec 30 - Jan 5, 2026) with €100 debit
    - This is treated as "past income"
3. Navigate between periods

**Expected Results:**
| View | Debit Available | All-Time Income |
|------|-----------------|-----------------|
| Current period | €1100 (€1000 + €100) | €1100 |
| Past period | €100 (isolated) | €1100 |

**Additional Test - Adding Past Expenses:**

1. While viewing past period, add €50 expense
2. Navigate back to current period

**Expected:**
| View | Debit Available | All-Time Income |
|------|-----------------|-----------------|
| Current period | €1050 (€1100 - €50) | €1100 |
| Past period | €50 (€100 - €50) | €1100 |

**Notes:**

-   Past period's €100 is added to cumulative total
-   Adding expenses to past period affects current balance
-   User is "balancing the books" by adding historical transactions

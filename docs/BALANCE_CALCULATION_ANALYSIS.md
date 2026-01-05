# Balance Calculation System - Refactoring Plan

**Date:** January 5, 2026
**Issue:** #149 - Initial balances don't accumulate across multiple salary periods
**Status:** Approved for implementation (phased approach)

---

## Executive Summary

The current balance calculation system has two problems:

1. **Technical:** Uses fragile implicit marker records (Income/Expense) that can be deleted
2. **Conceptual:** Conflates two use cases - financial tracking vs budget planning

**Approved Solution:**

-   Move balance tracking to explicit `User` model fields
-   Add a global **Balance Mode** toggle: "Sync with Bank" vs "Budget Tracker"
-   Implement Balance Recalculation Modal for edge cases (past/future periods)
-   Start as experimental feature

---

## Two Use Cases, One App

| Use Case           | Description                      | Balance Behavior       |
| ------------------ | -------------------------------- | ---------------------- |
| **Sync with Bank** | Real-life financial tracking     | Balances are snapshots |
| **Budget Tracker** | Pure budgeting without bank sync | Balances accumulate    |

### Example: Creating a Past Period

**Scenario:**

-   Current period (Jan): €1000 debit balance
-   Past period (Dec): €2000 debit balance, €500 expenses

**Sync with Bank mode:**

-   Balance = €1000 (current snapshot is truth)
-   Past period only tracks expenses within it

**Budget Tracker mode:**

-   Balance = €1000 + €2000 - €500 = €2500
-   All periods contribute to cumulative balance

---

## New User Fields

```python
class User(db.Model):
    # Balance tracking
    balance_start_date = db.Column(db.Date, nullable=True)
    initial_debit_balance = db.Column(db.Integer, default=0)
    initial_credit_limit = db.Column(db.Integer, default=0)
    initial_credit_debt = db.Column(db.Integer, default=0)

    # Balance mode (NEW)
    balance_mode = db.Column(db.String(20), default="sync")  # "sync" or "cumulative"
```

---

## UI Touchpoints for Balance Mode

1. **New User Onboarding** - Ask which mode during first salary period creation
2. **User Menu Submenu** - "Balance Settings" option (clearly visible)
3. **Salary Period Wizard** - Toggle switch at bottom of Step 1
4. **Settings Page** - Under a new "Balance" section

---

## Balance Recalculation Modal

When user creates a **PAST period** (start_date < balance_start_date), show:

```
┌─────────────────────────────────────────┐
│  ⚠️  Balance Update Required            │
├─────────────────────────────────────────┤
│  You're creating a period that starts   │
│  before your tracked balance history.   │
│                                         │
│  Current mode: Sync with Bank           │
│                                         │
│  How should we handle €2000?            │
│                                         │
│  [Update Start Point]                   │
│  Your tracked history will start from   │
│  this period (Dec 2, 2025).             │
│                                         │
│  [Add to Balance]                       │
│  Add €2000 to your cumulative balance.  │
│  (Changes mode to Budget Tracker)       │
│                                         │
│  [Keep Current]                         │
│  Ignore this period's balance. Only     │
│  track expenses within it.              │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Schema Update (~1 hour) - Today

**Tasks:**

1. Add User columns: `balance_start_date`, `initial_debit_balance`, `initial_credit_limit`, `initial_credit_debt`, `balance_mode`
2. Update User model in `database.py`
3. Run migration

**Files:** `backend/models/database.py`, new migration file

---

### Phase 2: Data Migration Script (~1 hour) - Today

**Tasks:**

1. Migrate existing Income/Expense markers to User fields
2. Set default `balance_mode = "sync"` for all users
3. Create SQL for production (Neon)

**Files:** `scripts/migrate_balance_to_user.py`, `docs/migrations/`

---

### Phase 3: Balance Service Refactor (~2 hours) - Tomorrow

**Tasks:**

1. Modify `_calculate_debit_balance()` to check `user.balance_mode`:
    - "sync" → Use first period's balance only
    - "cumulative" → Sum all period initial balances
2. Same for `_calculate_credit_available()`
3. Update salary period creation to use User fields

**Files:** `backend/services/balance_service.py`, `backend/routes/salary_periods.py`

---

### Phase 4: Balance Mode UI (~2 hours) - Tomorrow

**Tasks:**

1. Create `BalanceModeModal.jsx` - Onboarding + Settings access
2. Add toggle to `SalaryPeriodWizard.jsx` Step 1
3. Add "Balance Settings" to user menu dropdown
4. Add section in Settings.jsx

**Files:** New modal, `SalaryPeriodWizard.jsx`, `Header.jsx`, `Settings.jsx`

---

### Phase 5: Balance Recalculation Modal (~1.5 hours) - Day 3

**Tasks:**

1. Create `BalanceRecalculationModal.jsx`
2. Trigger when creating past periods
3. Handle mode switching with migration logic

**Files:** New modal, `salary_periods.py` endpoint updates

---

### Phase 6: Cleanup & Feature Flag (~1 hour) - Day 3

**Tasks:**

1. Add `balanceModeEnabled` feature flag
2. Delete legacy marker records
3. Remove dead code
4. Update documentation

**Files:** `FeatureFlagContext.jsx`, migration scripts, docs

---

## Total Estimated Effort

| Phase     | Description         | Time           | Day      |
| --------- | ------------------- | -------------- | -------- |
| Phase 1   | Schema update       | 1 hour         | Today    |
| Phase 2   | Data migration      | 1 hour         | Today    |
| Phase 3   | Balance service     | 2 hours        | Tomorrow |
| Phase 4   | Balance mode UI     | 2 hours        | Tomorrow |
| Phase 5   | Recalculation modal | 1.5 hours      | Day 3    |
| Phase 6   | Cleanup + flag      | 1 hour         | Day 3    |
| **Total** |                     | **~8.5 hours** |          |

---

## Success Criteria

-   [ ] Phase 1-2: User fields populated, old code still works
-   [ ] Phase 3: Balance calculation respects mode
-   [ ] Phase 4: Users can toggle mode in 4 places
-   [ ] Phase 5: Past period creation prompts for action
-   [ ] Phase 6: Feature flag controls rollout
-   [ ] No "Initial Balance" entries in income list
-   [ ] All tests pass
-   [ ] Production migration successful

---

## Risk Mitigation

### Production Data Safety

1. Take full database backup before any migration
2. Run migration on staging/test data first
3. Keep old Income/Expense records until Phase 6 confirmed working
4. Provide rollback SQL script

### Backward Compatibility

-   Phases 1-2 don't change any behavior (additive only)
-   Phase 3 is the cutover - test thoroughly
-   Phase 4-6 are UI/cleanup after core logic verified

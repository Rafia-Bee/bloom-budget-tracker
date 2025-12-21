# Simplify Recurring Expense Generation - User-Configurable Lookahead

## Summary

The current 60-day lookahead for recurring expense generation is hardcoded and inflexible. Make the lookahead period user-configurable or redesign the approach entirely for a simpler, more intuitive experience.

## Current Behavior

**Hardcoded 60-day lookahead:**

-   Every generation creates expenses up to 60 days in the future
-   Called in multiple places with the same value:
    -   `AddExpenseModal.jsx`: `generateNow(false, 60)`
    -   `RecurringExpenses.jsx`: `generateNow(false, 90)` (one place uses 90!)
    -   GitHub Actions workflow: `days_ahead=60`
    -   Default in API: `days_ahead=60`

**Problems:**

1. **Too far ahead**: 60 days feels excessive - users don't typically plan 2 months ahead
2. **Inconsistent**: Frontend uses 60 in some places, 90 in others
3. **Not configurable**: Users can't adjust based on their planning horizon
4. **Clutters view**: Future transactions show up in current period views
5. **Over-engineering**: The complexity doesn't match typical user needs

## Proposed Solutions

### Option 1: User-Configurable Lookahead (Simple)

Add a user setting for lookahead period with sensible defaults:

**Settings Page Addition:**

```
Recurring Expense Settings
┌─────────────────────────────────────┐
│ Generate expenses ahead:            │
│ ○ 7 days (1 week)                  │
│ ● 14 days (2 weeks) [DEFAULT]      │
│ ○ 30 days (1 month)                │
│ ○ 60 days (2 months)               │
│ ○ 90 days (3 months)               │
└─────────────────────────────────────┘
```

**Benefits:**

-   Simple to implement (add `recurring_lookahead_days` to User model)
-   Users control their own planning horizon
-   Reduces clutter for users who don't plan far ahead
-   Maintains existing generation logic

**Implementation:**

-   Add `recurring_lookahead_days` column to User model (default: 14)
-   Update Settings page UI
-   Use user's preference in all generation calls
-   Backend validates range (7-90 days)

### Option 2: Just-In-Time Generation (Radical Redesign)

**Completely different approach:**

1. **No automatic future generation** - Generate only when expenses become due
2. **Show upcoming recurring expenses separately** - Preview upcoming charges without creating actual expenses
3. **Generate on-demand** - User can manually generate when needed

**New UI/UX:**

**Dashboard:**

-   Shows only actual expenses (past & today)
-   Separate "Upcoming Recurring" section (not actual expenses, just preview)

**Benefits:**

-   Much simpler mental model
-   No clutter from future transactions
-   True "scheduled" expenses vs "actual" expenses
-   Easier to understand what's real vs what's planned

**Drawbacks:**

-   Requires more significant refactoring
-   Changes user workflow significantly
-   Need to ensure expenses still generate reliably

### Option 3: Configurable Default + Override on Generation

**Hybrid approach:**

1. User sets default lookahead (7/14/30/60/90 days)
2. "Generate Now" button shows modal with override option:
    ```
    ┌──────────────────────────────────────────┐
    │ Generate Recurring Expenses              │
    ├──────────────────────────────────────────┤
    │ Generate for the next:                   │
    │ [ 14 ] days (your default)              │
    │                                          │
    │ 📅 This will create 8 expenses           │
    │ from Dec 22, 2024 to Jan 5, 2025        │
    │                                          │
    │ [Cancel]  [Generate]                     │
    └──────────────────────────────────────────┘
    ```

**Benefits:**

-   Flexibility for both regular use and special cases
-   Users can adjust per-generation without changing settings
-   Preview shows exactly what will be created

## Recommended Approach

**Start with Option 1** (user-configurable default) as it's:

-   Low effort, high impact
-   Backwards compatible
-   Solves the immediate problem
-   Easy to extend later

**Consider Option 2** in a future major refactor if users find the concept still confusing.

## Technical Changes Required

### Option 1 Implementation

**Backend:**

1. Add migration:

    ```python
    # Add column to User model
    recurring_lookahead_days = db.Column(db.Integer, default=14, nullable=False)
    ```

2. Update generation function signature (already supports it):

    ```python
    # Already exists, just use user's preference
    generate_due_expenses(user_id, days_ahead=user.recurring_lookahead_days)
    ```

3. Add Settings API endpoint:
    ```python
    @settings_bp.route("/recurring-lookahead", methods=["PUT"])
    @jwt_required()
    def update_recurring_lookahead():
        # Validate 7-90 days, update user
    ```

**Frontend:**

1. Update Settings page with radio buttons
2. Update all `generateNow()` calls to omit `days_ahead` (use user's default)
3. Add API call to update setting

**Locations to update:**

-   [frontend/src/components/AddExpenseModal.jsx](frontend/src/components/AddExpenseModal.jsx#L104) - Remove hardcoded 60
-   [frontend/src/pages/RecurringExpenses.jsx](frontend/src/pages/RecurringExpenses.jsx#L68) - Remove hardcoded value
-   [frontend/src/api.js](frontend/src/api.js#L125) - Change default parameter
-   [.github/workflows/recurring-expenses.yml](.github/workflows/recurring-expenses.yml#L44) - Use query param from user settings (or keep 60 for automated runs)

## User Impact

**Before:** All users forced to generate 60 days ahead regardless of needs
**After:** Users choose 7/14/30/60/90 days based on their planning style

**Example Use Cases:**

-   "I only plan week-by-week" → 7 days
-   "I want to see current + next week" → 14 days (default)
-   "I need full month view" → 30 days
-   "I plan far ahead" → 60 or 90 days

## Priority

**Medium-High** - Current hardcoded value causes confusion and clutters transaction views

## Labels

-   `enhancement`
-   `feature`
-   `backend`
-   `frontend`
-   `ux-improvement`

## Related Issues/Discussions

-   Inconsistent hardcoded values (60 vs 90) across codebase
-   Future transactions appearing in current period views

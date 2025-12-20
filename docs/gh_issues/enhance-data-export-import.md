# Feature: Comprehensive Data Export/Import Including Salary Periods

## Issue Type

`enhancement`, `feature`, `backend`, `frontend`

## Current Behavior

The current export/import feature only transfers:

-   Expenses
-   Income
-   Recurring expenses

When importing data to a new user account (or after database reset), historical salary periods and budget periods are lost because they are user-specific and not included in the export.

## Expected Behavior

Export/import should include ALL user data to enable complete data portability:

-   ✅ Expenses (currently included)
-   ✅ Income (currently included)
-   ✅ Recurring expenses (currently included)
-   ❌ **Salary periods** (missing - critical for historical budget tracking)
-   ❌ **Budget periods** (missing - individual weeks within salary periods)
-   ❌ **User defaults** (missing - default expense values)
-   ❌ **Debts** (missing - debt tracking)
-   ❌ **Credit card settings** (missing - user's credit card configuration)

## Why This Matters

1. **Data Portability**: Users should be able to fully migrate their data between environments (dev → prod, backup → restore)
2. **Historical Analysis**: Without salary periods, users lose access to historical budget performance and weekly spending trends
3. **Backup/Restore**: A true backup should restore the ENTIRE financial state, not just transactions
4. **Testing**: When testing with production data in dev, we need complete period structure to test period-specific features

## Proposed Solution

### Backend Changes (`backend/routes/data.py`)

**Export Enhancement:**

```python
@data_bp.route('/export', methods=['GET'])
@jwt_required()
def export_data():
    user_id = get_jwt_identity()

    # Existing queries...
    expenses = Expense.query.filter_by(user_id=user_id).all()
    income = Income.query.filter_by(user_id=user_id).all()
    recurring = RecurringExpense.query.filter_by(user_id=user_id).all()

    # NEW: Export salary periods and their child budget periods
    salary_periods = SalaryPeriod.query.filter_by(user_id=user_id).all()
    budget_periods = BudgetPeriod.query.filter_by(user_id=user_id).all()

    # NEW: Export user configuration
    debts = Debt.query.filter_by(user_id=user_id).all()
    defaults = UserDefaults.query.filter_by(user_id=user_id).first()

    export_data = {
        'version': '2.0',  # Increment version for compatibility checking
        'exported_at': datetime.utcnow().isoformat(),
        'expenses': [serialize_expense(e) for e in expenses],
        'income': [serialize_income(i) for i in income],
        'recurring_expenses': [serialize_recurring(r) for r in recurring],
        'salary_periods': [serialize_salary_period(sp) for sp in salary_periods],
        'budget_periods': [serialize_budget_period(bp) for bp in budget_periods],
        'debts': [serialize_debt(d) for d in debts],
        'user_defaults': serialize_defaults(defaults) if defaults else None,
    }

    return jsonify(export_data)
```

**Import Enhancement with Relationship Mapping:**

```python
@data_bp.route('/import', methods=['POST'])
@jwt_required()
def import_data():
    user_id = get_jwt_identity()
    data = request.json

    # Check version compatibility
    version = data.get('version', '1.0')

    # Import in dependency order:
    # 1. Salary periods first (so we can map old IDs to new IDs)
    salary_period_id_map = {}  # old_id -> new_id
    if 'salary_periods' in data:
        for sp_data in data['salary_periods']:
            old_sp_id = sp_data['id']
            new_sp = SalaryPeriod(
                user_id=user_id,
                start_date=sp_data['start_date'],
                end_date=sp_data['end_date'],
                # ... other fields, but NOT the old ID
                is_active=False  # Import as inactive by default
            )
            db.session.add(new_sp)
            db.session.flush()  # Get new ID
            salary_period_id_map[old_sp_id] = new_sp.id

    # 2. Budget periods (map to new salary period IDs)
    budget_period_id_map = {}
    if 'budget_periods' in data:
        for bp_data in data['budget_periods']:
            old_bp_id = bp_data['id']
            old_sp_id = bp_data.get('salary_period_id')
            new_bp = BudgetPeriod(
                user_id=user_id,
                salary_period_id=salary_period_id_map.get(old_sp_id),  # Remap!
                start_date=bp_data['start_date'],
                end_date=bp_data['end_date'],
                # ... other fields
            )
            db.session.add(new_bp)
            db.session.flush()
            budget_period_id_map[old_bp_id] = new_bp.id

    # 3. Import expenses (remap budget_period_id if present)
    for exp_data in data['expenses']:
        old_bp_id = exp_data.get('budget_period_id')
        new_expense = Expense(
            user_id=user_id,
            budget_period_id=budget_period_id_map.get(old_bp_id) if old_bp_id else None,
            # ... other fields
        )
        db.session.add(new_expense)

    # ... similar for income, recurring, etc.

    db.session.commit()
    return jsonify({'message': 'Import successful'})
```

### Frontend Changes (`frontend/src/components/DataManagement.jsx`)

**Show import/export includes:**

```jsx
<p className="text-sm text-gray-600 mb-4">
    Export includes: • Expenses • Income • Recurring expenses • Salary periods
    (with weekly budgets) • Debts • User preferences
</p>
```

**Import confirmation with version check:**

```jsx
const handleImport = async (file) => {
    const data = JSON.parse(await file.text());

    if (data.version === "1.0") {
        // Warn about incomplete import
        if (
            window.confirm(
                "This export is from an older version and does not include salary periods. " +
                    "Continue with partial import?"
            )
        ) {
            await api.post("/data/import", data);
        }
    } else {
        // Full import
        await api.post("/data/import", data);
    }
};
```

## Implementation Checklist

-   [ ] Add serialization functions for all models (`serialize_salary_period`, `serialize_budget_period`, etc.)
-   [ ] Update export endpoint to include new data types
-   [ ] Implement ID remapping logic in import (critical for preserving relationships)
-   [ ] Add version field to export format
-   [ ] Handle backward compatibility (v1.0 imports still work, show warning)
-   [ ] Update frontend to show what's included in export
-   [ ] Add import confirmation dialog showing what will be imported
-   [ ] **Test with production data export → dev import** (real-world scenario)
-   [ ] Document export format in API docs
-   [ ] Add migration guide for upgrading old exports

## Testing Strategy

1. **Export from production** with multiple salary periods
2. **Import to dev** with fresh database
3. **Verify**:
    - All salary periods created with correct dates
    - Budget periods correctly linked to parent salary periods
    - Expenses correctly linked to budget periods
    - Historical weekly budget tracking works
    - Period navigation shows all historical periods

## Breaking Changes

None - old v1.0 exports will still work (expenses, income, recurring only), but will show a warning that salary periods weren't imported.

## Related Issues

-   Issue #89: Debit/Credit Balance Calculation Bug (fixed with real-time calculations, but revealed this import limitation)

## Priority

**Medium** - Important for data portability and testing, but current workaround is to manually recreate salary periods after import.

## Acceptance Criteria

-   [ ] Export from user A in prod, import to user B in dev → all data present
-   [ ] Old v1.0 exports still import successfully (backward compatibility)
-   [ ] Import shows confirmation of what will be imported before proceeding
-   [ ] After import, can navigate to historical salary periods and see weekly budgets
-   [ ] After import, balance calculations are correct (use real-time calc from #89)

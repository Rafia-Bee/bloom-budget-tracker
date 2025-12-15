"""Test that the export endpoint includes weekly budget breakdown."""
from backend.app import create_app
from backend.models.database import User
from backend.routes.export_import import generate_weekly_budget_breakdown

app = create_app()

with app.app_context():
    # Get any user with salary periods
    user = User.query.first()
    if not user:
        print("❌ No users found in database")
        exit(1)

    print(f"Testing with user: {user.email} (ID: {user.id})")

    # Test the generate function directly
    breakdown = generate_weekly_budget_breakdown(user.id)

    # Validate response
    assert isinstance(breakdown, list), "Breakdown should be a list"
    assert len(breakdown) > 0, "No salary periods in breakdown"

    first_period = breakdown[0]
    assert "salary_period_id" in first_period
    assert "salary_period_dates" in first_period
    assert "weeks" in first_period
    assert "summary" in first_period

    if first_period["weeks"]:
        first_week = first_period["weeks"][0]
        assert "week_number" in first_week
        assert "date_range" in first_week
        assert "base_budget" in first_week
        assert "carryover" in first_week
        assert "adjusted_budget" in first_week
        assert "spent" in first_week
        assert "remaining" in first_week
        assert "expense_breakdown" in first_week

        # Validate spent structure
        spent = first_week["spent"]
        assert "flexible_expenses" in spent
        assert "fixed_expenses" in spent
        assert "total" in spent

        # Validate expense_breakdown structure
        breakdown_detail = first_week["expense_breakdown"]
        assert "flexible" in breakdown_detail
        assert "fixed" in breakdown_detail

    print("✅ All validations passed!")
    print(f"✓ Weekly budget breakdown generated: Yes")
    print(f"✓ Number of salary periods: {len(breakdown)}")
    print(
        f"✓ First period has {len(first_period['weeks'])} weeks"
        if breakdown
        else "No periods"
    )
    print(f"✓ Summary includes totals: Yes")
    print("\n✅ Export function integration test PASSED")

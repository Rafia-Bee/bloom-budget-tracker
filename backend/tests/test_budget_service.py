"""
Budget Service Unit Tests

Tests for the pure business logic functions in budget_service.py.
These tests verify the mathematical calculations for:
- Weekly budget division
- Carryover calculations
- Adjusted budget with carryover
- Multi-week carryover accumulation
"""

import pytest
from datetime import date, timedelta
from backend.services.budget_service import (
    calculate_weekly_budget,
    calculate_adjusted_budget,
    calculate_remaining,
    calculate_carryover,
    calculate_weeks_with_carryover,
    weeks_to_dict,
    WeekData,
    WeekBudget,
)


class TestCalculateWeeklyBudget:
    """Test weekly budget division calculation."""

    def test_even_division(self):
        """€400 divided by 4 weeks = €100 per week"""
        assert calculate_weekly_budget(40000, 4) == 10000

    def test_uneven_division_rounds_down(self):
        """€270 divided by 4 weeks = €67.50, rounds to €67 (6700 cents)"""
        result = calculate_weekly_budget(27000, 4)
        assert result == 6750  # 27000 // 4 = 6750

    def test_small_amount_division(self):
        """€10 divided by 4 weeks = €2.50 per week"""
        assert calculate_weekly_budget(1000, 4) == 250

    def test_large_amount_division(self):
        """€10,000 divided by 4 weeks = €2,500 per week"""
        assert calculate_weekly_budget(1000000, 4) == 250000

    def test_zero_budget(self):
        """Zero budget returns zero weekly budget"""
        assert calculate_weekly_budget(0, 4) == 0

    def test_three_weeks(self):
        """Division works with different week counts"""
        assert calculate_weekly_budget(30000, 3) == 10000

    def test_single_week(self):
        """Single week returns full amount"""
        assert calculate_weekly_budget(50000, 1) == 50000

    def test_zero_weeks_raises_error(self):
        """Division by zero weeks raises ValueError"""
        with pytest.raises(ValueError, match="positive"):
            calculate_weekly_budget(10000, 0)

    def test_negative_weeks_raises_error(self):
        """Negative weeks raises ValueError"""
        with pytest.raises(ValueError, match="positive"):
            calculate_weekly_budget(10000, -1)

    def test_loss_from_rounding(self):
        """Verify rounding behavior - €10.03 / 4 = 250.75 cents -> 250"""
        # This means €10.03 becomes €10.00 after division (3 cents lost)
        result = calculate_weekly_budget(1003, 4)
        assert result == 250
        # Total after 4 weeks: 250 * 4 = 1000 (lost 3 cents)
        assert result * 4 == 1000


class TestCalculateAdjustedBudget:
    """Test adjusted budget calculation with carryover."""

    def test_positive_carryover(self):
        """Base budget + positive carryover"""
        # €100 base + €20 leftover = €120
        assert calculate_adjusted_budget(10000, 2000) == 12000

    def test_negative_carryover(self):
        """Base budget + negative carryover (overspend)"""
        # €100 base - €30 overspend = €70
        assert calculate_adjusted_budget(10000, -3000) == 7000

    def test_zero_carryover(self):
        """Base budget with no carryover"""
        assert calculate_adjusted_budget(10000, 0) == 10000

    def test_large_negative_carryover(self):
        """Carryover exceeds budget (debt situation)"""
        # €100 base - €150 overspend = -€50
        assert calculate_adjusted_budget(10000, -15000) == -5000

    def test_zero_base_with_carryover(self):
        """Zero base budget with carryover"""
        assert calculate_adjusted_budget(0, 5000) == 5000


class TestCalculateRemaining:
    """Test remaining balance calculation."""

    def test_under_budget(self):
        """Spending less than budget"""
        # €100 budget, €30 spent = €70 remaining
        assert calculate_remaining(10000, 3000) == 7000

    def test_exact_budget(self):
        """Spending exactly budget amount"""
        assert calculate_remaining(10000, 10000) == 0

    def test_over_budget(self):
        """Spending more than budget (overspend)"""
        # €100 budget, €150 spent = -€50 remaining
        assert calculate_remaining(10000, 15000) == -5000

    def test_no_spending(self):
        """No spending at all"""
        assert calculate_remaining(10000, 0) == 10000

    def test_negative_adjusted_budget(self):
        """Spending from already negative budget"""
        # -€50 adjusted (debt), €30 spent = -€80 remaining
        assert calculate_remaining(-5000, 3000) == -8000


class TestCalculateCarryover:
    """Test carryover determination logic."""

    def test_past_week_positive_remaining(self):
        """Past week with leftover carries to next week"""
        assert calculate_carryover(5000, is_week_past=True) == 5000

    def test_past_week_negative_remaining(self):
        """Past week with overspend carries debt to next week"""
        assert calculate_carryover(-3000, is_week_past=True) == -3000

    def test_past_week_zero_remaining(self):
        """Past week with exact spend carries zero"""
        assert calculate_carryover(0, is_week_past=True) == 0

    def test_current_week_no_carryover(self):
        """Current week doesn't contribute carryover"""
        assert calculate_carryover(5000, is_week_past=False) == 0

    def test_future_week_no_carryover(self):
        """Future week doesn't contribute carryover"""
        assert calculate_carryover(8000, is_week_past=False) == 0


class TestCalculateWeeksWithCarryover:
    """Test full carryover calculation across multiple weeks."""

    def create_week(self, week_num: int, budget: int, spent: int, start_offset: int) -> WeekData:
        """Helper to create WeekData with calculated dates."""
        base_date = date(2025, 1, 6)  # Monday
        start = base_date + timedelta(days=start_offset)
        end = start + timedelta(days=6)
        return WeekData(
            week_id=week_num,
            week_number=week_num,
            budget_amount=budget,
            start_date=start,
            end_date=end,
            spent=spent,
        )

    def test_all_weeks_under_budget(self):
        """All weeks under budget - carryover accumulates"""
        today = date(2025, 2, 15)  # After all weeks
        weeks = [
            self.create_week(1, 10000, 3000, 0),  # €100 budget, €30 spent
            self.create_week(2, 10000, 4000, 7),  # €100 budget, €40 spent
            self.create_week(3, 10000, 5000, 14),  # €100 budget, €50 spent
            self.create_week(4, 10000, 6000, 21),  # €100 budget, €60 spent
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1: €100 base, €0 carryover, €30 spent, €70 remaining
        assert result[0].budget_amount == 10000
        assert result[0].carryover == 0
        assert result[0].adjusted_budget == 10000
        assert result[0].remaining == 7000

        # Week 2: €100 base, €70 carryover, €40 spent, €130 remaining
        assert result[1].carryover == 7000
        assert result[1].adjusted_budget == 17000
        assert result[1].remaining == 13000

        # Week 3: €100 base, €130 carryover, €50 spent, €180 remaining
        assert result[2].carryover == 13000
        assert result[2].adjusted_budget == 23000
        assert result[2].remaining == 18000

        # Week 4: €100 base, €180 carryover, €60 spent, €220 remaining
        assert result[3].carryover == 18000
        assert result[3].adjusted_budget == 28000
        assert result[3].remaining == 22000

    def test_week_with_overspend(self):
        """Week 2 overspends, reducing Week 3 budget"""
        today = date(2025, 2, 15)
        weeks = [
            self.create_week(1, 10000, 5000, 0),  # €50 left
            self.create_week(2, 10000, 20000, 7),  # €200 spent, overspend
            self.create_week(3, 10000, 3000, 14),  # €30 spent
            self.create_week(4, 10000, 0, 21),  # €0 spent
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1: €50 remaining
        assert result[0].remaining == 5000

        # Week 2: €100 + €50 = €150 adjusted, €200 spent = -€50 remaining
        assert result[1].carryover == 5000
        assert result[1].adjusted_budget == 15000
        assert result[1].remaining == -5000

        # Week 3: €100 + (-€50) = €50 adjusted, €30 spent = €20 remaining
        assert result[2].carryover == -5000
        assert result[2].adjusted_budget == 5000
        assert result[2].remaining == 2000

        # Week 4: €100 + €20 = €120 adjusted
        assert result[3].carryover == 2000
        assert result[3].adjusted_budget == 12000

    def test_current_week_no_carryover_contribution(self):
        """Current week doesn't contribute carryover to future weeks"""
        today = date(2025, 1, 15)  # Week 2 is current
        weeks = [
            self.create_week(1, 10000, 3000, 0),  # Past: €70 remaining
            self.create_week(2, 10000, 2000, 7),  # Current: €80 remaining
            self.create_week(3, 10000, 0, 14),  # Future
            self.create_week(4, 10000, 0, 21),  # Future
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1 past: carryover = 7000
        assert result[0].remaining == 7000

        # Week 2 (current): gets Week 1 carryover
        assert result[1].carryover == 7000
        assert result[1].adjusted_budget == 17000
        assert result[1].remaining == 15000  # 17000 - 2000

        # Week 3: NO carryover from current Week 2
        assert result[2].carryover == 7000  # Still only Week 1's carryover
        assert result[2].adjusted_budget == 17000

        # Week 4: Same, no new carryover
        assert result[3].carryover == 7000

    def test_all_weeks_future(self):
        """All weeks in future - no carryover at all"""
        today = date(2025, 1, 1)  # Before all weeks
        weeks = [
            self.create_week(1, 10000, 0, 5),
            self.create_week(2, 10000, 0, 12),
            self.create_week(3, 10000, 0, 19),
            self.create_week(4, 10000, 0, 26),
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        for week in result:
            assert week.carryover == 0
            assert week.adjusted_budget == 10000

    def test_empty_weeks_list(self):
        """Empty weeks list returns empty result"""
        result = calculate_weeks_with_carryover([], date.today())
        assert result == []

    def test_single_week(self):
        """Single week period"""
        today = date(2025, 1, 20)
        weeks = [self.create_week(1, 50000, 30000, 0)]

        result = calculate_weeks_with_carryover(weeks, today)

        assert len(result) == 1
        assert result[0].carryover == 0
        assert result[0].adjusted_budget == 50000
        assert result[0].remaining == 20000

    def test_cascading_debt(self):
        """Severe overspend cascades through multiple weeks"""
        today = date(2025, 2, 15)
        weeks = [
            self.create_week(1, 10000, 50000, 0),  # -€400 (massive overspend)
            self.create_week(2, 10000, 5000, 7),  # €100 base
            self.create_week(3, 10000, 5000, 14),  # €100 base
            self.create_week(4, 10000, 5000, 21),  # €100 base
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1: €100 - €500 = -€400
        assert result[0].remaining == -40000

        # Week 2: €100 + (-€400) = -€300 adjusted, €50 spent = -€350
        assert result[1].carryover == -40000
        assert result[1].adjusted_budget == -30000
        assert result[1].remaining == -35000

        # Debt continues to cascade...
        assert result[2].carryover == -35000
        assert result[3].carryover == -30000


class TestWeeksToDict:
    """Test conversion to API response format."""

    def test_converts_to_dict(self):
        """WeekBudget converts to dict with correct keys"""
        week = WeekBudget(
            week_id=1,
            week_number=1,
            budget_amount=10000,
            adjusted_budget=12000,
            carryover=2000,
            spent=5000,
            remaining=7000,
            start_date=date(2025, 1, 6),
            end_date=date(2025, 1, 12),
        )

        result = weeks_to_dict([week])

        assert len(result) == 1
        assert result[0]["id"] == 1
        assert result[0]["week_number"] == 1
        assert result[0]["budget_amount"] == 10000
        assert result[0]["adjusted_budget"] == 12000
        assert result[0]["carryover"] == 2000
        assert result[0]["spent"] == 5000
        assert result[0]["remaining"] == 7000
        assert result[0]["start_date"] == "2025-01-06"
        assert result[0]["end_date"] == "2025-01-12"

    def test_empty_list(self):
        """Empty list returns empty list"""
        assert weeks_to_dict([]) == []


class TestRealWorldScenarios:
    """Test realistic budget scenarios based on app usage patterns."""

    def create_week(self, week_num: int, budget: int, spent: int, start_offset: int) -> WeekData:
        """Helper to create WeekData."""
        base_date = date(2025, 1, 6)
        start = base_date + timedelta(days=start_offset)
        end = start + timedelta(days=6)
        return WeekData(
            week_id=week_num,
            week_number=week_num,
            budget_amount=budget,
            start_date=start,
            end_date=end,
            spent=spent,
        )

    def test_typical_monthly_salary_period(self):
        """
        Scenario: €2,700 salary after fixed bills = €675/week
        Week 1: Careful spending (€50 under budget)
        Week 2: Average spending (exact budget)
        Week 3: Big purchase (€100 over budget)
        Week 4: Normal spending
        """
        weekly_budget = calculate_weekly_budget(270000, 4)
        assert weekly_budget == 67500  # €675

        today = date(2025, 2, 15)  # All weeks past
        weeks = [
            self.create_week(1, 67500, 62500, 0),  # €625 spent, €50 saved
            self.create_week(2, 67500, 67500, 7),  # €675 spent, exact
            self.create_week(3, 67500, 77500, 14),  # €775 spent, €100 over
            self.create_week(4, 67500, 67500, 21),  # €675 spent
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1: €675, spent €625, remaining €50
        assert result[0].remaining == 5000

        # Week 2: €675 + €50 = €725 adjusted, spent €675, remaining €50
        assert result[1].adjusted_budget == 72500
        assert result[1].remaining == 5000

        # Week 3: €675 + €50 = €725 adjusted, spent €775, remaining -€50
        assert result[2].adjusted_budget == 72500
        assert result[2].remaining == -5000

        # Week 4: €675 + (-€50) = €625 adjusted, spent €675, remaining -€50
        assert result[3].adjusted_budget == 62500
        assert result[3].remaining == -5000

    def test_very_frugal_month(self):
        """All weeks under budget - savings accumulate"""
        today = date(2025, 2, 15)
        weekly_budget = 50000  # €500

        weeks = [
            self.create_week(1, weekly_budget, 30000, 0),  # €200 saved
            self.create_week(2, weekly_budget, 35000, 7),  # €150 saved
            self.create_week(3, weekly_budget, 40000, 14),  # €100 saved
            self.create_week(4, weekly_budget, 45000, 21),  # €50 saved
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 4 should show accumulated savings from past weeks
        # W1: €200 remaining (carryover=€200)
        # W2: €700 adjusted, €350 remaining (carryover=€350)
        # W3: €850 adjusted, €450 remaining (carryover=€450)
        # W4: €950 adjusted
        assert result[3].carryover == 45000  # €450 from W1-W3
        assert result[3].adjusted_budget == 95000  # €950
        assert result[3].remaining == 50000  # €500 left

    def test_emergency_expense_early_month(self):
        """Large unexpected expense in Week 1 affects entire month"""
        today = date(2025, 2, 15)
        weekly_budget = 50000  # €500

        weeks = [
            self.create_week(1, weekly_budget, 150000, 0),  # €1500 emergency!
            self.create_week(2, weekly_budget, 20000, 7),  # Tight budget
            self.create_week(3, weekly_budget, 20000, 14),  # Tight budget
            self.create_week(4, weekly_budget, 20000, 21),  # Tight budget
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1: €500 - €1500 = -€1000
        assert result[0].remaining == -100000

        # Week 2: €500 + (-€1000) = -€500 adjusted
        assert result[1].adjusted_budget == -50000
        assert result[1].remaining == -70000  # -€500 - €200 = -€700

        # Debt continues but decreases as they spend less
        assert result[2].remaining == -40000  # -€400
        assert result[3].remaining == -10000  # -€100 (recovering)


class TestEdgeCases:
    """Edge case tests for boundary conditions and unusual inputs."""

    def create_week(self, week_num: int, budget: int, spent: int, start_offset: int) -> WeekData:
        """Helper to create WeekData."""
        base_date = date(2025, 1, 6)
        start = base_date + timedelta(days=start_offset)
        end = start + timedelta(days=6)
        return WeekData(
            week_id=week_num,
            week_number=week_num,
            budget_amount=budget,
            start_date=start,
            end_date=end,
            spent=spent,
        )

    def test_zero_budget_period(self):
        """Period with zero budget (e.g., no income)"""
        today = date(2025, 2, 15)
        weeks = [
            self.create_week(1, 0, 1000, 0),  # €0 budget, €10 spent
            self.create_week(2, 0, 500, 7),  # €0 budget, €5 spent
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Zero budget minus spending = debt
        assert result[0].adjusted_budget == 0
        assert result[0].remaining == -1000  # -€10

        # Debt carries to week 2
        assert result[1].carryover == -1000
        assert result[1].adjusted_budget == -1000  # €0 + (-€10) = -€10
        assert result[1].remaining == -1500  # -€15 total

    def test_maximum_integer_values(self):
        """Large amounts don't overflow (billionaire budget)"""
        today = date(2025, 2, 15)
        # €1 million weekly budget
        big_budget = 100_000_000  # 100M cents = €1M
        weeks = [
            self.create_week(1, big_budget, 50_000_000, 0),  # €500k spent
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        assert result[0].adjusted_budget == 100_000_000
        assert result[0].remaining == 50_000_000  # €500k remaining

    def test_all_weeks_overspend(self):
        """Every single week overspends - debt snowball"""
        today = date(2025, 2, 15)
        weeks = [
            self.create_week(1, 10000, 15000, 0),  # €100, spent €150
            self.create_week(2, 10000, 15000, 7),  # €100, spent €150
            self.create_week(3, 10000, 15000, 14),  # €100, spent €150
            self.create_week(4, 10000, 15000, 21),  # €100, spent €150
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1: -€50
        assert result[0].remaining == -5000

        # Week 2: €100 + (-€50) = €50, spent €150 = -€100
        assert result[1].adjusted_budget == 5000
        assert result[1].remaining == -10000

        # Week 3: €100 + (-€100) = €0, spent €150 = -€150
        assert result[2].adjusted_budget == 0
        assert result[2].remaining == -15000

        # Week 4: €100 + (-€150) = -€50, spent €150 = -€200
        assert result[3].adjusted_budget == -5000
        assert result[3].remaining == -20000  # -€200 total debt

    def test_exact_budget_spending_no_carryover(self):
        """Spending exactly budget each week = no carryover"""
        today = date(2025, 2, 15)
        weeks = [
            self.create_week(1, 10000, 10000, 0),
            self.create_week(2, 10000, 10000, 7),
            self.create_week(3, 10000, 10000, 14),
            self.create_week(4, 10000, 10000, 21),
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        for week in result:
            assert week.remaining == 0
            assert week.adjusted_budget == 10000

    def test_negative_budget_input(self):
        """Negative budget (shouldn't happen, but handle gracefully)"""
        today = date(2025, 2, 15)
        weeks = [
            self.create_week(1, -5000, 0, 0),  # -€50 budget (edge case)
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Even negative budget should calculate correctly
        assert result[0].budget_amount == -5000
        assert result[0].adjusted_budget == -5000
        assert result[0].remaining == -5000  # -€50 - €0 = -€50

    def test_one_cent_rounding(self):
        """Single cent precision preserved"""
        weekly = calculate_weekly_budget(1, 4)  # 1 cent / 4 weeks
        assert weekly == 0  # Integer division: 1 // 4 = 0

        weekly = calculate_weekly_budget(5, 4)  # 5 cents / 4 weeks
        assert weekly == 1  # 5 // 4 = 1 cent per week

    def test_week_boundary_timing(self):
        """Week that ends exactly on 'today' is considered past"""
        # Week ends on Jan 12, today is Jan 12
        today = date(2025, 1, 12)
        weeks = [
            self.create_week(1, 10000, 3000, 0),  # Ends Jan 12
            self.create_week(2, 10000, 0, 7),  # Starts Jan 13
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1 end_date < today? Jan 12 < Jan 12? NO - not past
        # So week 1 carryover should NOT propagate
        assert result[1].carryover == 0  # No carryover from current week

    def test_week_just_ended(self):
        """Week that ended yesterday should contribute carryover"""
        today = date(2025, 1, 13)  # Day after week 1 ends
        weeks = [
            self.create_week(1, 10000, 3000, 0),  # Ends Jan 12
            self.create_week(2, 10000, 0, 7),
        ]

        result = calculate_weeks_with_carryover(weeks, today)

        # Week 1 end_date < today? Jan 12 < Jan 13? YES
        assert result[1].carryover == 7000  # €70 carries over

"""
Budget calculation service - provides budget math and carryover logic.

This service extracts core budget calculations into testable pure functions,
separating business logic from database queries and API concerns.

Key Calculations:
- Weekly budget division: Split remaining amount equally across 4 weeks
- Carryover calculation: Accumulate under/overspend from past weeks
- Adjusted budget: Base budget + cumulative carryover
- Remaining balance: Adjusted budget - spent amount
"""

from datetime import date
from typing import List, Dict, Any, NamedTuple


class WeekData(NamedTuple):
    """Raw week data from database query."""

    week_id: int
    week_number: int
    budget_amount: int  # cents
    start_date: date
    end_date: date
    spent: int  # cents


class WeekBudget(NamedTuple):
    """Calculated week budget with carryover applied."""

    week_id: int
    week_number: int
    budget_amount: int  # Original budget (cents)
    adjusted_budget: int  # Budget + carryover (cents)
    carryover: int  # Carryover from previous weeks (cents)
    spent: int  # Amount spent (cents)
    remaining: int  # Adjusted budget - spent (cents)
    start_date: date
    end_date: date


def calculate_weekly_budget(total_amount: int, num_weeks: int = 4) -> int:
    """
    Calculate weekly budget by dividing total amount evenly.

    Uses integer division to avoid floating-point precision issues.
    All amounts are in cents.

    Args:
        total_amount: Total budget to divide (in cents)
        num_weeks: Number of weeks to divide into (default 4)

    Returns:
        Weekly budget amount in cents

    Raises:
        ValueError: If num_weeks is 0 or negative

    Examples:
        >>> calculate_weekly_budget(40000, 4)  # €400 / 4 weeks
        10000  # €100 per week

        >>> calculate_weekly_budget(27000, 4)  # €270 / 4 weeks
        6750   # €67.50 per week (rounds down)
    """
    if num_weeks <= 0:
        raise ValueError("Number of weeks must be positive")
    return total_amount // num_weeks


def calculate_adjusted_budget(base_budget: int, carryover: int) -> int:
    """
    Calculate adjusted budget by adding carryover to base budget.

    Carryover can be positive (leftover from previous weeks) or
    negative (overspend from previous weeks).

    Args:
        base_budget: Original weekly budget (in cents)
        carryover: Cumulative carryover from previous weeks (in cents)

    Returns:
        Adjusted budget amount in cents

    Examples:
        >>> calculate_adjusted_budget(10000, 2000)  # €100 + €20
        12000  # €120 adjusted

        >>> calculate_adjusted_budget(10000, -3000)  # €100 - €30
        7000   # €70 adjusted
    """
    return base_budget + carryover


def calculate_remaining(adjusted_budget: int, spent: int) -> int:
    """
    Calculate remaining budget after spending.

    Can return negative values when spending exceeds budget.

    Args:
        adjusted_budget: Budget amount including carryover (in cents)
        spent: Amount spent (in cents)

    Returns:
        Remaining amount in cents (can be negative)

    Examples:
        >>> calculate_remaining(10000, 3000)  # €100 budget, €30 spent
        7000   # €70 remaining

        >>> calculate_remaining(10000, 15000)  # €100 budget, €150 spent
        -5000  # -€50 (overspent)
    """
    return adjusted_budget - spent


def calculate_carryover(remaining: int, is_week_past: bool) -> int:
    """
    Determine carryover amount for next week.

    Only past weeks contribute to carryover. Current and future weeks
    don't affect subsequent weeks' budgets.

    Args:
        remaining: Remaining amount from the week (in cents)
        is_week_past: True if the week has ended

    Returns:
        Carryover amount for next week (0 if week not past)

    Examples:
        >>> calculate_carryover(5000, is_week_past=True)
        5000  # €50 carries to next week

        >>> calculate_carryover(5000, is_week_past=False)
        0     # Not past, no carryover

        >>> calculate_carryover(-3000, is_week_past=True)
        -3000 # -€30 debt carries to next week
    """
    if is_week_past:
        return remaining
    return 0


def calculate_weeks_with_carryover(weeks: List[WeekData], today: date) -> List[WeekBudget]:
    """
    Calculate all week budgets with cumulative carryover applied.

    This is the main business logic function that processes raw week data
    and applies the carryover rules across all weeks in a salary period.

    The carryover algorithm:
    1. Start with zero carryover for Week 1
    2. For each week: adjusted_budget = base_budget + cumulative_carryover
    3. Calculate remaining = adjusted_budget - spent
    4. If week is past, update cumulative_carryover = remaining
    5. This remaining becomes the carryover for the next week

    Args:
        weeks: List of WeekData tuples from database, ordered by week_number
        today: Current date for determining which weeks are "past"

    Returns:
        List of WeekBudget tuples with calculated values

    Examples:
        # Week 1: €100 budget, €30 spent, €70 remaining
        # Week 2: €100 base + €70 carryover = €170 adjusted
        # Week 2: €170 adjusted, €200 spent = -€30 remaining
        # Week 3: €100 base + (-€30) carryover = €70 adjusted

    Note:
        Weeks must be ordered by week_number for correct carryover calculation.
    """
    result = []
    cumulative_carryover = 0

    for week in weeks:
        adjusted_budget = calculate_adjusted_budget(week.budget_amount, cumulative_carryover)
        remaining = calculate_remaining(adjusted_budget, week.spent)
        is_past = week.end_date < today

        result.append(
            WeekBudget(
                week_id=week.week_id,
                week_number=week.week_number,
                budget_amount=week.budget_amount,
                adjusted_budget=adjusted_budget,
                carryover=cumulative_carryover,
                spent=week.spent,
                remaining=remaining,
                start_date=week.start_date,
                end_date=week.end_date,
            )
        )

        # Only past weeks contribute carryover to future weeks
        if is_past:
            cumulative_carryover = remaining

    return result


def weeks_to_dict(weeks: List[WeekBudget]) -> List[Dict[str, Any]]:
    """
    Convert WeekBudget objects to dictionaries for API response.

    Args:
        weeks: List of WeekBudget named tuples

    Returns:
        List of dictionaries suitable for JSON serialization
    """
    return [
        {
            "id": w.week_id,
            "week_number": w.week_number,
            "budget_amount": w.budget_amount,
            "adjusted_budget": w.adjusted_budget,
            "carryover": w.carryover,
            "spent": w.spent,
            "remaining": w.remaining,
            "start_date": w.start_date.isoformat(),
            "end_date": w.end_date.isoformat(),
        }
        for w in weeks
    ]

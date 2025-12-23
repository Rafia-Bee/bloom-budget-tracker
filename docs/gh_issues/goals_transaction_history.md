# Goals Page - Add Transaction History

## Summary

Add transaction history display for each goal on the Goals page, similar to the existing debt transaction history functionality.

## Description

Currently, the Goals page shows savings goals with balances and progress, but users cannot see the detailed transaction history that contributed to each goal. This feature would add a transaction history view similar to what exists on the Debts page.

## Acceptance Criteria

### Core Functionality

-   [ ] Add transaction history section to each goal card/detail view
-   [ ] Show all expenses categorized under each specific savings goal
-   [ ] Display transaction date, description, amount for each entry
-   [ ] Show running balance/progress toward goal
-   [ ] Include pagination or scroll for long transaction lists

### UI/UX Requirements

-   [ ] Follow existing debt transaction history design patterns
-   [ ] Expandable/collapsible transaction history section
-   [ ] Consistent styling with rest of Goals page
-   [ ] Responsive design for mobile devices
-   [ ] Loading states while fetching transaction data

### Technical Requirements

-   [ ] Backend endpoint to fetch goal-specific transactions
-   [ ] Filter expenses by savings subcategory matching goal name
-   [ ] Efficient database queries with proper indexing
-   [ ] Frontend component for transaction history display
-   [ ] Integration with existing Goals page state management

## Implementation Notes

### Backend Changes

-   Create endpoint: `GET /api/goals/{goal_id}/transactions`
-   Query expenses where subcategory matches goal name
-   Return paginated transaction list with metadata
-   Include running balance calculations

### Frontend Changes

-   Add transaction history component to Goals page
-   Implement expand/collapse functionality for each goal
-   Add transaction list with date/description/amount columns
-   Include progress indicators showing goal completion over time

### Database Considerations

-   Leverage existing expense-subcategory relationship
-   Ensure proper indexing on expense queries by subcategory
-   Consider caching for frequently accessed goal histories

## Priority

**Medium** - Enhancement that improves user experience and goal tracking visibility

## Labels

-   `feature`
-   `ui-ux`
-   `frontend`
-   `backend`

## Related

-   Similar to existing debt transaction history functionality
-   Builds on current Goals page foundation
-   May benefit from shared transaction history component

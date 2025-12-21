# Day-by-Day Transaction Navigation

## Summary

Add intuitive day navigation controls to the Transactions section to easily browse transactions from different dates without using the filter modal.

## Problem

Currently, viewing transactions from previous days requires:

1. Opening the filter modal
2. Setting start/end dates
3. Applying filters

This is cumbersome for quick browsing of past transactions. Users often want to check "what did I spend yesterday" or "what happened last week" without multiple clicks.

## Proposed Solution

Add a navigation bar above the transaction list with three buttons:

```
[← Previous] [Today] [Next →]
```

### Navigation Logic

**Previous Button**

-   Navigates to the most recent previous date that has transactions
-   Example: If today is Dec 22 and transactions exist on Dec 14, Nov 30, Nov 25, Nov 21, Nov 20:
    -   First click: Go to Dec 14
    -   Second click: Go to Nov 30
    -   Third click: Go to Nov 25
    -   etc.

**Next Button**

-   Navigates to the next date that has transactions
-   Disabled (greyed out) if the current view is today or if there are no future transactions
-   Example: If viewing Nov 30 and transactions exist on Dec 14, Dec 22, Dec 24 (scheduled):
    -   First click: Go to Dec 14
    -   Second click: Go to Dec 22 (today)
    -   Third click: Go to Dec 24 (scheduled)
    -   Button becomes disabled after Dec 24

**Today Button**

-   Resets to current date view
-   Shows all transactions from today
-   Highlighted/disabled when already viewing today

### UI Requirements

1. **Navigation Bar Placement**: Above transaction filters, below the "Transactions" header
2. **Date Display**: Show current date being viewed (e.g., "Showing: December 22, 2024")
3. **Button States**:
    - Previous: Always enabled (unless on earliest transaction date)
    - Next: Disabled when viewing today or latest scheduled date
    - Today: Highlighted when viewing current date
4. **Mobile Friendly**: Buttons should be touch-friendly with adequate spacing
5. **Dark Mode Support**: Follow existing dark mode color scheme

### Technical Implementation Notes

**Backend Requirements**:

-   Create new endpoint: `GET /expenses/dates-with-transactions`
    -   Returns array of dates (ISO format) that have transactions
    -   Include both realized and scheduled transactions
    -   Sorted chronologically

**Frontend Changes**:

-   Add navigation state to Dashboard component:
    ```jsx
    const [currentViewDate, setCurrentViewDate] = useState(new Date());
    const [transactionDates, setTransactionDates] = useState([]);
    ```
-   Fetch transaction dates on component mount
-   Filter transactions by `currentViewDate` (single day)
-   Navigation functions:
    -   `handlePreviousDay()` - Find and set previous date from `transactionDates`
    -   `handleNextDay()` - Find and set next date from `transactionDates`
    -   `handleToday()` - Reset to current date

**Existing Filter Compatibility**:

-   Day navigation should work alongside existing filters
-   When a day is selected via navigation, apply it as a date range filter (start=end=selected date)
-   Existing advanced filters (category, payment method, etc.) should still apply

## User Experience

### Before (Current State)

1. User wants to check yesterday's transactions
2. Click "Filter" button
3. Set start date to yesterday
4. Set end date to yesterday
5. Click "Apply Filters"
6. **5 clicks, 1 modal interaction**

### After (With This Feature)

1. User wants to check yesterday's transactions
2. Click "Previous" button
3. **1 click**

## Priority

**Medium** - Quality of life improvement that significantly enhances daily usage

## Labels

-   `enhancement`
-   `feature`
-   `ui-ux`
-   `frontend`

## Related Files

-   `frontend/src/pages/Dashboard.jsx` - Main transactions view
-   `backend/routes/expenses.py` - Add new endpoint for transaction dates
-   `frontend/src/components/DateNavigator.jsx` - New component (to be created)

## Additional Considerations

-   Should respect existing filters (e.g., if filtering by "Credit Card", only navigate between days with credit card transactions)
-   Could show transaction count for the selected day (e.g., "December 22, 2024 • 5 transactions")
-   Future enhancement: Keyboard shortcuts (arrow keys for navigation)

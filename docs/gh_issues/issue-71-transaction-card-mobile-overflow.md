# Transaction cards overflow on mobile - redesign needed

## Bug Description

Transaction cards overflow their right border on mobile Chrome browser, causing edit/delete buttons and amounts to be cut off or inaccessible.

## Affected Scenarios

1. **Scheduled + Recurring transactions**: Amount, edit button, and delete button overflow the right border
2. **Scheduled transactions**: Delete button slightly overflows
3. **Severity depends on**: Amount size and length of title/category text

## Environment

-   **Platform**: Mobile (tested on OnePlus 13)
-   **Browser**: Chrome
-   **Viewport**: Mobile screen sizes

## Expected Behavior

All transaction card content (title, category, amount, edit/delete buttons) should fit within the card boundaries with proper spacing on mobile devices.

## Proposed Solution

Redesign transaction card layout for mobile view:

-   Consider vertical stacking of elements on small screens
-   Use responsive breakpoints to adjust layout
-   Ensure touch targets for edit/delete buttons are properly sized (min 44x44px)
-   Optimize for common mobile viewport widths (375px, 390px, 414px)

## Files to Investigate

-   `frontend/src/components/TransactionCard.jsx` or similar transaction display components
-   `frontend/src/pages/Dashboard.jsx` - transaction list rendering
-   Responsive CSS/Tailwind classes for mobile breakpoints

## Related Issues

-   #66 - Mobile UI issues (completed)
-   #68 - Transaction edit/delete buttons overflowing on mobile (may be duplicate/related)

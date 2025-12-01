# Mobile: Add button (+) doesn't show menu on initial load

## Description

On mobile (production), pressing the floating "+" button does not show the transaction menu on initial page load. The menu only appears after scrolling down to view transactions first.

## Steps to Reproduce

1. Open app on mobile device (production)
2. Land on Dashboard page
3. Press the "+" floating action button
4. **Expected:** Menu appears with transaction type options
5. **Actual:** Nothing happens

## Workaround

1. Scroll down until transactions are visible
2. Press "+" button again
3. Menu now appears correctly

## Environment

- Device: Mobile (production)
- Page: Dashboard
- Component: FloatingActionButton / TransactionMenu

## Suggested Investigation

- Check z-index layering of menu vs other elements
- Verify menu positioning logic on mobile viewport
- Check if menu is rendering but hidden behind other elements
- Review scroll event handlers that might affect menu visibility
- Compare mobile vs desktop behavior for FAB menu

## Priority

Medium - workaround exists but impacts UX on mobile

## Labels

- bug
- mobile
- frontend
- priority: medium
- size: small

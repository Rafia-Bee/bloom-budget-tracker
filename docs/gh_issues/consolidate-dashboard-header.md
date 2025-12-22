# Refactor: Consolidate Dashboard header to use shared Header component

## Summary

Dashboard currently has its own custom header implementation with duplicate mobile menu code. This creates maintenance burden - any header changes need to be made in two places (Header.jsx and Dashboard.jsx).

## Problem

-   **Debts.jsx** and **RecurringExpenses.jsx** use `<Header />` component
-   **Dashboard.jsx** has custom header implementation with its own mobile menu
-   Issue #95 submenu changes had to be implemented twice (desktop in Header.jsx, mobile in Dashboard.jsx)
-   Future header changes require updating two files

## Current State

**Header.jsx** (shared component):

-   Used by Debts, Recurring Expenses pages
-   Has logo, nav links, user menu dropdown
-   Includes mobile menu with hamburger icon
-   NEW: Collapsible submenus for Import/Export and Experimental

**Dashboard.jsx** (custom implementation):

-   Custom header with period selector
-   Custom mobile menu drawer
-   Duplicate user menu logic
-   Separate submenu implementation

## Proposed Solution

### Option 1: Make Header Component Flexible (Recommended)

Extend Header.jsx to support optional children/custom content:

```jsx
<Header
  setIsAuthenticated={setIsAuthenticated}
  onExport={handleExport}
  onImport={handleImport}
  onBankImport={handleBankImport}
  onShowExperimental={() => setShowExperimentalModal(true)}
>
  {/* Dashboard-specific content: Period Selector */}
  <PeriodSelector ... />
</Header>
```

Header component renders children in a designated area (e.g., after logo, before user menu).

### Option 2: Create Variants

Create `<DashboardHeader />` that wraps `<Header />` and adds Dashboard-specific elements

### Option 3: Keep Separate but Share Mobile Menu

Extract mobile menu into a separate `<MobileMenu />` component used by both.

## Recommended: Option 1

Benefits:

-   Single source of truth for header
-   Easy to maintain
-   Flexible for future pages with custom header content
-   Consistent user experience

## Implementation Plan

### Phase 1: Make Header Flexible (2-3 hours)

1. Update Header.jsx to accept `children` prop
2. Add layout slots for custom content
3. Test on Debts and Recurring pages (should work unchanged)

### Phase 2: Migrate Dashboard (3-4 hours)

1. Remove custom header from Dashboard.jsx
2. Import and use Header component
3. Pass PeriodSelector as children
4. Remove duplicate mobile menu code
5. Remove duplicate submenu implementation

### Phase 3: Cleanup (1 hour)

1. Remove unused state/functions from Dashboard
2. Test all pages (Dashboard, Debts, Recurring)
3. Verify mobile menu works on all pages
4. Update documentation

## Files to Modify

-   `frontend/src/components/Header.jsx` - Make flexible with children
-   `frontend/src/pages/Dashboard.jsx` - Remove custom header, use Header component
    -   Lines ~800-1000: Remove custom header and mobile menu code

## Success Criteria

-   [ ] Dashboard uses `<Header />` component
-   [ ] PeriodSelector displays in Dashboard header
-   [ ] Mobile menu works consistently across all pages
-   [ ] No duplicate header/menu code
-   [ ] All pages render correctly (Dashboard, Debts, Recurring)
-   [ ] User menu works the same on all pages
-   [ ] Submenu changes only need to be made in Header.jsx

## Benefits

-   ✅ Single source of truth
-   ✅ Easier maintenance
-   ✅ Consistent UX across pages
-   ✅ Future header changes only need one update
-   ✅ Less code to maintain

## Priority

Medium - Technical debt, improves maintainability

## Labels

-   `refactor`
-   `technical-debt`
-   `frontend`
-   `ui-ux`

## Related Issues

-   #95 - User Menu Redesign (required duplicate implementation)
-   #88 - Technical Debt & Architecture Improvements

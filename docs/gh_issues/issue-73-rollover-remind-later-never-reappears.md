# "Remind Me Later" on rollover prompt never shows prompt again

## Bug Description

When user clicks "Remind Me Later" on the Week 4 salary period rollover prompt, the prompt is dismissed permanently for that period and never reappears, even days later.

## Steps to Reproduce

1. Navigate to Dashboard when Week 4 is ending (rollover prompt visible)
2. Click "Remind Me Later" button
3. Refresh page or return to Dashboard days later
4. Prompt never reappears

## Expected Behavior

"Remind Me Later" should temporarily dismiss the prompt and show it again after:

-   A reasonable time period (e.g., 24 hours, or next day)
-   OR when the period is closer to ending (e.g., 1 day before end date)
-   Should respect user's preference to be reminded, not permanently dismiss

## Actual Behavior

Prompt is permanently dismissed for the entire salary period. User must manually clear localStorage to see it again.

## Current Implementation

```javascript
onDismiss={() => {
  const currentSalaryPeriod = salaryPeriods.find(p => p.is_active)
  if (currentSalaryPeriod) {
    localStorage.setItem('dismissedRollover', currentSalaryPeriod.end_date)
  }
  setShowRolloverPrompt(false)
}}
```

Stores `dismissedRollover` with the period's end date as value, but never checks if enough time has passed to re-show the prompt.

## Workaround

User can manually clear localStorage:

```javascript
localStorage.removeItem("dismissedRollover");
```

## Proposed Solutions

### Option 1: Time-based Re-appearance (Recommended)

Store dismissal timestamp and show again after 24 hours:

```javascript
localStorage.setItem(
    "dismissedRollover",
    JSON.stringify({
        periodEndDate: currentSalaryPeriod.end_date,
        dismissedAt: new Date().toISOString(),
    })
);
```

Check on load:

```javascript
const dismissedData = JSON.parse(localStorage.getItem("dismissedRollover"));
if (dismissedData) {
    const hoursSinceDismissal =
        (Date.now() - new Date(dismissedData.dismissedAt)) / (1000 * 60 * 60);
    if (
        hoursSinceDismissal < 24 &&
        dismissedData.periodEndDate === currentPeriod.end_date
    ) {
        // Still dismissed
        return;
    }
}
// Show prompt
```

### Option 2: Days Remaining Threshold

Only dismiss until period is within 1 day of ending:

```javascript
const daysRemaining = calculateDaysRemaining(currentPeriod.end_date);
const dismissedData = localStorage.getItem("dismissedRollover");
if (dismissedData === currentPeriod.end_date && daysRemaining > 1) {
    // Keep dismissed
    return;
}
// Show prompt if <= 1 day remaining
```

### Option 3: Configurable Snooze

Add snooze duration dropdown: "1 day", "2 days", "Don't remind me"

## Files to Modify

-   `frontend/src/pages/Dashboard.jsx` - onDismiss handler and prompt visibility logic
-   Possibly extract rollover prompt logic to a custom hook for cleaner state management

## Impact

Medium - UX issue where users who want to be reminded later lose access to the helpful rollover prompt without manual intervention.

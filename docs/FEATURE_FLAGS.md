# Feature Flags System

## Overview

Feature flags allow you to enable/disable experimental or beta features without deploying new code. Users can opt-in to experimental features through the Settings page -> Experimental tab.

## Architecture

- **Context**: `FeatureFlagContext.jsx` - Global state management with localStorage persistence
- **Hook**: `useFeatureFlag()` - Access feature flags in any component
- **UI**: Settings page -> Experimental tab

## Usage

### Check if a feature is enabled

```jsx
import { useFeatureFlag } from "../contexts/FeatureFlagContext";

function MyComponent() {
    const { isEnabled } = useFeatureFlag();

    return <div>{isEnabled("reportsEnabled") && <ReportsPage />}</div>;
}
```

### Add a new feature flag

1. **Update the context** (`FeatureFlagContext.jsx`):

```jsx
const [flags, setFlags] = useState(() => {
    const stored = localStorage.getItem("feature_flags");
    return stored
        ? JSON.parse(stored)
        : {
              reportsEnabled: false,
              budgetRecalculationEnabled: false,
              balanceModeEnabled: false,
              newFeatureName: false, // Add your flag here
          };
});
```

2. **Add toggle in ExperimentalFeaturesModal** (`ExperimentalFeaturesModal.jsx`)

3. **Use in components**:

```jsx
const { isEnabled } = useFeatureFlag();

{
    isEnabled("newFeatureName") && <NewFeatureComponent />;
}
```

## Current Flags

### `reportsEnabled`

- **Type**: Feature flag
- **Description**: Enables Reports & Analytics feature
- **Default**: `false`
- **Access**: Settings -> Experimental -> Reports & Analytics

### `balanceModeEnabled`

- **Type**: Feature flag
- **Description**: Enables budget vs sync balance mode toggle
- **Default**: `false`

### `budgetRecalculationEnabled`

- **Type**: Feature flag
- **Description**: Enables automatic budget recalculation
- **Default**: `false`

### `recurringIncomeEnabled` (GRADUATED)

- **Status**: Graduated to permanent feature
- **Description**: Recurring income is now always enabled for all users
- **Graduated**: Issue #204 - Recurring income templates, toggle in AddIncomeModal, income tab on Recurring page, scheduled income in Dashboard are all permanently available

## Best Practices

1. **Always provide warnings**: Experimental features should show clear warnings
2. **Graceful degradation**: Features should fail gracefully if disabled
3. **Clean up old flags**: Remove flags once features are stable and merged to main
4. **Test both states**: Test with flags ON and OFF
5. **Document new flags**: Add to this file when creating new flags

## Storage

Feature flags are stored in `localStorage` under the key `feature_flags`:

```json
{
    "reportsEnabled": false,
    "budgetRecalculationEnabled": false,
    "balanceModeEnabled": false
}
```

This persists across browser sessions and is user-specific (per browser/device).

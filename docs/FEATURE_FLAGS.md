# Feature Flags System

## Overview

Feature flags allow you to enable/disable experimental or beta features without deploying new code. Users can opt-in to experimental features through the Settings page.

## Architecture

-   **Context**: `FeatureFlagContext.jsx` - Global state management with localStorage persistence
-   **Hook**: `useFeatureFlag()` - Access feature flags in any component
-   **UI**: Settings page → Preferences tab → Experimental Features section

## Usage

### Check if a feature is enabled

```jsx
import { useFeatureFlag } from "../contexts/FeatureFlagContext";

function MyComponent() {
    const { isEnabled, experimentalEnabled } = useFeatureFlag();

    return (
        <div>
            {experimentalEnabled && <div>🚀 Experimental Feature!</div>}

            {isEnabled("specificFeature") && (
                <div>Specific feature enabled</div>
            )}
        </div>
    );
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
              experimentalFeaturesEnabled: false,
              newFeatureName: false, // Add your flag here
          };
});
```

2. **Add toggle in Settings page** (`Settings.jsx` - Preferences tab, Experimental Features section):

```jsx
{
    flags.experimentalFeaturesEnabled && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border ml-4">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                        New Feature Name
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        NEW
                    </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Feature description
                </p>
            </div>
            <button
                onClick={() => toggleFlag("newFeatureName")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    flags.newFeatureName ? "bg-bloom-pink" : "bg-gray-300"
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        flags.newFeatureName ? "translate-x-6" : "translate-x-1"
                    }`}
                />
            </button>
        </div>
    );
}
```

3. **Use in components**:

```jsx
const { isEnabled } = useFeatureFlag();

{
    isEnabled("newFeatureName") && <NewFeatureComponent />;
}
```

## Current Flags

### `experimentalFeaturesEnabled`

-   **Type**: Master toggle
-   **Description**: Enables all experimental features
-   **Default**: `false`
-   **Access**: Settings → Preferences → Experimental Features

### `multiCurrencyEnabled`

-   **Type**: Sub-feature flag (requires `experimentalFeaturesEnabled`)
-   **Description**: Enables currency selection for expenses and income
-   **Default**: `false`
-   **Access**: Settings → Preferences → Experimental Features → Multi-Currency Support

## Best Practices

1. **Always provide warnings**: Experimental features should show clear warnings
2. **Graceful degradation**: Features should fail gracefully if disabled
3. **Clean up old flags**: Remove flags once features are stable and merged to main
4. **Test both states**: Test with flags ON and OFF
5. **Document new flags**: Add to this file when creating new flags

## Example: Adding a Beta Feature

```jsx
// 1. In your component
import { useFeatureFlag } from "../contexts/FeatureFlagContext";

function Dashboard() {
    const { experimentalEnabled } = useFeatureFlag();

    return (
        <div>
            {experimentalEnabled && (
                <div className="bg-yellow-100 border border-yellow-400 p-4">
                    <span className="font-bold">BETA:</span> New Budget
                    Analytics
                    <BetaBudgetAnalytics />
                </div>
            )}
        </div>
    );
}
```

## Storage

Feature flags are stored in `localStorage` under the key `feature_flags`:

```json
{
    "experimentalFeaturesEnabled": false
}
```

This persists across browser sessions and is user-specific (per browser/device).

## Alternative: URL Parameters (Future Enhancement)

Could add support for enabling features via URL:

```
https://bloom-app.com/dashboard?features=betaAnalytics,newUI
```

This would be useful for:

-   QA testing specific feature combinations
-   Support debugging
-   Temporary feature access without changing settings

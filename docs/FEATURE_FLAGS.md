# Feature Flags System

## Overview

Feature flags allow you to enable/disable experimental or beta features without deploying new code. Users can opt-in to experimental features through the dashboard settings.

## Architecture

- **Context**: `FeatureFlagContext.jsx` - Global state management with localStorage persistence
- **Hook**: `useFeatureFlag()` - Access feature flags in any component
- **UI**: `ExperimentalFeaturesModal.jsx` - User-facing toggle interface

## Usage

### Check if a feature is enabled

```jsx
import { useFeatureFlag } from '../contexts/FeatureFlagContext'

function MyComponent() {
  const { isEnabled, experimentalEnabled } = useFeatureFlag()

  return (
    <div>
      {experimentalEnabled && (
        <div>🚀 Experimental Feature!</div>
      )}

      {isEnabled('specificFeature') && (
        <div>Specific feature enabled</div>
      )}
    </div>
  )
}
```

### Add a new feature flag

1. **Update the context** (`FeatureFlagContext.jsx`):
```jsx
const [flags, setFlags] = useState(() => {
  const stored = localStorage.getItem('feature_flags')
  return stored ? JSON.parse(stored) : {
    experimentalFeaturesEnabled: false,
    newFeatureName: false  // Add your flag here
  }
})
```

2. **Add toggle in the modal** (`ExperimentalFeaturesModal.jsx`):
```jsx
<div className="border border-gray-200 rounded-lg p-4">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-semibold">New Feature Name</h3>
      <p className="text-sm text-gray-600">Feature description</p>
    </div>
    <input
      type="checkbox"
      checked={flags.newFeatureName}
      onChange={() => toggleFlag('newFeatureName')}
    />
  </div>
</div>
```

3. **Use in components**:
```jsx
const { isEnabled } = useFeatureFlag()

{isEnabled('newFeatureName') && (
  <NewFeatureComponent />
)}
```

## Current Flags

### `experimentalFeaturesEnabled`
- **Type**: Master toggle
- **Description**: Enables all experimental features
- **Default**: `false`
- **Access**: User menu → "⚗️ Experimental Features"

## Best Practices

1. **Always provide warnings**: Experimental features should show clear warnings
2. **Graceful degradation**: Features should fail gracefully if disabled
3. **Clean up old flags**: Remove flags once features are stable and merged to main
4. **Test both states**: Test with flags ON and OFF
5. **Document new flags**: Add to this file when creating new flags

## Example: Adding a Beta Feature

```jsx
// 1. In your component
import { useFeatureFlag } from '../contexts/FeatureFlagContext'

function Dashboard() {
  const { experimentalEnabled } = useFeatureFlag()

  return (
    <div>
      {experimentalEnabled && (
        <div className="bg-yellow-100 border border-yellow-400 p-4">
          <span className="font-bold">BETA:</span> New Budget Analytics
          <BetaBudgetAnalytics />
        </div>
      )}
    </div>
  )
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
- QA testing specific feature combinations
- Support debugging
- Temporary feature access without changing settings

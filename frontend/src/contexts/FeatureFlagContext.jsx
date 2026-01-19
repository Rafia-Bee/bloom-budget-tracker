/**
 * Bloom - Feature Flag Context
 *
 * Manages experimental feature flags with local storage persistence.
 * Provides useFeatureFlag hook for checking if features are enabled.
 *
 * SECURITY NOTE: Feature flags are stored in localStorage and can be manipulated
 * by users via browser DevTools. This is an accepted limitation for this personal
 * app. For production apps with sensitive features, implement server-side validation.
 * Current flags control UI/UX features only, not security-sensitive operations.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const FeatureFlagContext = createContext();

// Default flags - new flags MUST be added here with default value
const DEFAULT_FLAGS = {
    budgetRecalculationEnabled: false,
    flexibleSubPeriodsEnabled: false,
    reportsEnabled: false,
    balanceModeEnabled: false, // Issue #149 - Balance mode toggle
    recurringIncomeEnabled: false, // Issue #177 - Recurring Income feature
};

export function FeatureFlagProvider({ children }) {
    const [flags, setFlags] = useState(() => {
        const stored = localStorage.getItem('feature_flags');
        if (stored) {
            // Merge stored flags with defaults to ensure new flags are included
            const storedFlags = JSON.parse(stored);
            return { ...DEFAULT_FLAGS, ...storedFlags };
        }
        return DEFAULT_FLAGS;
    });

    useEffect(() => {
        localStorage.setItem('feature_flags', JSON.stringify(flags));
    }, [flags]);

    const toggleFlag = (flagName) => {
        setFlags((prev) => ({
            ...prev,
            [flagName]: !prev[flagName],
        }));
    };

    const isEnabled = (flagName) => {
        return flags[flagName] || false;
    };

    const value = {
        flags,
        toggleFlag,
        isEnabled,
    };

    return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}

export function useFeatureFlag() {
    const context = useContext(FeatureFlagContext);
    if (!context) {
        throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
    }
    return context;
}

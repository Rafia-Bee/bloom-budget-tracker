/**
 * SalaryPeriodContext - Centralized caching for current salary period data
 *
 * Provides cached access to current salary period to avoid redundant API calls
 * from Dashboard, Debts, and Reports pages. Data is loaded once and shared
 * across all consumers.
 *
 * Usage:
 *   const { currentPeriod, salaryPeriodData, loading, refresh } = useSalaryPeriod();
 *
 * Optimization: Components use cached data instead of fetching independently.
 * Issue #164 - Dashboard API call optimization (Phase 3)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { salaryPeriodAPI } from '../api';
import { logError } from '../utils/logger';

const SalaryPeriodContext = createContext();

export function SalaryPeriodProvider({ children, isAuthenticated = false }) {
    // Current salary period data (from /salary-periods/current)
    const [salaryPeriodData, setSalaryPeriodData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);

    // Load current salary period when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadCurrentPeriod();
        } else {
            // Reset on logout
            setSalaryPeriodData(null);
            setLoaded(false);
            setError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const loadCurrentPeriod = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const response = await salaryPeriodAPI.getCurrent();
            setSalaryPeriodData(response.data || null);
            setLoaded(true);
        } catch (err) {
            // 404 means no salary period exists yet - this is not an error
            if (err.response?.status !== 404) {
                logError('SalaryPeriodContext.loadCurrentPeriod', err);
                setError(err.message || 'Failed to load salary period');
            }
            setSalaryPeriodData(null);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Force refresh current salary period cache
     * Call after operations that modify salary period data:
     * - Creating/updating salary period
     * - Adding/editing income or expenses
     * - Changing balance mode
     */
    const refresh = useCallback(async () => {
        setLoaded(false);
        await loadCurrentPeriod();
    }, []);

    /**
     * Ensure current period is loaded (lazy load if not yet loaded)
     */
    const ensureLoaded = useCallback(async () => {
        if (!loaded && !loading) {
            await loadCurrentPeriod();
        }
    }, [loaded, loading]);

    // Derived data for convenience
    const currentPeriod = salaryPeriodData?.salary_period || null;
    const currentWeek = salaryPeriodData?.current_week || null;

    const value = {
        // Raw data from API
        salaryPeriodData,

        // Convenience accessors
        currentPeriod,
        currentWeek,

        // State
        loading,
        loaded,
        error,

        // Actions
        refresh,
        ensureLoaded,
    };

    return <SalaryPeriodContext.Provider value={value}>{children}</SalaryPeriodContext.Provider>;
}

/**
 * Hook to access salary period context
 * @returns {Object} Salary period context value
 */
export function useSalaryPeriod() {
    const context = useContext(SalaryPeriodContext);
    if (!context) {
        throw new Error('useSalaryPeriod must be used within a SalaryPeriodProvider');
    }
    return context;
}

export default SalaryPeriodContext;

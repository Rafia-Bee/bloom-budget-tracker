/**
 * SharedDataContext - Centralized caching for frequently-accessed data
 *
 * Provides cached access to debts, goals, and subcategories to avoid redundant
 * API calls from multiple modals and components. Data is loaded once and shared
 * across all consumers.
 *
 * Usage:
 *   const { debts, goals, subcategories, refreshDebts, refreshGoals } = useSharedData();
 *
 * Optimization: Components use cached data instead of fetching independently.
 * Issue #164 - Dashboard API call optimization
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { debtAPI, goalAPI, subcategoryAPI } from '../api';
import { logError } from '../utils/logger';

const SharedDataContext = createContext();

export function SharedDataProvider({ children, isAuthenticated = false }) {
    // Debts cache
    const [debts, setDebts] = useState([]);
    const [debtsLoading, setDebtsLoading] = useState(false);
    const [debtsLoaded, setDebtsLoaded] = useState(false);

    // Goals cache
    const [goals, setGoals] = useState([]);
    const [goalsLoading, setGoalsLoading] = useState(false);
    const [goalsLoaded, setGoalsLoaded] = useState(false);

    // Subcategories cache
    const [subcategories, setSubcategories] = useState({});
    const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
    const [subcategoriesLoaded, setSubcategoriesLoaded] = useState(false);

    // Load all data when authenticated
    useEffect(() => {
        const loadAllData = async () => {
            await Promise.all([
                loadDebtsInternal(),
                loadGoalsInternal(),
                loadSubcategoriesInternal(),
            ]);
        };

        if (isAuthenticated) {
            loadAllData();
        } else {
            // Reset on logout
            setDebts([]);
            setGoals([]);
            setSubcategories({});
            setDebtsLoaded(false);
            setGoalsLoaded(false);
            setSubcategoriesLoaded(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const loadDebtsInternal = async () => {
        setDebtsLoading(true);
        try {
            const response = await debtAPI.getAll();
            setDebts(response.data || []);
            setDebtsLoaded(true);
        } catch (err) {
            logError('SharedDataContext.loadDebts', err);
        } finally {
            setDebtsLoading(false);
        }
    };

    const loadGoalsInternal = async () => {
        setGoalsLoading(true);
        try {
            const response = await goalAPI.getAll();
            const goalsData = response.data?.goals || response.data || [];
            setGoals(goalsData);
            setGoalsLoaded(true);
        } catch (err) {
            logError('SharedDataContext.loadGoals', err);
        } finally {
            setGoalsLoading(false);
        }
    };

    const loadSubcategoriesInternal = async () => {
        setSubcategoriesLoading(true);
        try {
            const response = await subcategoryAPI.getAll();
            const subData = response.data?.subcategories || response.data || {};
            setSubcategories(subData);
            setSubcategoriesLoaded(true);
        } catch (err) {
            logError('SharedDataContext.loadSubcategories', err);
        } finally {
            setSubcategoriesLoading(false);
        }
    };

    const loadDebts = useCallback(async () => {
        if (debtsLoading) return;
        await loadDebtsInternal();
    }, [debtsLoading]);

    const loadGoals = useCallback(async () => {
        if (goalsLoading) return;
        await loadGoalsInternal();
    }, [goalsLoading]);

    const loadSubcategories = useCallback(async () => {
        if (subcategoriesLoading) return;
        await loadSubcategoriesInternal();
    }, [subcategoriesLoading]);

    /**
     * Force refresh debts cache (call after CRUD operations)
     */
    const refreshDebts = useCallback(async () => {
        setDebtsLoaded(false);
        await loadDebts();
    }, [loadDebts]);

    /**
     * Force refresh goals cache (call after CRUD operations)
     */
    const refreshGoals = useCallback(async () => {
        setGoalsLoaded(false);
        await loadGoals();
    }, [loadGoals]);

    /**
     * Force refresh subcategories cache (call after CRUD operations)
     */
    const refreshSubcategories = useCallback(async () => {
        setSubcategoriesLoaded(false);
        await loadSubcategories();
    }, [loadSubcategories]);

    /**
     * Ensure debts are loaded (lazy load if not yet loaded)
     */
    const ensureDebtsLoaded = useCallback(async () => {
        if (!debtsLoaded && !debtsLoading) {
            await loadDebts();
        }
    }, [debtsLoaded, debtsLoading, loadDebts]);

    /**
     * Ensure goals are loaded (lazy load if not yet loaded)
     */
    const ensureGoalsLoaded = useCallback(async () => {
        if (!goalsLoaded && !goalsLoading) {
            await loadGoals();
        }
    }, [goalsLoaded, goalsLoading, loadGoals]);

    /**
     * Ensure subcategories are loaded (lazy load if not yet loaded)
     */
    const ensureSubcategoriesLoaded = useCallback(async () => {
        if (!subcategoriesLoaded && !subcategoriesLoading) {
            await loadSubcategories();
        }
    }, [subcategoriesLoaded, subcategoriesLoading, loadSubcategories]);

    const value = {
        // Data
        debts,
        goals,
        subcategories,

        // Loading states
        debtsLoading,
        goalsLoading,
        subcategoriesLoading,

        // Loaded flags
        debtsLoaded,
        goalsLoaded,
        subcategoriesLoaded,

        // Refresh methods (force reload)
        refreshDebts,
        refreshGoals,
        refreshSubcategories,

        // Ensure methods (lazy load if needed)
        ensureDebtsLoaded,
        ensureGoalsLoaded,
        ensureSubcategoriesLoaded,
    };

    return <SharedDataContext.Provider value={value}>{children}</SharedDataContext.Provider>;
}

export function useSharedData() {
    const context = useContext(SharedDataContext);
    if (!context) {
        throw new Error('useSharedData must be used within a SharedDataProvider');
    }
    return context;
}

export default SharedDataContext;

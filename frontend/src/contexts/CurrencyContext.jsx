/**
 * CurrencyContext - Global currency state management
 *
 * Provides the user's default currency and exchange rates to all components.
 * Components can use this to format amounts in the user's preferred currency.
 * Only fetches user settings when authenticated to prevent 401 spam.
 *
 * Uses localStorage to cache currency preference for instant display on refresh.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userAPI, currencyAPI } from '../api';
import { logError, logWarn } from '../utils/logger';

const CurrencyContext = createContext();

const CURRENCY_STORAGE_KEY = 'bloom_default_currency';
const RATES_STORAGE_KEY = 'bloom_exchange_rates';

export function CurrencyProvider({ children, isAuthenticated = false }) {
    // Initialize from localStorage for instant display, fallback to EUR
    const [defaultCurrency, setDefaultCurrency] = useState(() => {
        try {
            return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'EUR';
        } catch {
            return 'EUR';
        }
    });
    const [exchangeRates, setExchangeRates] = useState(() => {
        try {
            const cached = localStorage.getItem(RATES_STORAGE_KEY);
            return cached ? JSON.parse(cached) : {};
        } catch {
            return {};
        }
    });
    const [loading, setLoading] = useState(true);
    const [ratesLoading, setRatesLoading] = useState(false);

    // Load user's default currency when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadDefaultCurrency();
        } else {
            // Use EUR default for unauthenticated users
            setDefaultCurrency('EUR');
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Load exchange rates when default currency changes
    useEffect(() => {
        if (defaultCurrency) {
            loadExchangeRates(defaultCurrency);
        }
    }, [defaultCurrency]);

    // Persist currency to localStorage when it changes
    useEffect(() => {
        try {
            localStorage.setItem(CURRENCY_STORAGE_KEY, defaultCurrency);
        } catch {
            // localStorage might be unavailable (private browsing, etc.)
        }
    }, [defaultCurrency]);

    // Persist rates to localStorage when they change
    useEffect(() => {
        try {
            if (Object.keys(exchangeRates).length > 0) {
                localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(exchangeRates));
            }
        } catch {
            // localStorage might be unavailable
        }
    }, [exchangeRates]);

    const loadDefaultCurrency = async () => {
        try {
            const response = await userAPI.getDefaultCurrency();
            const currency = response.data.default_currency || 'EUR';
            setDefaultCurrency(currency);
        } catch (err) {
            logWarn('Failed to load default currency, using cached or EUR', err);
            // Keep current value (from localStorage) instead of resetting to EUR
        } finally {
            setLoading(false);
        }
    };

    const loadExchangeRates = async (baseCurrency) => {
        setRatesLoading(true);
        try {
            const response = await currencyAPI.getRates(baseCurrency);
            setExchangeRates(response.data.rates || {});
        } catch (err) {
            logWarn('Failed to load exchange rates', err);
            // Keep cached rates instead of clearing
        } finally {
            setRatesLoading(false);
        }
    };

    /**
     * Update the default currency (called from Settings)
     * Does NOT trigger exchange rate reload (display-only mode)
     */
    const updateDefaultCurrency = useCallback(async (newCurrency) => {
        try {
            await userAPI.updateDefaultCurrency(newCurrency);
            setDefaultCurrency(newCurrency);
            return true;
        } catch (err) {
            logError('updateDefaultCurrency', err);
            throw err;
        }
    }, []);

    /**
     * Convert amount from one currency to another
     * @param {number} amountCents - Amount in cents
     * @param {string} fromCurrency - Source currency code
     * @param {string} toCurrency - Target currency code (defaults to defaultCurrency)
     * @returns {number} Converted amount in cents
     */
    const convertAmount = useCallback(
        (amountCents, fromCurrency, toCurrency = defaultCurrency) => {
            if (!amountCents || fromCurrency === toCurrency) {
                return amountCents;
            }

            // If we have a direct rate from the API (rates are relative to defaultCurrency)
            // We need to convert: fromCurrency -> defaultCurrency -> toCurrency
            if (fromCurrency === defaultCurrency) {
                // Converting FROM default currency TO another currency
                const rate = exchangeRates[toCurrency];
                if (rate) {
                    return Math.round(amountCents * rate);
                }
            } else if (toCurrency === defaultCurrency) {
                // Converting TO default currency (most common case)
                const rate = exchangeRates[fromCurrency];
                if (rate) {
                    return Math.round(amountCents / rate);
                }
            } else {
                // Cross-currency conversion: from -> default -> to
                const fromRate = exchangeRates[fromCurrency];
                const toRate = exchangeRates[toCurrency];
                if (fromRate && toRate) {
                    const inDefault = amountCents / fromRate;
                    return Math.round(inDefault * toRate);
                }
            }

            // Fallback: return original amount if conversion not possible
            return amountCents;
        },
        [defaultCurrency, exchangeRates]
    );

    /**
     * Refresh exchange rates (useful after being offline)
     */
    const refreshRates = useCallback(async () => {
        await loadExchangeRates(defaultCurrency);
    }, [defaultCurrency]);

    const value = {
        defaultCurrency,
        exchangeRates,
        loading,
        ratesLoading,
        updateDefaultCurrency,
        convertAmount,
        refreshRates,
    };

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

export default CurrencyContext;

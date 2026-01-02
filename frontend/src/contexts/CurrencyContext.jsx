/**
 * CurrencyContext - Global currency state management
 *
 * Provides the user's default currency and exchange rates to all components.
 * Components can use this to format amounts in the user's preferred currency.
 * Only fetches user settings when authenticated to prevent 401 spam.
 * Respects the multiCurrencyEnabled feature flag - defaults to EUR when disabled.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userAPI, currencyAPI } from '../api';
import { logError, logWarn } from '../utils/logger';
import { useFeatureFlag } from './FeatureFlagContext';

const CurrencyContext = createContext();

export function CurrencyProvider({ children, isAuthenticated = false }) {
    const [defaultCurrency, setDefaultCurrency] = useState('EUR');
    const [exchangeRates, setExchangeRates] = useState({});
    const [loading, setLoading] = useState(true);
    const [ratesLoading, setRatesLoading] = useState(false);
    const { isEnabled } = useFeatureFlag();
    const multiCurrencyEnabled = isEnabled('multiCurrencyEnabled');

    // Load user's default currency only when authenticated and multi-currency is enabled
    useEffect(() => {
        if (!multiCurrencyEnabled) {
            // Feature flag disabled - always use EUR
            setDefaultCurrency('EUR');
            setLoading(false);
            return;
        }

        if (isAuthenticated) {
            loadDefaultCurrency();
        } else {
            // Use EUR default for unauthenticated users
            setDefaultCurrency('EUR');
            setLoading(false);
        }
    }, [isAuthenticated, multiCurrencyEnabled]);

    // Load exchange rates when default currency changes (only if multi-currency enabled)
    useEffect(() => {
        if (defaultCurrency && multiCurrencyEnabled) {
            loadExchangeRates(defaultCurrency);
        }
    }, [defaultCurrency, multiCurrencyEnabled]);

    const loadDefaultCurrency = async () => {
        try {
            const response = await userAPI.getDefaultCurrency();
            setDefaultCurrency(response.data.default_currency || 'EUR');
        } catch (err) {
            logWarn('Failed to load default currency, using EUR', err);
            setDefaultCurrency('EUR');
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
            setExchangeRates({});
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
     * If multi-currency is disabled, always returns the original amount (no conversion).
     * @param {number} amountCents - Amount in cents
     * @param {string} fromCurrency - Source currency code
     * @param {string} toCurrency - Target currency code (defaults to defaultCurrency)
     * @returns {number} Converted amount in cents
     */
    const convertAmount = useCallback(
        (amountCents, fromCurrency, toCurrency = defaultCurrency) => {
            // If multi-currency is disabled, skip conversion entirely
            if (!multiCurrencyEnabled) {
                return amountCents;
            }

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
        [defaultCurrency, exchangeRates, multiCurrencyEnabled]
    );

    /**
     * Refresh exchange rates (useful after being offline)
     */
    const refreshRates = useCallback(async () => {
        if (multiCurrencyEnabled) {
            await loadExchangeRates(defaultCurrency);
        }
    }, [defaultCurrency, multiCurrencyEnabled]);

    const value = {
        defaultCurrency,
        exchangeRates,
        loading,
        ratesLoading,
        updateDefaultCurrency,
        convertAmount,
        refreshRates,
        multiCurrencyEnabled,
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

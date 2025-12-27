/**
 * CurrencySelector Component
 *
 * Reusable dropdown for selecting currencies in transaction forms.
 * Shows currency code and name (text only, no flags).
 */

import { useState, useEffect } from "react";
import { currencyAPI } from "../api";
import { logWarn } from "../utils/logger";
import { CURRENCY_INFO } from "../utils/formatters";

function CurrencySelector({
    value = "EUR",
    onChange,
    disabled = false,
    className = "",
    showLabel = true,
    label = "Currency",
    compact = false,
}) {
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCurrencies();
    }, []);

    const loadCurrencies = async () => {
        try {
            const response = await currencyAPI.getSupportedCurrencies();
            setCurrencies(response.data.currencies || []);
        } catch (err) {
            // Fallback to local currency info if API fails
            logWarn("Failed to load currencies from API, using fallback", err);
            setCurrencies(
                Object.keys(CURRENCY_INFO).map((code) => ({
                    code,
                    name: CURRENCY_INFO[code].name,
                    symbol: CURRENCY_INFO[code].symbol,
                }))
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value);
        }
    };

    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-10 bg-gray-200 dark:bg-dark-elevated rounded" />
            </div>
        );
    }

    // Compact mode: just show the dropdown without label
    if (compact) {
        return (
            <select
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className={`
                    px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-dark-surface text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-pink-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${className}
                `}
            >
                {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                        {currency.code}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <div className={className}>
            {showLabel && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                </label>
            )}
            <select
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className={`
                    w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-dark-surface text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-pink-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
            >
                {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default CurrencySelector;

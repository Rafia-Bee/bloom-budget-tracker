/**
 * Currency formatting utilities for Bloom Budget Tracker
 *
 * All amounts are stored as integer cents (1500 = €15.00).
 * These utilities handle conversion to display format.
 *
 * Default currency is EUR, but supports multi-currency display.
 */

/**
 * Currency metadata for supported currencies
 */
export const CURRENCY_INFO = {
    EUR: { name: "Euro", symbol: "€", flag: "🇪🇺", locale: "de-DE" },
    USD: { name: "US Dollar", symbol: "$", flag: "🇺🇸", locale: "en-US" },
    GBP: { name: "British Pound", symbol: "£", flag: "🇬🇧", locale: "en-GB" },
    PLN: { name: "Polish Złoty", symbol: "zł", flag: "🇵🇱", locale: "pl-PL" },
    SEK: { name: "Swedish Krona", symbol: "kr", flag: "🇸🇪", locale: "sv-SE" },
    NOK: { name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴", locale: "nb-NO" },
    CHF: { name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭", locale: "de-CH" },
    DKK: { name: "Danish Krone", symbol: "kr", flag: "🇩🇰", locale: "da-DK" },
};

/**
 * Default locale for number formatting
 */
const DEFAULT_LOCALE = "en-GB";

/**
 * Format amount in cents to currency display string
 *
 * @param {number} cents - Amount in cents (integer)
 * @param {string} currency - ISO 4217 currency code (default: 'EUR')
 * @param {object} options - Formatting options
 * @param {boolean} options.showSymbol - Whether to show currency symbol (default: true)
 * @param {boolean} options.compact - Use compact notation for large numbers (default: false)
 * @returns {string} Formatted currency string (e.g., "€15.00")
 */
export const formatCurrency = (cents, currency = "EUR", options = {}) => {
    const { showSymbol = true, compact = false } = options;

    if (cents === null || cents === undefined || isNaN(cents)) {
        return showSymbol ? `${getCurrencySymbol(currency)}0.00` : "0.00";
    }

    const euros = cents / 100;
    const locale = CURRENCY_INFO[currency]?.locale || DEFAULT_LOCALE;

    const formatOptions = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };

    if (showSymbol) {
        formatOptions.style = "currency";
        formatOptions.currency = currency;
    }

    if (compact && Math.abs(euros) >= 10000) {
        formatOptions.notation = "compact";
        formatOptions.maximumFractionDigits = 1;
    }

    return euros.toLocaleString(locale, formatOptions);
};

/**
 * Format amount with original and converted currencies
 * Shows both values when currencies differ
 *
 * @param {number} originalCents - Original amount in cents
 * @param {string} originalCurrency - Original currency code
 * @param {number} convertedCents - Converted amount in cents (optional)
 * @param {string} baseCurrency - User's base currency (default: 'EUR')
 * @returns {string} Formatted string (e.g., "€15.00" or "$16.50 (≈ €15.00)")
 */
export const formatWithConversion = (
    originalCents,
    originalCurrency,
    convertedCents = null,
    baseCurrency = "EUR"
) => {
    if (originalCurrency === baseCurrency || !convertedCents) {
        return formatCurrency(originalCents, originalCurrency);
    }

    const original = formatCurrency(originalCents, originalCurrency);
    const converted = formatCurrency(convertedCents, baseCurrency);

    return `${original} (≈ ${converted})`;
};

/**
 * Get currency symbol for a currency code
 *
 * @param {string} currency - ISO 4217 currency code
 * @returns {string} Currency symbol (e.g., '€', '$', '£')
 */
export const getCurrencySymbol = (currency) => {
    return CURRENCY_INFO[currency]?.symbol || currency;
};

/**
 * Get currency flag emoji for a currency code
 *
 * @param {string} currency - ISO 4217 currency code
 * @returns {string} Flag emoji (e.g., '🇪🇺', '🇺🇸')
 */
export const getCurrencyFlag = (currency) => {
    return CURRENCY_INFO[currency]?.flag || "";
};

/**
 * Get full currency name for a currency code
 *
 * @param {string} currency - ISO 4217 currency code
 * @returns {string} Currency name (e.g., 'Euro', 'US Dollar')
 */
export const getCurrencyName = (currency) => {
    return CURRENCY_INFO[currency]?.name || currency;
};

/**
 * Format currency display with flag
 *
 * @param {string} currency - ISO 4217 currency code
 * @returns {string} Display string (e.g., '🇪🇺 EUR - Euro')
 */
export const formatCurrencyOption = (currency) => {
    const info = CURRENCY_INFO[currency];
    if (!info) return currency;
    return `${info.flag} ${currency} - ${info.name}`;
};

/**
 * Parse currency input string to cents
 * Handles various formats: "15", "15.00", "15,00", "€15.00", etc.
 *
 * @param {string} value - Input string
 * @returns {number|null} Amount in cents, or null if invalid
 */
export const parseCurrencyInput = (value) => {
    if (!value) return null;

    // Remove currency symbols and whitespace
    let cleaned = value
        .toString()
        .replace(/[€$£¥₹kr\s]/gi, "")
        .trim();

    // Handle European format (comma as decimal separator)
    // If there's a comma followed by exactly 2 digits at the end, treat as decimal
    if (/,\d{2}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
        // Remove any commas used as thousand separators
        cleaned = cleaned.replace(/,/g, "");
    }

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;

    // Convert to cents
    return Math.round(parsed * 100);
};

/**
 * Format cents input for display in form fields
 * Converts cents to euros with 2 decimal places
 *
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted string for input field (e.g., "15.00")
 */
export const formatCentsForInput = (cents) => {
    if (cents === null || cents === undefined || isNaN(cents)) {
        return "";
    }
    return (cents / 100).toFixed(2);
};

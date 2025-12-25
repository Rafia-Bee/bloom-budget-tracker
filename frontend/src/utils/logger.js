/**
 * Secure Logger Utility
 *
 * Environment-aware logging that prevents sensitive data exposure in production.
 * In development: Full error details for debugging
 * In production: Generic messages only, no sensitive data
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Sanitize error objects to remove potentially sensitive data
 * @param {Error|Object} error - The error object to sanitize
 * @returns {Object} Sanitized error info
 */
const sanitizeError = (error) => {
    if (!error) return { message: "Unknown error" };

    return {
        message: error.message || "Request failed",
        status: error.response?.status,
        statusText: error.response?.statusText,
        // Intentionally excluding: headers, config, request, response.data
    };
};

/**
 * Log API/operation errors
 * In dev: Shows full error details
 * In prod: Shows only operation name
 *
 * @param {string} operation - Name of the operation that failed (e.g., 'loadExpenses')
 * @param {Error} error - The error object
 */
export const logError = (operation, error) => {
    if (isDevelopment) {
        // eslint-disable-next-line no-console
        console.error(`[${operation}] Error:`, error);
    } else if (isProduction) {
        // Production: Only log sanitized info
        const sanitized = sanitizeError(error);
        // eslint-disable-next-line no-console
        console.error(`Error in ${operation}: ${sanitized.message}`);
    }
};

/**
 * Log warnings (only in development)
 *
 * @param {string} message - Warning message
 * @param {*} data - Optional additional data
 */
export const logWarn = (message, data = null) => {
    if (isDevelopment) {
        if (data) {
            // eslint-disable-next-line no-console
            console.warn(message, data);
        } else {
            // eslint-disable-next-line no-console
            console.warn(message);
        }
    }
    // No warnings in production
};

/**
 * Log info messages (only in development)
 *
 * @param {string} message - Info message
 * @param {*} data - Optional additional data
 */
export const logInfo = (message, data = null) => {
    if (isDevelopment) {
        if (data) {
            // eslint-disable-next-line no-console
            console.info(message, data);
        } else {
            // eslint-disable-next-line no-console
            console.info(message);
        }
    }
};

/**
 * Log debug messages (only in development)
 *
 * @param {string} message - Debug message
 * @param {*} data - Optional additional data
 */
export const logDebug = (message, data = null) => {
    if (isDevelopment) {
        if (data) {
            // eslint-disable-next-line no-console
            console.debug(message, data);
        } else {
            // eslint-disable-next-line no-console
            console.debug(message);
        }
    }
};

// Default export for convenient importing
export default {
    error: logError,
    warn: logWarn,
    info: logInfo,
    debug: logDebug,
};

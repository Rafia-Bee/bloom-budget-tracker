/**
 * Date formatting utilities for Bloom Budget Tracker
 *
 * All dates in the app use UK format with comma: "24 Dec, 2025"
 * The app locale is set to 'en-GB' in index.html
 *
 * IMPORTANT: HTML <input type="date"> fields always:
 * - Store dates as YYYY-MM-DD (ISO format)
 * - Display format depends on browser/OS locale (cannot be controlled by app)
 *
 * These utilities ensure consistent display formatting throughout the app.
 */

const LOCALE = 'en-GB';

/**
 * Format date as "24 Dec, 2025" (with comma before year)
 * This is the standard format used throughout the app
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString(LOCALE, { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
};

/**
 * Format date as "24 Dec" (without year)
 */
export const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString(LOCALE, { month: 'short' });
    return `${day} ${month}`;
};

/**
 * Format date as "24/12/2025"
 */
export const formatNumericDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

/**
 * Format date as "Tuesday, 24 December 2025"
 */
export const formatLongDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(LOCALE, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Format date range as "24 Dec - 30 Dec 2025"
 */
export const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    return `${formatShortDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Get relative date description ("Today", "Yesterday", "Tomorrow", or formatted date)
 */
export const formatRelativeDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.round((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    return formatDate(dateString);
};

export default {
    formatDate,
    formatShortDate,
    formatNumericDate,
    formatLongDate,
    formatDateRange,
    formatRelativeDate,
    LOCALE,
};

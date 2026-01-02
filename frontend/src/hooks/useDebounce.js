/**
 * useDebounce Hook
 *
 * Delays updating a value until after a specified delay period has passed
 * without the value changing. Useful for search inputs to avoid excessive
 * API calls while user is typing.
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {any} - The debounced value
 *
 * Example:
 *   const [searchTerm, setSearchTerm] = useState('')
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500)
 *
 *   useEffect(() => {
 *     // This only fires 500ms after user stops typing
 *     if (debouncedSearchTerm) {
 *       performSearch(debouncedSearchTerm)
 *     }
 *   }, [debouncedSearchTerm])
 */

import { useState, useEffect } from 'react';

function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if value changes before delay expires
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;

/**
 * Bloom - Test Utilities
 *
 * Helper functions for testing React components.
 */

import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

/**
 * Render component with Router context
 */
export function renderWithRouter(ui, options = {}) {
    return render(ui, {
        wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
        ...options,
    });
}

/**
 * Mock API response
 */
export function mockApiResponse(data, status = 200) {
    return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: async () => data,
        data,
    });
}

/**
 * Mock API error
 */
export function mockApiError(message, status = 500) {
    return Promise.reject({
        response: {
            status,
            data: { error: message },
        },
    });
}

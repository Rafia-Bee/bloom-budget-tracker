/**
 * Bloom - Test Utilities
 *
 * Helper functions for testing React components.
 * Includes wrappers for SharedDataContext, SalaryPeriodContext, and Router.
 */

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SharedDataProvider } from '../contexts/SharedDataContext';
import { SalaryPeriodProvider } from '../contexts/SalaryPeriodContext';

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
 * Render component with SharedDataContext
 * Used for modals that use useSharedData hook
 */
export function renderWithSharedData(ui, options = {}) {
    const { isAuthenticated = false, ...renderOptions } = options;
    return render(ui, {
        wrapper: ({ children }) => (
            <SharedDataProvider isAuthenticated={isAuthenticated}>{children}</SharedDataProvider>
        ),
        ...renderOptions,
    });
}

/**
 * Render component with both Router and SharedDataContext
 */
export function renderWithProviders(ui, options = {}) {
    const { isAuthenticated = false, ...renderOptions } = options;
    return render(ui, {
        wrapper: ({ children }) => (
            <BrowserRouter>
                <SharedDataProvider isAuthenticated={isAuthenticated}>
                    {children}
                </SharedDataProvider>
            </BrowserRouter>
        ),
        ...renderOptions,
    });
}

/**
 * Render component with SalaryPeriodContext
 * Used for components that use useSalaryPeriod hook
 */
export function renderWithSalaryPeriod(ui, options = {}) {
    const { isAuthenticated = false, ...renderOptions } = options;
    return render(ui, {
        wrapper: ({ children }) => (
            <SalaryPeriodProvider isAuthenticated={isAuthenticated}>
                {children}
            </SalaryPeriodProvider>
        ),
        ...renderOptions,
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

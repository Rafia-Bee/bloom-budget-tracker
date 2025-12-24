/**
 * Bloom - Test Setup
 *
 * Configure testing environment for Vitest and React Testing Library.
 * Includes API mocking to prevent network errors during component tests.
 */

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the API module to prevent network requests in tests
vi.mock("../api", () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    debtAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
        getById: vi.fn(() => Promise.resolve({ data: {} })),
        create: vi.fn(() => Promise.resolve({ data: {} })),
        update: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    goalAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: { goals: [] } })),
        create: vi.fn(() => Promise.resolve({ data: {} })),
        update: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
        getProgress: vi.fn(() => Promise.resolve({ data: {} })),
    },
    subcategoryAPI: {
        getAll: vi.fn(() =>
            Promise.resolve({
                data: {
                    subcategories: {
                        "Fixed Expenses": ["Rent", "Utilities", "Insurance"],
                        "Flexible Expenses": [
                            "Food",
                            "Transport",
                            "Entertainment",
                        ],
                        "Savings & Investments": [
                            "Emergency Fund",
                            "Retirement",
                        ],
                        "Debt Payments": ["Credit Card", "Loan"],
                    },
                },
            })
        ),
        create: vi.fn(() => Promise.resolve({ data: {} })),
        update: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    recurringExpenseAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
        create: vi.fn(() => Promise.resolve({ data: {} })),
        update: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
        toggleActive: vi.fn(() => Promise.resolve({ data: {} })),
        toggleFixedBill: vi.fn(() => Promise.resolve({ data: {} })),
        generateNow: vi.fn(() => Promise.resolve({ data: {} })),
        previewUpcoming: vi.fn(() => Promise.resolve({ data: [] })),
    },
    expenseAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
        create: vi.fn(() => Promise.resolve({ data: {} })),
        update: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    incomeAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
        create: vi.fn(() => Promise.resolve({ data: {} })),
        update: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
        getStats: vi.fn(() => Promise.resolve({ data: {} })),
    },
    budgetPeriodAPI: {
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
        getActive: vi.fn(() => Promise.resolve({ data: null })),
        getById: vi.fn(() => Promise.resolve({ data: {} })),
        create: vi.fn(() => Promise.resolve({ data: {} })),
        update: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    salaryPeriodAPI: {
        getCurrent: vi.fn(() => Promise.resolve({ data: null })),
        getAll: vi.fn(() => Promise.resolve({ data: [] })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
    },
    userAPI: {
        deleteAllData: vi.fn(() => Promise.resolve({ data: {} })),
        getRecurringLookahead: vi.fn(() =>
            Promise.resolve({ data: { recurring_lookahead_days: 14 } })
        ),
        updateRecurringLookahead: vi.fn(() => Promise.resolve({ data: {} })),
    },
    authAPI: {
        register: vi.fn(() => Promise.resolve({ data: {} })),
        login: vi.fn(() => Promise.resolve({ data: {} })),
        logout: vi.fn(() => Promise.resolve({ data: {} })),
        getCurrentUser: vi.fn(() => Promise.resolve({ data: null })),
    },
    setLoadingCallback: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

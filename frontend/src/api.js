/**
 * Bloom - API Configuration
 *
 * Axios instance with JWT token handling and API endpoints.
 * Manages authentication headers and automatic token refresh.
 */

import axios from "axios";

// Use environment variable for API URL in production, proxy in development
const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

let loadingCallback = null;

export const setLoadingCallback = (callback) => {
    loadingCallback = callback;
};

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Send cookies with requests (#80 security fix)
});

api.interceptors.request.use((config) => {
    // Remove localStorage token handling - cookies are sent automatically (#80 security fix)
    // config.headers.Authorization = `Bearer ${token}`;  // No longer needed

    config.metadata = { startTime: Date.now() };

    const timeoutId = setTimeout(() => {
        if (loadingCallback) {
            loadingCallback(true);
        }
    }, 500);
    config.metadata.timeoutId = timeoutId;

    return config;
});

api.interceptors.response.use(
    (response) => {
        if (response.config.metadata?.timeoutId) {
            clearTimeout(response.config.metadata.timeoutId);
        }
        if (loadingCallback) {
            loadingCallback(false);
        }
        return response;
    },
    async (error) => {
        if (error.config?.metadata?.timeoutId) {
            clearTimeout(error.config.metadata.timeoutId);
        }
        if (loadingCallback) {
            loadingCallback(false);
        }

        const originalRequest = error.config;

        // Don't redirect if the 401 is from login/register/me endpoints
        // Let the calling code handle authentication failures
        if (
            error.response?.status === 401 &&
            !originalRequest.url.includes("/auth/login") &&
            !originalRequest.url.includes("/auth/register") &&
            !originalRequest.url.includes("/auth/me")
        ) {
            // No need to clear localStorage - cookies are cleared by server (#80 security fix)
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    logout: () => api.post("/auth/logout"), // New logout endpoint (#80)
    getCurrentUser: () => api.get("/auth/me"),
};

export const expenseAPI = {
    getAll: (params) => api.get("/expenses", { params }),
    create: (data) => api.post("/expenses", data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
    getDatesWithTransactions: () =>
        api.get("/expenses/dates-with-transactions"),
};

export const incomeAPI = {
    getAll: (params) => api.get("/income", { params }),
    create: (data) => api.post("/income", data),
    update: (id, data) => api.put(`/income/${id}`, data),
    delete: (id) => api.delete(`/income/${id}`),
    getStats: () => api.get("/income/stats"),
};

export const budgetPeriodAPI = {
    getAll: () => api.get("/budget-periods"),
    getActive: () => api.get("/budget-periods/active"),
    getById: (id) => api.get(`/budget-periods/${id}`),
    create: (data) => api.post("/budget-periods", data),
    update: (id, data) => api.put(`/budget-periods/${id}`, data),
    delete: (id) => api.delete(`/budget-periods/${id}`),
};

export const debtAPI = {
    getAll: (params = {}) => api.get("/debts", { params }),
    getById: (id) => api.get(`/debts/${id}`),
    create: (data) => api.post("/debts", data),
    update: (id, data) => api.put(`/debts/${id}`, data),
    delete: (id) => api.delete(`/debts/${id}`),
};

export const recurringExpenseAPI = {
    getAll: (params = {}) => api.get("/recurring-expenses", { params }),
    getById: (id) => api.get(`/recurring-expenses/${id}`),
    create: (data) => api.post("/recurring-expenses", data),
    update: (id, data) => api.put(`/recurring-expenses/${id}`, data),
    delete: (id) => api.delete(`/recurring-expenses/${id}`),
    toggleActive: (id) => api.put(`/recurring-expenses/${id}/toggle`),
    toggleFixedBill: (id, isFixedBill) =>
        api.patch(`/recurring-expenses/${id}/fixed-bill`, {
            is_fixed_bill: isFixedBill,
        }),
    generateNow: (dryRun = false, daysAhead = null) =>
        api.post(
            `/recurring-generation/generate`,
            {},
            {
                params: {
                    dry_run: dryRun,
                    ...(daysAhead && { days_ahead: daysAhead }),
                },
            }
        ),
    previewUpcoming: (days = null) =>
        api.get(`/recurring-generation/preview`, {
            params: days ? { days } : {},
        }),
};

export const salaryPeriodAPI = {
    getCurrent: () => api.get("/salary-periods/current"),
    getAll: () => api.get("/salary-periods"),
    delete: (id) => api.delete(`/salary-periods/${id}`),
};

export const userAPI = {
    deleteAllData: (confirmation) =>
        api.post("/user-data/delete-all", { confirmation }),
    getRecurringLookahead: () =>
        api.get("/user-data/settings/recurring-lookahead"),
    updateRecurringLookahead: (days) =>
        api.put("/user-data/settings/recurring-lookahead", {
            recurring_lookahead_days: days,
        }),
    getDefaultCurrency: () => api.get("/user-data/settings/default-currency"),
    updateDefaultCurrency: (currency) =>
        api.put("/user-data/settings/default-currency", {
            default_currency: currency,
        }),
};

export const currencyAPI = {
    getSupportedCurrencies: () => api.get("/currencies"),
    getRates: (baseCurrency = "EUR") =>
        api.get("/currencies/rates", { params: { base: baseCurrency } }),
    convert: (amount, fromCurrency, toCurrency, date = null) =>
        api.post("/currencies/convert", {
            amount,
            from_currency: fromCurrency,
            to_currency: toCurrency,
            ...(date && { date }),
        }),
};

export const subcategoryAPI = {
    getAll: (category = null) =>
        api.get("/subcategories", { params: category ? { category } : {} }),
    create: (data) => api.post("/subcategories", data),
    update: (id, data) => api.put(`/subcategories/${id}`, data),
    delete: (id, force = false) =>
        api.delete(`/subcategories/${id}`, { params: { force } }),
};

export const goalAPI = {
    getAll: () => api.get("/goals"),
    create: (data) => api.post("/goals", data),
    update: (id, data) => api.put(`/goals/${id}`, data),
    delete: (id, force = false) =>
        api.delete(`/goals/${id}`, { params: { force } }),
    getProgress: (id) => api.get(`/goals/${id}/progress`),
    getTransactions: (id, page = 1, perPage = 20) =>
        api.get(`/goals/${id}/transactions`, {
            params: { page, per_page: perPage },
        }),
};

export default api;

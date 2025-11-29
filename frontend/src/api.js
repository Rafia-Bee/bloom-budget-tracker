/**
 * Bloom - API Configuration
 *
 * Axios instance with JWT token handling and API endpoints.
 * Manages authentication headers and automatic token refresh.
 */

import axios from "axios";

// Use environment variable for API URL in production, proxy in development
const API_URL = import.meta.env.VITE_API_URL || "/api";

let loadingCallback = null;

export const setLoadingCallback = (callback) => {
    loadingCallback = callback;
};

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

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

        // Don't redirect if the 401 is from login/register endpoints
        if (
            error.response?.status === 401 &&
            !originalRequest.url.includes("/auth/login") &&
            !originalRequest.url.includes("/auth/register")
        ) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    getCurrentUser: () => api.get("/auth/me"),
};

export const expenseAPI = {
    getAll: (params) => api.get("/expenses", { params }),
    create: (data) => api.post("/expenses", data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
};

export const incomeAPI = {
    getAll: (params) => api.get("/income", { params }),
    create: (data) => api.post("/income", data),
    update: (id, data) => api.put(`/income/${id}`, data),
    delete: (id) => api.delete(`/income/${id}`),
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
    generateNow: (dryRun = false, daysAhead = 60) =>
        api.post(
            `/recurring-generation/generate`,
            {},
            { params: { dry_run: dryRun, days_ahead: daysAhead } }
        ),
    previewUpcoming: (days = 30) =>
        api.get(`/recurring-generation/preview`, { params: { days } }),
};

export const salaryPeriodAPI = {
    getCurrent: () => api.get("/salary-periods/current"),
    getAll: () => api.get("/salary-periods"),
    delete: (id) => api.delete(`/salary-periods/${id}`),
};

export default api;

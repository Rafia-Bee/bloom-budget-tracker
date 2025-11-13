/**
 * Bloom - API Configuration
 *
 * Axios instance with JWT token handling and API endpoints.
 * Manages authentication headers and automatic token refresh.
 */

import axios from "axios";

const api = axios.create({
    baseURL: "/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
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

export default api;

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store';

const BASE_URL = __DEV__
    ? 'http://10.0.2.2:3000/api/v1'  // Android emulator
    : 'https://api.vecdoc.app/api/v1';

// Create axios instance
export const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = useAuthStore.getState().refreshToken;
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;
                useAuthStore.getState().setTokens(accessToken, newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// API response types
export interface ApiError {
    error: string;
    validationErrors?: Record<string, string[]>;
}

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ApiError | undefined;
        return data?.error || error.message || 'An error occurred';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}

// Auth API
export const authApi = {
    register: (data: { email: string; password: string; fullName: string; phone?: string }) =>
        api.post('/auth/register', data),

    login: (data: { email?: string; phone?: string; password: string }) =>
        api.post('/auth/login', data),

    logout: (refreshToken: string) =>
        api.post('/auth/logout', { refreshToken }),

    forgotPassword: (email: string) =>
        api.post('/auth/forgot-password', { email }),
};

// User API
export const userApi = {
    getProfile: () => api.get('/users/me'),
    updateProfile: (data: Partial<{ fullName: string; phone: string }>) =>
        api.put('/users/me', data),
    deleteAccount: () => api.delete('/users/me'),
};

// Bikes API
export const bikesApi = {
    getAll: () => api.get('/bikes'),
    getById: (id: string) => api.get(`/bikes/${id}`),
    create: (data: {
        brand: string;
        model: string;
        year: number;
        nickname?: string;
        engineCapacityCc?: number;
        fuelType?: string;
        registrationNumber?: string;
        oilChangeIntervalKm?: number;
        currentOdometerKm?: number;
        isPrimary?: boolean;
    }) => api.post('/bikes', data),
    update: (id: string, data: Partial<{
        brand: string;
        model: string;
        year: number;
        nickname: string;
        oilChangeIntervalKm: number;
        currentOdometerKm: number;
    }>) => api.put(`/bikes/${id}`, data),
    delete: (id: string) => api.delete(`/bikes/${id}`),
    setPrimary: (id: string) => api.put(`/bikes/${id}/set-primary`),
    updateOdometer: (id: string, odometer: number) =>
        api.put(`/bikes/${id}/odometer`, { odometer }),
};

// Documents API
export const documentsApi = {
    getByBike: (bikeId: string) => api.get(`/documents/bike/${bikeId}`),
    getExpiring: (days?: number) => api.get('/documents/expiring', { params: { days } }),
    getById: (id: string) => api.get(`/documents/${id}`),
    create: (bikeId: string, data: {
        documentType: string;
        title: string;
        description?: string;
        issueDate?: string;
        expiryDate?: string;
    }) => api.post(`/documents/bike/${bikeId}`, data),
    update: (id: string, data: Partial<{
        title: string;
        description: string;
        expiryDate: string;
    }>) => api.put(`/documents/${id}`, data),
    delete: (id: string) => api.delete(`/documents/${id}`),
};

// Maintenance API
export const maintenanceApi = {
    getUpcoming: () => api.get('/maintenance/upcoming'),
    getByBike: (bikeId: string, type?: string) =>
        api.get(`/maintenance/bike/${bikeId}`, { params: { type } }),
    create: (bikeId: string, data: {
        maintenanceType: string;
        odometerAtMaintenance: number;
        costAmount?: number;
        serviceCenterName?: string;
        partsUsed?: { name: string; brand?: string; quantity: string }[];
        performedAt?: string;
    }) => api.post(`/maintenance/bike/${bikeId}`, data),
    updateSchedule: (bikeId: string, data: {
        maintenanceType: string;
        intervalKm?: number;
        intervalDays?: number;
        isEnabled?: boolean;
    }) => api.put(`/maintenance/schedule/${bikeId}`, data),
};

// Notifications API
export const notificationsApi = {
    getSettings: () => api.get('/notifications/settings'),
    updateSettings: (data: Partial<{
        pushEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        quietHoursStart: string;
        quietHoursEnd: string;
        documentAlerts: boolean;
        maintenanceAlerts: boolean;
    }>) => api.put('/notifications/settings', data),
    getHistory: (page?: number) => api.get('/notifications', { params: { page } }),
    registerToken: (token: string) => api.post('/notifications/register-token', { token }),
};

import axios from 'axios';
import { useAuthStore } from '../store/auth';

// Base API instance attached to the Django backend
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to inject JWT token and Workspace ID
api.interceptors.request.use((config) => {
    const { token, activeWorkspaceId } = useAuthStore.getState();
    
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (activeWorkspaceId && config.headers) {
        config.headers['X-Workspace-ID'] = activeWorkspaceId;
    }
    return config;
});

// Interceptor to handle 401 Unauthorized (e.g. token refresh logic would go here)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Optionally add refresh token logic here
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

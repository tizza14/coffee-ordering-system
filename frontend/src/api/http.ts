import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';

interface ApiErrorData {
  message?: string;
  code?: string;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<ApiErrorData>).response?.data;
    if (data?.message) return data.message;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

const fallbackApiBaseUrl = import.meta.env.PROD
  ? 'https://coffee-ordering-system-60aw.onrender.com/api'
  : 'http://localhost:3000/api';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? fallbackApiBaseUrl,
  withCredentials: true
});

http.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      config &&
      !config._retry &&
      !config.url?.includes('/auth/refresh')
    ) {
      config._retry = true;
      const authStore = useAuthStore();
      const refreshed = await authStore.tryRefreshTokens();
      if (refreshed) {
        config.headers.Authorization = `Bearer ${authStore.accessToken}`;
        return http.request(config);
      }
      authStore.logout();
    } else if (error.response?.status === 401) {
      const authStore = useAuthStore();
      if (authStore.accessToken) {
        authStore.logout();
      }
    }

    return Promise.reject(error);
  }
);

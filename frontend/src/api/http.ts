import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

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

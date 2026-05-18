import { defineStore } from 'pinia';
import * as authApi from '../api/auth.api';
import { useOrderStore } from './order.store';

const AUTH_STORAGE_KEY = 'coffee-ordering-auth';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: 'user' | 'staff' | 'admin';
  points?: number;
}

interface StoredAuthSession {
  user: AuthUser;
  accessToken: string;
}

function readStoredSession() {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!value) return null;

  try {
    const session = JSON.parse(value) as StoredAuthSession;
    if (!session.user || !session.accessToken) return null;
    return session;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(user: AuthUser, accessToken: string) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ user, accessToken })
  );
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const session = readStoredSession();
    return {
      user: session?.user ?? (null as AuthUser | null),
      accessToken: session?.accessToken ?? ''
    };
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken)
  },
  actions: {
    setSession(user: AuthUser, accessToken: string) {
      this.user = user;
      this.accessToken = accessToken;
      writeStoredSession(user, accessToken);
    },
    async register(payload: authApi.RegisterPayload) {
      const result = await authApi.register(payload);
      this.setSession(result.user, result.accessToken);
    },
    async login(payload: authApi.LoginPayload) {
      const result = await authApi.login(payload);
      useOrderStore().clearOrderLists();
      this.setSession(result.user, result.accessToken);
    },
    async refreshUser() {
      if (!this.accessToken) return;
      try {
        const result = await authApi.getMe();
        this.user = result.user;
        writeStoredSession(result.user, this.accessToken);
      } catch { /* ignore */ }
    },
    logout() {
      useOrderStore().clearOrderLists();
      this.user = null;
      this.accessToken = '';
      clearStoredSession();
    }
  }
});

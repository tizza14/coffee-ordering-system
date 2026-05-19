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
  refreshToken?: string;
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

function writeStoredSession(user: AuthUser, accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ user, accessToken, refreshToken })
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
      accessToken: session?.accessToken ?? '',
      refreshToken: session?.refreshToken ?? ''
    };
  },
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken)
  },
  actions: {
    setSession(user: AuthUser, accessToken: string, refreshToken?: string) {
      this.user = user;
      this.accessToken = accessToken;
      this.refreshToken = refreshToken ?? this.refreshToken;
      writeStoredSession(user, accessToken, this.refreshToken);
    },
    async register(payload: authApi.RegisterPayload) {
      const result = await authApi.register(payload);
      this.setSession(result.user, result.accessToken, result.refreshToken);
    },
    async login(payload: authApi.LoginPayload) {
      const result = await authApi.login(payload);
      useOrderStore().clearOrderLists();
      this.setSession(result.user, result.accessToken, result.refreshToken);
    },
    async refreshUser() {
      if (!this.accessToken) return;
      try {
        const result = await authApi.getMe();
        this.user = result;
        writeStoredSession(result, this.accessToken, this.refreshToken);
      } catch { /* ignore */ }
    },
    async tryRefreshTokens(): Promise<boolean> {
      if (!this.refreshToken) return false;
      try {
        const result = await authApi.refreshAccessToken(this.refreshToken);
        this.setSession(result.user, result.accessToken, result.refreshToken);
        return true;
      } catch {
        return false;
      }
    },
    logout() {
      useOrderStore().clearOrderLists();
      this.user = null;
      this.accessToken = '';
      this.refreshToken = '';
      clearStoredSession();
    }
  }
});

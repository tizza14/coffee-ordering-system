import { defineStore } from 'pinia';
import * as authApi from '../api/auth.api';

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: 'user' | 'staff' | 'admin';
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    accessToken: ''
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken)
  },
  actions: {
    setSession(user: AuthUser, accessToken: string) {
      this.user = user;
      this.accessToken = accessToken;
    },
    async register(payload: authApi.RegisterPayload) {
      const result = await authApi.register(payload);
      this.setSession(result.user, result.accessToken);
    },
    async login(payload: authApi.LoginPayload) {
      const result = await authApi.login(payload);
      this.setSession(result.user, result.accessToken);
    },
    logout() {
      this.user = null;
      this.accessToken = '';
    }
  }
});

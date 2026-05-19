import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth.store';
import * as authApi from '../api/auth.api';

vi.mock('../api/auth.api', () => ({
  login: vi.fn(),
  register: vi.fn()
}));

const mockedAuthApi = vi.mocked(authApi);

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('logs in and stores session', async () => {
    mockedAuthApi.login.mockResolvedValue({
      user: {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user'
      },
      accessToken: 'token',
      refreshToken: 'refresh-token'
    });

    const authStore = useAuthStore();
    await authStore.login({
      email: 'alice@example.com',
      password: 'password123'
    });

    expect(authStore.user?.email).toBe('alice@example.com');
    expect(authStore.accessToken).toBe('token');
    expect(authStore.refreshToken).toBe('refresh-token');
    expect(authStore.isAuthenticated).toBe(true);
    expect(JSON.parse(localStorage.getItem('coffee-ordering-auth') ?? '{}')).toEqual({
      user: {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user'
      },
      accessToken: 'token',
      refreshToken: 'refresh-token'
    });
  });

  it('registers and clears session on logout', async () => {
    mockedAuthApi.register.mockResolvedValue({
      user: {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user'
      },
      accessToken: 'token',
      refreshToken: 'refresh-token'
    });

    const authStore = useAuthStore();
    await authStore.register({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123'
    });
    authStore.logout();

    expect(authStore.user).toBeNull();
    expect(authStore.accessToken).toBe('');
    expect(authStore.isAuthenticated).toBe(false);
    expect(localStorage.getItem('coffee-ordering-auth')).toBeNull();
  });

  it('restores session from localStorage', () => {
    localStorage.setItem(
      'coffee-ordering-auth',
      JSON.stringify({
        user: {
          id: 'u1',
          name: 'Alice',
          email: 'alice@example.com',
          role: 'staff'
        },
        accessToken: 'stored-token'
      })
    );
    setActivePinia(createPinia());

    const authStore = useAuthStore();

    expect(authStore.user?.role).toBe('staff');
    expect(authStore.accessToken).toBe('stored-token');
    expect(authStore.isAuthenticated).toBe(true);
  });
});

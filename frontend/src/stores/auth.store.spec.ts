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
      accessToken: 'token'
    });

    const authStore = useAuthStore();
    await authStore.login({ email: 'alice@example.com', password: 'password123' });

    expect(authStore.user?.email).toBe('alice@example.com');
    expect(authStore.accessToken).toBe('token');
    expect(authStore.isAuthenticated).toBe(true);
  });

  it('registers and clears session on logout', async () => {
    mockedAuthApi.register.mockResolvedValue({
      user: {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user'
      },
      accessToken: 'token'
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
  });
});

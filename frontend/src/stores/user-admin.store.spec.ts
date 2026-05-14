import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserAdminStore } from './user-admin.store';
import * as userApi from '../api/user.api';

vi.mock('../api/user.api', () => ({
  getUsers: vi.fn(),
  updateUserRole: vi.fn()
}));

const mockedUserApi = vi.mocked(userApi);

const user: userApi.User = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'user',
  points: 5,
  createdAt: '2026-01-01T00:00:00.000Z'
};

describe('userAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('loads users and stores pagination', async () => {
    mockedUserApi.getUsers.mockResolvedValue({
      data: [user],
      pagination: { page: 1, limit: 20, total: 1 }
    });
    const store = useUserAdminStore();

    await store.loadUsers();

    expect(mockedUserApi.getUsers).toHaveBeenCalledWith(1);
    expect(store.users).toHaveLength(1);
    expect(store.pagination.total).toBe(1);
  });

  it('updates a user role in the local list', async () => {
    mockedUserApi.getUsers.mockResolvedValue({
      data: [user],
      pagination: { page: 1, limit: 20, total: 1 }
    });
    mockedUserApi.updateUserRole.mockResolvedValue({ ...user, role: 'staff' });
    const store = useUserAdminStore();

    await store.loadUsers();
    await store.updateRole('u1', 'staff');

    expect(store.users[0].role).toBe('staff');
    expect(mockedUserApi.updateUserRole).toHaveBeenCalledWith('u1', 'staff');
  });
});

import { defineStore } from 'pinia';
import * as userApi from '../api/user.api';

export const useUserAdminStore = defineStore('userAdmin', {
  state: () => ({
    users: [] as userApi.User[],
    pagination: { page: 1, limit: 20, total: 0 },
    isLoading: false
  }),
  actions: {
    async loadUsers(page = 1) {
      this.isLoading = true;
      try {
        const result = await userApi.getUsers(page);
        this.users = result.data;
        this.pagination = result.pagination;
      } finally {
        this.isLoading = false;
      }
    },
    async updateRole(id: string, role: userApi.User['role']) {
      const updated = await userApi.updateUserRole(id, role);
      this.users = this.users.map((u) => (u.id === updated.id ? updated : u));
      return updated;
    }
  }
});

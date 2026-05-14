import { http } from './http';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'staff' | 'admin';
  points: number;
  createdAt: string;
}

export interface UserListResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export async function getUsers(page = 1) {
  const response = await http.get<UserListResponse>('/users', { params: { page } });
  return response.data;
}

export async function updateUserRole(id: string, role: User['role']) {
  const response = await http.patch<User>(`/users/${id}/role`, { role });
  return response.data;
}

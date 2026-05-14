import { http } from './http';
import type { AuthUser } from '../stores/auth.store';

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload) {
  const response = await http.post<AuthResponse>('/auth/register', payload);
  return response.data;
}

export async function login(payload: LoginPayload) {
  const response = await http.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

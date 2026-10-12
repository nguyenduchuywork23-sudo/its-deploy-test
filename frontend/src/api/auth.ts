import { api } from './client';
import type { LoginResponse, User } from '../types';

export async function login(credentials: { email: string; password: string }): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  return data;
}

export async function refreshToken(token: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/refresh', { refreshToken: token });
  return data;
}

export async function logout(): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post<{ ok: boolean; message: string }>('/auth/logout');
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export interface RegisterData {
  email: string;
  fullName: string;
  password: string;
  role?: string;
}

export async function register(data: RegisterData): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/register', data);
  return res.data;
}

export async function seedDemoAccounts() {
  const { data } = await api.post('/auth/seed');
  return data;
}

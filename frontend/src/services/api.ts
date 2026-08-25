import axios from 'axios';
import { Message } from '@arco-design/web-react';
import {
  LoginResponse,
  User,
  Plan,
  Tenant,
  TenantUser,
  PlanChangeRecord,
  Bill,
  PaginationParams,
  PaginationResult,
  DashboardStats,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || error.message;
    Message.error(message);
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username: string, password: string): Promise<LoginResponse> =>
    api.post('/auth/login', { username, password }),

  getProfile: (): Promise<User> => api.get('/auth/profile'),
};

export const tenantApi = {
  getList: (params: PaginationParams): Promise<PaginationResult<Tenant>> =>
    api.get('/tenants', { params }),

  getById: (id: number): Promise<Tenant> => api.get(`/tenants/${id}`),

  create: (data: Partial<Tenant>): Promise<Tenant> =>
    api.post('/tenants', data),

  update: (id: number, data: Partial<Tenant>): Promise<Tenant> =>
    api.patch(`/tenants/${id}`, data),

  delete: (id: number): Promise<void> => api.delete(`/tenants/${id}`),

  updateStatus: (id: number, status: string): Promise<Tenant> =>
    api.patch(`/tenants/${id}/status`, { status }),

  getStats: (): Promise<{
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  }> => api.get('/tenants/stats'),

  extendTrial: (id: number, days: number): Promise<Tenant> =>
    api.post(`/tenants/${id}/trial/extend`, { days }),

  convertTrial: (id: number): Promise<{ tenant: Tenant; bill: Bill | null }> =>
    api.post(`/tenants/${id}/trial/convert`),

  changePlan: (
    id: number,
    planId: number
  ): Promise<{ tenant: Tenant; record: PlanChangeRecord; bill: Bill | null }> =>
    api.post(`/tenants/${id}/change-plan`, { planId }),

  getPlanChanges: (id: number): Promise<PlanChangeRecord[]> =>
    api.get(`/tenants/${id}/plan-changes`),

  updateStorage: (
    id: number,
    data: { storageUsed?: number; delta?: number }
  ): Promise<{
    tenant: Tenant;
    storageUsed: number;
    maxStorage: number;
    overLimit: boolean;
    warning: string | null;
  }> => api.post(`/tenants/${id}/storage`, data),
};

export const tenantUserApi = {
  getList: (tenantId: number): Promise<TenantUser[]> =>
    api.get(`/tenants/${tenantId}/users`),

  create: (
    tenantId: number,
    data: {
      username: string;
      email: string;
      password: string;
      role?: string;
      status?: string;
    }
  ): Promise<TenantUser> => api.post(`/tenants/${tenantId}/users`, data),

  update: (
    tenantId: number,
    userId: number,
    data: { email?: string; password?: string; role?: string; status?: string }
  ): Promise<TenantUser> =>
    api.patch(`/tenants/${tenantId}/users/${userId}`, data),

  delete: (tenantId: number, userId: number): Promise<void> =>
    api.delete(`/tenants/${tenantId}/users/${userId}`),
};

export const planApi = {
  getList: (params: PaginationParams): Promise<PaginationResult<Plan>> =>
    api.get('/plans', { params }),

  getActiveList: (): Promise<Plan[]> => api.get('/plans/active'),

  getById: (id: number): Promise<Plan> => api.get(`/plans/${id}`),

  create: (data: Partial<Plan>): Promise<Plan> => api.post('/plans', data),

  update: (id: number, data: Partial<Plan>): Promise<Plan> =>
    api.patch(`/plans/${id}`, data),

  delete: (id: number): Promise<void> => api.delete(`/plans/${id}`),

  updateStatus: (id: number, status: string): Promise<Plan> =>
    api.patch(`/plans/${id}/status`, { status }),

  getStats: (): Promise<{ total: number; active: number; inactive: number }> =>
    api.get('/plans/stats'),
};

export const billApi = {
  getList: (
    params: PaginationParams & { status?: string; tenantId?: number }
  ): Promise<PaginationResult<Bill>> => api.get('/bills', { params }),

  getById: (id: number): Promise<Bill> => api.get(`/bills/${id}`),

  create: (data: Partial<Bill>): Promise<Bill> => api.post('/bills', data),

  update: (id: number, data: Partial<Bill>): Promise<Bill> =>
    api.patch(`/bills/${id}`, data),

  delete: (id: number): Promise<void> => api.delete(`/bills/${id}`),

  updateStatus: (id: number, status: string): Promise<Bill> =>
    api.patch(`/bills/${id}/status`, { status }),

  getStats: (): Promise<{
    count: { total: number; pending: number; paid: number; overdue: number };
    amount: { total: number; paid: number; pending: number };
  }> => api.get('/bills/stats'),

  generateMonthly: (): Promise<{ generated: number; bills: Bill[] }> =>
    api.post('/bills/generate-monthly'),
};

export const dashboardApi = {
  getOverview: (): Promise<DashboardStats> => api.get('/dashboard/overview'),
};

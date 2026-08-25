export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingCycle: string;
  maxUsers: number;
  maxStorage: number;
  features: Record<string, any>;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tenants: number;
  };
  tenants?: Tenant[];
}

export interface Tenant {
  id: number;
  name: string;
  code: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: string;
  suspendReason?: string;
  storageUsed: number;
  planId: number;
  plan: Plan;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
  tenantUsers?: TenantUser[];
  bills?: Bill[];
  activeUserCount?: number;
}

export interface TenantUser {
  id: number;
  tenantId: number;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface PlanChangeRecord {
  id: number;
  tenantId: number;
  fromPlanId: number;
  fromPlan: Plan;
  toPlanId: number;
  toPlan: Plan;
  changeType: string;
  priceDiff: number;
  proratedAmount: number;
  billId?: number;
  remark?: string;
  createdAt: string;
}

export interface Bill {
  id: number;
  tenantId: number;
  tenant: Tenant;
  amount: number;
  billDate: string;
  dueDate: string;
  status: string;
  paidAt?: string;
  items: Record<string, any>;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BillStats {
  count: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  amount: {
    total: number;
    paid: number;
    pending: number;
  };
}

export interface DashboardStats {
  tenants: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  plans: {
    total: number;
  };
  bills: BillStats;
  recentTenants: Tenant[];
  recentBills: Bill[];
  planRevenue: Array<{
    planId: number;
    planName: string;
    tenantCount: number;
    monthlyRevenue: number;
  }>;
}

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
  suspendReason?: string | null;
  planId: number;
  plan: Plan;
  trialEndsAt?: string | null;
  storageUsed?: number;
  createdAt: string;
  updatedAt: string;
  tenantUsers?: TenantUser[];
  bills?: Bill[];
  planChanges?: PlanChangeRecord[];
  _count?: {
    tenantUsers?: number;
  };
}

export interface TenantUser {
  id: number;
  tenantId: number;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TenantUserListResult {
  data: TenantUser[];
  total: number;
  activeCount: number;
}

export interface PlanChangeRecord {
  id: number;
  tenantId: number;
  fromPlanId: number;
  toPlanId: number;
  fromPlanName: string;
  toPlanName: string;
  fromPrice: number;
  toPrice: number;
  proratedAmount: number;
  effectiveAt: string;
  billId?: number | null;
  remark?: string;
  createdAt: string;
}

export interface ChangePlanResult {
  tenant: Tenant;
  record: PlanChangeRecord;
  billId: number | null;
}

export interface Bill {
  id: number;
  tenantId: number;
  tenant: Tenant;
  type?: string;
  amount: number;
  billDate: string;
  dueDate: string;
  status: string;
  paidAt?: string;
  items: Record<string, any>;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  tenantReactivated?: boolean;
}

export interface LifecycleCheckResult {
  checkedAt: string;
  trialExpired: number;
  overdueMarked: number;
  arrearsSuspended: number;
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

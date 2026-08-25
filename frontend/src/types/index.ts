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
  planId: number;
  plan: Plan;
  trialEndsAt?: string;
  storageUsed?: number;
  storageUsedMb?: number;
  maxStorageGb?: number;
  maxStorageMb?: number;
  creditBalance?: number;
  suspendedAt?: string;
  suspendedReason?: string;
  createdAt: string;
  updatedAt: string;
  tenantUsers?: TenantUser[];
  bills?: Bill[];
  planChanges?: PlanChange[];
  activeUserCount?: number;
  overdueBills?: number;
  isTrialExpired?: boolean;
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

export interface PlanChange {
  id: number;
  tenantId: number;
  fromPlanId: number;
  toPlanId: number;
  fromPlan: Plan;
  toPlan: Plan;
  changeType: string;
  proratedAmount: number;
  effectiveDate: string;
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
  billType?: string;
  relatedChangeId?: number;
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

export interface TenantStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  trial: number;
  newThisMonth: number;
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

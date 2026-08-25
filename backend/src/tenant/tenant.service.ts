import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant-user.dto';
import { ChangePlanDto, ExtendTrialDto } from './dto/plan-change.dto';
import { PaginationDto, PaginationResultDto } from '../common/dto/pagination.dto';
import * as bcrypt from 'bcryptjs';

const MB_PER_GB = 1024;

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  private getMaxStorageMb(maxStorageGb: number): number {
    return maxStorageGb * MB_PER_GB;
  }

  private async assertNoOverdueBills(tenantId: number): Promise<void> {
    const overdueBills = await this.prisma.bill.count({
      where: { tenantId, status: 'overdue' },
    });
    if (overdueBills > 0) {
      throw new ConflictException('存在逾期账单，请先处理账单后再启用租户');
    }
  }

  async create(createTenantDto: CreateTenantDto) {
    const existingByName = await this.prisma.tenant.findUnique({
      where: { name: createTenantDto.name },
    });
    if (existingByName) {
      throw new ConflictException('租户名称已存在');
    }

    const existingByCode = await this.prisma.tenant.findUnique({
      where: { code: createTenantDto.code },
    });
    if (existingByCode) {
      throw new ConflictException('租户编码已存在');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: createTenantDto.planId },
    });
    if (!plan) {
      throw new NotFoundException('套餐不存在');
    }

    const data: any = { ...createTenantDto };
    if (data.trialEndsAt) {
      data.trialEndsAt = new Date(data.trialEndsAt);
    }

    return this.prisma.tenant.create({
      data,
      include: { plan: true },
    });
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResultDto<any>> {
    const { page = 1, pageSize = 10, keyword } = paginationDto;
    const skip = (page - 1) * pageSize;

    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { code: { contains: keyword } },
            { contactName: { contains: keyword } },
            { contactEmail: { contains: keyword } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          plan: true,
          _count: {
            select: { tenantUsers: { where: { status: 'active' } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        tenantUsers: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            tenantId: true,
            username: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        bills: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        planChanges: {
          include: {
            fromPlan: true,
            toPlan: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const activeUserCount = tenant.tenantUsers.filter(u => u.status === 'active').length;
    const overdueBills = tenant.bills.filter(b => b.status === 'overdue').length;
    const maxStorageMb = this.getMaxStorageMb(tenant.plan.maxStorage);

    const { creditBalance, ...rest } = tenant as any;
    return {
      ...rest,
      creditBalance: Number(creditBalance || 0),
      storageUsedMb: tenant.storageUsed,
      maxStorageGb: tenant.plan.maxStorage,
      maxStorageMb,
      activeUserCount,
      overdueBills,
      isTrialExpired: tenant.trialEndsAt ? new Date() > tenant.trialEndsAt : false,
    };
  }

  async update(id: number, updateTenantDto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if ((updateTenantDto as any).status !== undefined) {
      throw new BadRequestException('更新租户信息不能直接修改状态，请使用启用/停用专用接口');
    }

    if (updateTenantDto.name && updateTenantDto.name !== tenant.name) {
      const existing = await this.prisma.tenant.findUnique({
        where: { name: updateTenantDto.name },
      });
      if (existing) {
        throw new ConflictException('租户名称已存在');
      }
    }

    if (updateTenantDto.code && updateTenantDto.code !== tenant.code) {
      const existing = await this.prisma.tenant.findUnique({
        where: { code: updateTenantDto.code },
      });
      if (existing) {
        throw new ConflictException('租户编码已存在');
      }
    }

    if (updateTenantDto.planId && updateTenantDto.planId !== tenant.planId) {
      throw new BadRequestException('请使用套餐变更接口切换套餐');
    }

    const { status, ...dataWithoutStatus } = updateTenantDto as any;
    return this.prisma.tenant.update({
      where: { id },
      data: dataWithoutStatus,
      include: { plan: true },
    });
  }

  async remove(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    await this.prisma.bill.deleteMany({ where: { tenantId: id } });
    await this.prisma.planChange.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenantUser.deleteMany({ where: { tenantId: id } });
    return this.prisma.tenant.delete({ where: { id } });
  }

  async updateStatus(id: number, status: string, reason?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (status === 'active') {
      throw new BadRequestException('启用租户请使用专用启用接口 /tenants/:id/activate');
    }

    if (!['inactive', 'suspended'].includes(status)) {
      throw new BadRequestException('不支持的状态值');
    }

    const data: any = { status };
    if (status === 'suspended') {
      data.suspendedAt = new Date();
      data.suspendedReason = reason || '管理员手动停用';
    } else if (status === 'inactive') {
      data.suspendedAt = null;
      data.suspendedReason = null;
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }

  async getStats() {
    const total = await this.prisma.tenant.count();
    const active = await this.prisma.tenant.count({ where: { status: 'active' } });
    const inactive = await this.prisma.tenant.count({ where: { status: 'inactive' } });
    const suspended = await this.prisma.tenant.count({ where: { status: 'suspended' } });
    const trial = await this.prisma.tenant.count({
      where: {
        trialEndsAt: { not: null },
        status: 'active',
      },
    });
    const newThisMonth = await this.prisma.tenant.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    return { total, active, inactive, suspended, trial, newThisMonth };
  }

  async createTenantUser(tenantId: number, createUserDto: CreateTenantUserDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (tenant.status !== 'active') {
      throw new ConflictException('租户已停用，无法添加用户');
    }

    if (tenant.trialEndsAt && new Date() > tenant.trialEndsAt) {
      throw new ConflictException('租户试用期已到期，无法添加用户');
    }

    const activeUserCount = await this.prisma.tenantUser.count({
      where: { tenantId, status: 'active' },
    });

    if (activeUserCount >= tenant.plan.maxUsers) {
      throw new ConflictException(`用户数已达套餐上限（${tenant.plan.maxUsers}人），无法添加更多用户`);
    }

    const existingByUsername = await this.prisma.tenantUser.findUnique({
      where: { username: createUserDto.username },
    });
    if (existingByUsername) {
      throw new ConflictException('用户名已存在');
    }

    const existingByEmail = await this.prisma.tenantUser.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingByEmail) {
      throw new ConflictException('邮箱已被使用');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.tenantUser.create({
      data: {
        tenantId,
        username: createUserDto.username,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role || 'user',
      },
    });
  }

  async findTenantUsers(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return this.prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateTenantUser(tenantId: number, userId: number, updateUserDto: UpdateTenantUserDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const user = await this.prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (updateUserDto.status === 'active' && user.status !== 'active') {
      const activeUserCount = await this.prisma.tenantUser.count({
        where: { tenantId, status: 'active' },
      });
      if (activeUserCount >= tenant.plan.maxUsers) {
        throw new ConflictException(`用户数已达套餐上限（${tenant.plan.maxUsers}人），无法启用该用户`);
      }
    }

    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.tenantUser.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        tenantId: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async removeTenantUser(tenantId: number, userId: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const user = await this.prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const adminCount = await this.prisma.tenantUser.count({
      where: { tenantId, role: 'admin', status: 'active' },
    });
    if (user.role === 'admin' && adminCount <= 1 && user.status === 'active') {
      throw new ConflictException('至少保留一个管理员账户');
    }

    return this.prisma.tenantUser.delete({ where: { id: userId } });
  }

  async checkStorageQuota(tenantId: number, requiredStorageMb: number): Promise<{
    allowed: boolean;
    storageUsedMb: number;
    maxStorageMb: number;
    maxStorageGb: number;
    remainingMb: number;
    unit: string;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const storageUsedMb = tenant.storageUsed;
    const maxStorageMb = this.getMaxStorageMb(tenant.plan.maxStorage);
    const remainingMb = maxStorageMb - storageUsedMb;

    return {
      allowed: storageUsedMb + requiredStorageMb <= maxStorageMb,
      storageUsedMb,
      maxStorageMb,
      maxStorageGb: tenant.plan.maxStorage,
      remainingMb,
      unit: 'MB',
    };
  }

  async updateStorageUsage(tenantId: number, storageDeltaMb: number) {
    if (storageDeltaMb === 0) {
      throw new BadRequestException('变化量不能为0');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (tenant.status !== 'active') {
      throw new ConflictException('租户未处于启用状态，无法更新存储用量');
    }

    const maxStorageMb = this.getMaxStorageMb(tenant.plan.maxStorage);
    const newStorageUsed = tenant.storageUsed + storageDeltaMb;
    if (newStorageUsed < 0) {
      throw new BadRequestException('存储使用量不能为负数');
    }
    if (newStorageUsed > maxStorageMb) {
      throw new ConflictException(
        `存储已达套餐上限（${tenant.plan.maxStorage}GB / ${maxStorageMb}MB），当前使用${tenant.storageUsed}MB，本次申请${storageDeltaMb > 0 ? '增加' : '减少'}${Math.abs(storageDeltaMb)}MB`
      );
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { storageUsed: newStorageUsed },
      select: {
        id: true,
        storageUsed: true,
        planId: true,
        plan: { select: { maxStorage: true } },
      },
    });
  }

  async changePlan(tenantId: number, changePlanDto: ChangePlanDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: changePlanDto.planId },
    });
    if (!newPlan) {
      throw new NotFoundException('新套餐不存在');
    }

    if (newPlan.status !== 'active') {
      throw new ConflictException('目标套餐已停用');
    }

    if (tenant.planId === changePlanDto.planId) {
      throw new BadRequestException('新套餐与当前套餐相同');
    }

    const activeUserCount = await this.prisma.tenantUser.count({
      where: { tenantId, status: 'active' },
    });
    if (activeUserCount > newPlan.maxUsers) {
      throw new ConflictException(
        `当前活跃用户数（${activeUserCount}）超过新套餐上限（${newPlan.maxUsers}人），请先停用部分用户`
      );
    }

    const newMaxStorageMb = this.getMaxStorageMb(newPlan.maxStorage);
    if (tenant.storageUsed > newMaxStorageMb) {
      throw new ConflictException(
        `当前存储使用量（${tenant.storageUsed}MB）超过新套餐上限（${newPlan.maxStorage}GB / ${newMaxStorageMb}MB），请先清理存储资源`
      );
    }

    const effectiveDate = changePlanDto.effectiveDate
      ? new Date(changePlanDto.effectiveDate)
      : new Date();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfCycle = now.getDate();
    const remainingDays = Math.max(daysInMonth - dayOfCycle, 0);

    const oldPlanDaily = Number(tenant.plan.price) / daysInMonth;
    const newPlanDaily = Number(newPlan.price) / daysInMonth;
    const dailyDiff = newPlanDaily - oldPlanDaily;
    const proratedAmount = Math.round(dailyDiff * remainingDays * 100) / 100;

    const changeType = proratedAmount >= 0 ? 'upgrade' : 'downgrade';
    const creditAmount = proratedAmount < 0 ? Math.abs(proratedAmount) : 0;

    const result = await this.prisma.$transaction(async (prisma) => {
      const planChange = await prisma.planChange.create({
        data: {
          tenantId,
          fromPlanId: tenant.planId,
          toPlanId: changePlanDto.planId,
          changeType,
          proratedAmount,
          effectiveDate,
          remark: changePlanDto.remark,
        },
        include: {
          fromPlan: true,
          toPlan: true,
        },
      });

      let bill = null;
      if (proratedAmount > 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        bill = await prisma.bill.create({
          data: {
            tenantId,
            amount: proratedAmount,
            billDate: now,
            dueDate,
            status: 'pending',
            billType: 'plan_change',
            relatedChangeId: planChange.id,
            items: {
              planChange: {
                name: `套餐升级补差（${tenant.plan.name} → ${newPlan.name}）`,
                amount: proratedAmount,
                quantity: 1,
                fromPlan: tenant.plan.name,
                toPlan: newPlan.name,
                daysInMonth,
                remainingDays,
              },
            },
            remark: changePlanDto.remark || `套餐升级：${tenant.plan.name} → ${newPlan.name}`,
          },
        });
      }

      const tenantUpdateData: any = { planId: changePlanDto.planId };
      if (creditAmount > 0) {
        tenantUpdateData.creditBalance = {
          increment: creditAmount,
        };
      }

      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: tenantUpdateData,
        include: { plan: true },
      });

      return { planChange, bill, tenant: updatedTenant, creditAmount };
    });

    return result;
  }

  async getPlanChanges(tenantId: number, paginationDto: PaginationDto) {
    const { page = 1, pageSize = 10 } = paginationDto;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.planChange.findMany({
        where: { tenantId },
        skip,
        take: pageSize,
        include: {
          fromPlan: true,
          toPlan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.planChange.count({ where: { tenantId } }),
    ]);

    return { data, total, page, pageSize };
  }

  async extendTrial(tenantId: number, extendTrialDto: ExtendTrialDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (!tenant.trialEndsAt) {
      throw new BadRequestException('该租户不是试用租户');
    }

    if (extendTrialDto.days <= 0) {
      throw new BadRequestException('延长天数必须大于0');
    }

    await this.assertNoOverdueBills(tenantId);

    const baseDate = tenant.trialEndsAt > new Date() ? tenant.trialEndsAt : new Date();
    const newTrialEndsAt = new Date(baseDate);
    newTrialEndsAt.setDate(newTrialEndsAt.getDate() + extendTrialDto.days);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        trialEndsAt: newTrialEndsAt,
        status: 'active',
        suspendedAt: null,
        suspendedReason: null,
      },
      include: { plan: true },
    });
  }

  async convertTrial(tenantId: number, remark?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (!tenant.trialEndsAt) {
      throw new BadRequestException('该租户不是试用租户');
    }

    await this.assertNoOverdueBills(tenantId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        trialEndsAt: null,
        status: 'active',
        suspendedAt: null,
        suspendedReason: null,
      },
      include: { plan: true },
    });
  }

  async suspendTenant(tenantId: number, reason: string) {
    return this.updateStatus(tenantId, 'suspended', reason);
  }

  async activateTenant(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (tenant.trialEndsAt && new Date() > tenant.trialEndsAt) {
      throw new ConflictException('试用期已到期，请先延期或转正');
    }

    await this.assertNoOverdueBills(tenantId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'active',
        suspendedAt: null,
        suspendedReason: null,
      },
      include: { plan: true },
    });
  }
}

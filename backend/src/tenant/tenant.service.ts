import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  ExtendTrialDto,
  ChangePlanDto,
  UpdateStorageDto,
} from './dto/tenant.dto';
import { PaginationDto, PaginationResultDto } from '../common/dto/pagination.dto';

const BILLING_CYCLE_DAYS = 30;
const PLAN_CHANGE_BILL_DUE_DAYS = 10;

const tenantUserSelect = {
  id: true,
  tenantId: true,
  username: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

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
      throw new BadRequestException('所选套餐不存在');
    }
    if (plan.status !== 'active') {
      throw new BadRequestException('所选套餐已停用，无法使用');
    }

    const trialDays = createTenantDto.trialDays ?? 0;
    const isTrial = trialDays > 0;

    const data: any = {
      name: createTenantDto.name,
      code: createTenantDto.code,
      contactName: createTenantDto.contactName,
      contactEmail: createTenantDto.contactEmail,
      contactPhone: createTenantDto.contactPhone,
      address: createTenantDto.address,
      planId: createTenantDto.planId,
      status: isTrial
        ? 'trial'
        : createTenantDto.status || 'active',
    };

    if (isTrial) {
      data.trialEndsAt = new Date(
        Date.now() + trialDays * 24 * 60 * 60 * 1000,
      );
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
            select: {
              tenantUsers: { where: { status: 'active' } },
            },
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
          select: tenantUserSelect,
          orderBy: { createdAt: 'desc' },
        },
        bills: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        planChanges: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return tenant;
  }

  async update(id: number, updateTenantDto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
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

    const data: any = { ...updateTenantDto };
    delete data.planId;
    if (updateTenantDto.status) {
      data.suspendReason =
        updateTenantDto.status === 'suspended'
          ? tenant.suspendReason || 'manual'
          : null;
      if (updateTenantDto.status === 'active') {
        data.trialEndsAt = null;
      }
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }

  async remove(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    await this.prisma.planChangeRecord.deleteMany({ where: { tenantId: id } });
    await this.prisma.bill.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenantUser.deleteMany({ where: { tenantId: id } });
    return this.prisma.tenant.delete({ where: { id } });
  }

  async updateStatus(id: number, status: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const data: any = { status };
    if (status === 'suspended') {
      data.suspendReason = tenant.suspendReason || 'manual';
    } else if (status === 'active') {
      data.suspendReason = null;
      data.trialEndsAt = null;
    } else if (status === 'trial') {
      if (!tenant.trialEndsAt) {
        throw new BadRequestException('该租户没有试用信息，无法设为试用状态');
      }
      data.suspendReason = null;
    } else {
      data.suspendReason = null;
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }

  async extendTrial(id: number, extendTrialDto: ExtendTrialDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (tenant.status === 'active') {
      throw new ConflictException('正式租户无需延期试用');
    }
    if (tenant.status === 'inactive') {
      throw new ConflictException('租户已被禁用，请先启用后再延期试用');
    }
    if (
      tenant.status === 'suspended' &&
      tenant.suspendReason === 'arrears'
    ) {
      throw new ConflictException('租户因欠费停用，请先结清账单后再处理试用');
    }

    const now = new Date();
    const base =
      tenant.trialEndsAt && tenant.trialEndsAt > now
        ? tenant.trialEndsAt
        : now;
    const newTrialEndsAt = new Date(
      base.getTime() + extendTrialDto.days * 24 * 60 * 60 * 1000,
    );

    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'trial',
        suspendReason: null,
        trialEndsAt: newTrialEndsAt,
      },
      include: { plan: true },
    });
  }

  async convertTrial(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (tenant.status === 'active') {
      throw new ConflictException('租户已是正式状态');
    }
    if (
      tenant.status === 'suspended' &&
      tenant.suspendReason === 'arrears'
    ) {
      throw new ConflictException('租户因欠费停用，请先结清账单后再转正');
    }
    if (tenant.status === 'inactive') {
      throw new ConflictException('租户已被禁用，请先启用后再转正');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'active',
        suspendReason: null,
        trialEndsAt: null,
      },
      include: { plan: true },
    });
  }

  async changePlan(id: number, changePlanDto: ChangePlanDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: changePlanDto.planId },
    });
    if (!newPlan) {
      throw new BadRequestException('目标套餐不存在');
    }
    if (newPlan.status !== 'active') {
      throw new BadRequestException('目标套餐已停用，无法切换');
    }
    if (newPlan.id === tenant.planId) {
      throw new ConflictException('新套餐与当前套餐相同，无需切换');
    }

    const activeUserCount = await this.prisma.tenantUser.count({
      where: { tenantId: id, status: 'active' },
    });
    if (activeUserCount > newPlan.maxUsers) {
      throw new ConflictException(
        `当前活跃用户数（${activeUserCount} 人）超过目标套餐用户上限（${newPlan.maxUsers} 人），无法切换`,
      );
    }
    if (tenant.storageUsed > newPlan.maxStorage) {
      throw new ConflictException(
        `当前存储用量（${tenant.storageUsed}GB）超过目标套餐存储上限（${newPlan.maxStorage}GB），无法切换`,
      );
    }

    const now = new Date();
    const oldPrice = tenant.plan.price.toNumber();
    const newPrice = newPlan.price.toNumber();

    const remainingDays = Math.max(
      0,
      Math.ceil(
        (new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() -
          now.getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );

    const dailyDiff = (newPrice - oldPrice) / BILLING_CYCLE_DAYS;
    const proratedAmount = Math.round(dailyDiff * remainingDays * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      let billId: number | null = null;

      if (proratedAmount > 0) {
        const bill = await tx.bill.create({
          data: {
            tenantId: id,
            type: 'plan_change',
            amount: proratedAmount,
            billDate: now,
            dueDate: new Date(
              now.getTime() + PLAN_CHANGE_BILL_DUE_DAYS * 24 * 60 * 60 * 1000,
            ),
            status: 'pending',
            items: {
              planChange: {
                name: `套餐变更补差（${tenant.plan.name} → ${newPlan.name}）`,
                fromPlan: tenant.plan.name,
                toPlan: newPlan.name,
                fromPrice: oldPrice,
                toPrice: newPrice,
                dailyDiff: Math.round(dailyDiff * 100) / 100,
                remainingDays,
                amount: proratedAmount,
                quantity: 1,
              },
            },
            remark:
              changePlanDto.remark ||
              `套餐由「${tenant.plan.name}」变更为「${newPlan.name}」，按本月剩余 ${remainingDays} 天补差`,
          },
        });
        billId = bill.id;
      }

      const record = await tx.planChangeRecord.create({
        data: {
          tenantId: id,
          fromPlanId: tenant.planId,
          toPlanId: newPlan.id,
          fromPlanName: tenant.plan.name,
          toPlanName: newPlan.name,
          fromPrice: oldPrice,
          toPrice: newPrice,
          proratedAmount,
          effectiveAt: now,
          billId,
          remark: changePlanDto.remark,
        },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id },
        data: { planId: newPlan.id },
        include: { plan: true },
      });

      return { tenant: updatedTenant, record, billId };
    });
  }

  async updateStorage(id: number, updateStorageDto: UpdateStorageDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (updateStorageDto.storageUsed > tenant.plan.maxStorage) {
      throw new ConflictException(
        `存储用量（${updateStorageDto.storageUsed}GB）超过套餐存储上限（${tenant.plan.maxStorage}GB）`,
      );
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { storageUsed: updateStorageDto.storageUsed },
      include: { plan: true },
    });
  }

  async getPlanChanges(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return this.prisma.planChangeRecord.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const total = await this.prisma.tenant.count();
    const active = await this.prisma.tenant.count({ where: { status: 'active' } });
    const trial = await this.prisma.tenant.count({ where: { status: 'trial' } });
    const suspended = await this.prisma.tenant.count({
      where: { status: 'suspended' },
    });
    const inactive = await this.prisma.tenant.count({
      where: { status: 'inactive' },
    });
    const newThisMonth = await this.prisma.tenant.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    return { total, active, trial, suspended, inactive, newThisMonth };
  }
}

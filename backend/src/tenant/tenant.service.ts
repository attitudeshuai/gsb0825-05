import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { PaginationDto, PaginationResultDto } from '../common/dto/pagination.dto';

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
      throw new NotFoundException('套餐不存在');
    }
    if (plan.status !== 'active') {
      throw new BadRequestException('套餐已下架，无法选择');
    }

    const { trialDays, ...tenantData } = createTenantDto;
    const data: any = { ...tenantData };
    if (trialDays) {
      data.status = 'trial';
      data.trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
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
        include: { plan: true },
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
        },
        bills: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const activeUserCount = tenant.tenantUsers.filter(
      (user) => user.status === 'active',
    ).length;

    const tenantUsers = tenant.tenantUsers.map(
      ({ password, ...user }) => user,
    );

    return { ...tenant, tenantUsers, activeUserCount };
  }

  async update(id: number, updateTenantDto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const payload = updateTenantDto as any;
    if (payload.planId !== undefined) {
      throw new BadRequestException('套餐变更请使用 /tenants/:id/change-plan 接口');
    }
    if (payload.status !== undefined) {
      throw new BadRequestException('状态修改请使用 /tenants/:id/status 接口');
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

    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
      include: { plan: true },
    });
  }

  async remove(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    await this.prisma.bill.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenantUser.deleteMany({ where: { tenantId: id } });
    await this.prisma.planChangeRecord.deleteMany({ where: { tenantId: id } });
    return this.prisma.tenant.delete({ where: { id } });
  }

  // 状态机收紧：
  // 1. 禁止把试用到期停用的租户直接改回 active / inactive / trial，必须先延期或转正
  // 2. 禁止把任意租户直接设为 trial（trial 只能在创建时或 extendTrial 中产生）
  // 3. 人工暂停（suspended）时清空 trialEndsAt，避免残余试用时间干扰
  // 4. 恢复启用（active）时清空 suspendReason，状态一致
  async updateStatus(id: number, status: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (status === 'trial') {
      throw new BadRequestException('试用状态仅能在创建租户时设置，或通过延期/转正流程产生');
    }

    if (status !== 'suspended') {
      // 从 suspended 恢复时，必须检查原因
      if (
        tenant.status === 'suspended' &&
        tenant.suspendReason === 'trial_expired' &&
        status !== 'trial'
      ) {
        throw new BadRequestException(
          '试用到期停用的租户必须先延期试用或转正，不能直接恢复启用',
        );
      }
    }

    const updateData: any = { status };

    if (status === 'active') {
      updateData.suspendReason = null;
      updateData.trialEndsAt = null;
    } else if (status === 'inactive') {
      updateData.trialEndsAt = null;
    } else if (status === 'suspended') {
      // 人工暂停时清空试用到期时间，并默认标记原因
      updateData.suspendReason = tenant.suspendReason || 'manual';
      updateData.trialEndsAt = null;
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateData,
      include: { plan: true },
    });
  }

  // 试用延期：试用中或已因试用到期停用的租户可延期，停用租户延期后恢复试用
  async extendTrial(id: number, days: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const isTrial = tenant.status === 'trial';
    const isTrialExpired =
      tenant.status === 'suspended' && tenant.suspendReason === 'trial_expired';
    if (!isTrial && !isTrialExpired) {
      throw new BadRequestException('仅试用中或试用已到期的租户可以延期');
    }

    const now = new Date();
    const base =
      tenant.trialEndsAt && tenant.trialEndsAt > now ? tenant.trialEndsAt : now;
    const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'trial',
        trialEndsAt,
        suspendReason: null,
      },
      include: { plan: true },
    });
  }

  // 试用转正：转为正式租户并生成首期账单
  async convertTrial(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const isTrial = tenant.status === 'trial';
    const isTrialExpired =
      tenant.status === 'suspended' && tenant.suspendReason === 'trial_expired';
    if (!isTrial && !isTrialExpired) {
      throw new BadRequestException('仅试用中或试用已到期的租户可以转正');
    }

    const now = new Date();
    const price = tenant.plan.price.toNumber();
    let bill = null;

    if (price > 0) {
      bill = await this.prisma.bill.create({
        data: {
          tenantId: id,
          amount: price,
          billDate: now,
          dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          status: 'pending',
          items: {
            planFee: {
              name: `${tenant.plan.name}月费`,
              amount: price,
              quantity: 1,
            },
          },
          remark: '试用转正首期账单',
        },
      });
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'active', trialEndsAt: null, suspendReason: null },
      include: { plan: true },
    });

    return { tenant: updated, bill };
  }

  // 变更套餐：生成变更记录；升级时按当月剩余天数生成补差账单
  async changePlan(id: number, newPlanId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (tenant.planId === newPlanId) {
      throw new BadRequestException('新套餐与当前套餐相同');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });
    if (!newPlan) {
      throw new NotFoundException('新套餐不存在');
    }
    if (newPlan.status !== 'active') {
      throw new BadRequestException('新套餐已下架，无法变更');
    }

    // 新套餐 maxUsers 不得低于当前活跃用户数
    const activeUserCount = await this.prisma.tenantUser.count({
      where: { tenantId: id, status: 'active' },
    });
    if (activeUserCount > newPlan.maxUsers) {
      throw new BadRequestException(
        `当前活跃用户数 ${activeUserCount} 人超过新套餐上限（${newPlan.maxUsers} 人），无法变更`,
      );
    }

    // 新套餐 maxStorage 不得低于当前已用存储
    if (tenant.storageUsed > newPlan.maxStorage) {
      throw new BadRequestException(
        `当前已用存储 ${tenant.storageUsed}GB 超过新套餐上限（${newPlan.maxStorage}GB），无法变更`,
      );
    }

    const oldPrice = tenant.plan.price.toNumber();
    const newPrice = newPlan.price.toNumber();
    const priceDiff = newPrice - oldPrice;
    const changeType =
      priceDiff > 0 ? 'upgrade' : priceDiff < 0 ? 'downgrade' : 'same_price';

    let proratedAmount = 0;
    if (changeType === 'upgrade' && tenant.status === 'active') {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const remainingDays = daysInMonth - now.getDate() + 1;
      if (remainingDays > 0) {
        proratedAmount =
          Math.round(((priceDiff * remainingDays) / daysInMonth) * 100) / 100;
      }
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      let bill = null;
      if (proratedAmount > 0) {
        bill = await tx.bill.create({
          data: {
            tenantId: id,
            amount: proratedAmount,
            billDate: now,
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            status: 'pending',
            items: {
              planChangeFee: {
                name: `套餐升级补差（${tenant.plan.name} → ${newPlan.name}）`,
                amount: proratedAmount,
                quantity: 1,
              },
            },
            remark: `套餐变更补差账单：${tenant.plan.name} → ${newPlan.name}`,
          },
        });
      }

      const record = await tx.planChangeRecord.create({
        data: {
          tenantId: id,
          fromPlanId: tenant.planId,
          toPlanId: newPlanId,
          changeType,
          priceDiff,
          proratedAmount,
          billId: bill?.id || null,
          remark: `套餐${changeType === 'upgrade' ? '升级' : changeType === 'downgrade' ? '降级' : '平级变更'}：${tenant.plan.name} → ${newPlan.name}`,
        },
        include: { fromPlan: true, toPlan: true },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id },
        data: { planId: newPlanId },
        include: { plan: true },
      });

      return { tenant: updatedTenant, record, bill };
    });
  }

  // 存储用量上报/调整
  async updateStorage(id: number, dto: { storageUsed?: number; delta?: number }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    let nextStorage: number;
    if (dto.storageUsed !== undefined) {
      nextStorage = dto.storageUsed;
    } else if (dto.delta !== undefined) {
      nextStorage = tenant.storageUsed + dto.delta;
    } else {
      throw new BadRequestException('storageUsed 与 delta 至少传一个');
    }
    if (nextStorage < 0) {
      nextStorage = 0;
    }

    const maxStorage = tenant.plan.maxStorage;
    const isOverLimit = nextStorage > maxStorage;

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { storageUsed: nextStorage },
      include: { plan: true },
    });

    return {
      tenant: updated,
      storageUsed: nextStorage,
      maxStorage,
      overLimit: isOverLimit,
      warning: isOverLimit ? `存储已超出套餐上限（${maxStorage}GB）` : null,
    };
  }

  async getPlanChanges(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return this.prisma.planChangeRecord.findMany({
      where: { tenantId: id },
      include: { fromPlan: true, toPlan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const total = await this.prisma.tenant.count();
    const active = await this.prisma.tenant.count({ where: { status: 'active' } });
    const inactive = await this.prisma.tenant.count({ where: { status: 'inactive' } });
    const newThisMonth = await this.prisma.tenant.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    return { total, active, inactive, newThisMonth };
  }
}

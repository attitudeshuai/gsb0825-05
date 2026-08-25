import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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

    return this.prisma.tenant.create({
      data: {
        ...createTenantDto,
        trialEndsAt: createTenantDto.trialEndsAt
          ? new Date(createTenantDto.trialEndsAt)
          : undefined,
      },
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
        planChanges: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 剥离租户用户的 password 字段，避免密码哈希泄漏
    return {
      ...tenant,
      tenantUsers: tenant.tenantUsers.map(({ password, ...rest }) => rest),
    };
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

    // 套餐变更走专门逻辑（生成变更记录、补差账单、降级校验），避免普通编辑绕过一致性
    const { planId, trialEndsAt, ...rest } = updateTenantDto;
    if (planId && planId !== tenant.planId) {
      await this.changePlan(id, { planId, remark: '编辑租户时切换套餐' });
    }

    const data: any = { ...rest };
    if (trialEndsAt !== undefined) {
      data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
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

    await this.prisma.bill.deleteMany({ where: { tenantId: id } });
    await this.prisma.tenantUser.deleteMany({ where: { tenantId: id } });
    await this.prisma.planChangeRecord.deleteMany({ where: { tenantId: id } });
    return this.prisma.tenant.delete({ where: { id } });
  }

  async updateStatus(id: number, status: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 手动改为非停用状态时清除停用原因，保持状态一致
    return this.prisma.tenant.update({
      where: { id },
      data: {
        status,
        suspendReason: status === 'suspended' ? tenant.suspendReason : null,
      },
      include: { plan: true },
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

  // ==================== 存储用量管理 ====================

  /**
   * 存储用量写入唯一入口：更新租户 storageUsed，并按套餐 maxStorage 校验。
   * 超过上限时拦截（抛异常）；接近上限（>=90%）时在返回结果中携带告警信息。
   */
  async updateStorage(id: number, storageUsed: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const maxStorage = tenant.plan.maxStorage;
    // 超额拦截：写入用量不得超过套餐存储上限
    if (storageUsed > maxStorage) {
      throw new BadRequestException(
        `存储用量 ${storageUsed}GB 超过当前套餐「${tenant.plan.name}」上限 ${maxStorage}GB，请升级套餐或清理存储`,
      );
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { storageUsed },
      include: { plan: true },
    });

    const usageRatio = maxStorage > 0 ? storageUsed / maxStorage : 0;
    const warning =
      usageRatio >= 0.9
        ? `存储用量已达 ${Math.round(usageRatio * 100)}%（${storageUsed}/${maxStorage}GB），接近上限，请及时扩容`
        : null;

    return { ...updated, storageWarning: warning };
  }

  // ==================== 试用期管理 ====================

  /** 试用延期：更新试用到期时间；若因试用到期被停用，则恢复为激活 */
  async extendTrial(id: number, trialEndsAt: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    const newEnd = new Date(trialEndsAt);
    if (newEnd.getTime() <= Date.now()) {
      throw new BadRequestException('试用到期时间必须晚于当前时间');
    }

    const data: any = { trialEndsAt: newEnd };
    if (tenant.status === 'suspended' && tenant.suspendReason === 'trial_expired') {
      data.status = 'active';
      data.suspendReason = null;
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }

  /** 转正：清空试用到期时间；若因试用到期被停用则恢复激活 */
  async convertToFormal(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }
    if (!tenant.trialEndsAt) {
      throw new BadRequestException('该租户不在试用状态');
    }

    const data: any = { trialEndsAt: null };
    if (tenant.status === 'suspended' && tenant.suspendReason === 'trial_expired') {
      data.status = 'active';
      data.suspendReason = null;
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }

  // ==================== 套餐切换 ====================

  /**
   * 切换套餐：生成变更记录；升级时按当月剩余天数生成补差账单；
   * 降级时校验当前激活用户数不超过目标套餐 maxUsers 上限。
   */
  async changePlan(id: number, dto: { planId: number; remark?: string }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    if (dto.planId === tenant.planId) {
      throw new BadRequestException('目标套餐与当前套餐相同');
    }

    const targetPlan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!targetPlan) {
      throw new NotFoundException('目标套餐不存在');
    }
    if (targetPlan.status !== 'active') {
      throw new BadRequestException('目标套餐未启用，无法切换');
    }

    const fromPrice = tenant.plan.price.toNumber();
    const toPrice = targetPlan.price.toNumber();
    const changeType =
      toPrice > fromPrice ? 'upgrade' : toPrice < fromPrice ? 'downgrade' : 'change';

    // 降级校验：当前激活用户数不能超过目标套餐上限
    if (targetPlan.maxUsers < tenant.plan.maxUsers) {
      const activeUsers = await this.prisma.tenantUser.count({
        where: { tenantId: id, status: 'active' },
      });
      if (activeUsers > targetPlan.maxUsers) {
        throw new BadRequestException(
          `当前激活用户数 ${activeUsers} 超过目标套餐「${targetPlan.name}」上限 ${targetPlan.maxUsers}，请先减少用户后再降级`,
        );
      }
    }

    // 降级校验：当前存储用量不能超过目标套餐存储上限
    if (targetPlan.maxStorage < tenant.storageUsed) {
      throw new BadRequestException(
        `当前存储用量 ${tenant.storageUsed}GB 超过目标套餐「${targetPlan.name}」上限 ${targetPlan.maxStorage}GB，请先清理存储后再降级`,
      );
    }

    // 升级时按当月剩余天数计算补差
    let priceDiff = 0;
    let remainingDays = 0;
    let daysInMonth = 0;
    const now = new Date();
    if (changeType === 'upgrade') {
      daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      remainingDays = daysInMonth - now.getDate() + 1;
      const rawDiff = ((toPrice - fromPrice) * remainingDays) / daysInMonth;
      priceDiff = Math.round(rawDiff * 100) / 100;
    }

    // 补差账单、变更记录、租户 planId 更新包裹进事务，保证原子性
    return this.prisma.$transaction(async (tx) => {
      let billId: number | null = null;

      if (priceDiff > 0) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 7);
        const bill = await tx.bill.create({
          data: {
            tenantId: id,
            amount: priceDiff,
            billDate: now,
            dueDate,
            status: 'pending',
            type: 'plan_change',
            items: {
              planChange: {
                name: `套餐升级补差（${tenant.plan.name} → ${targetPlan.name}）`,
                amount: priceDiff,
                quantity: 1,
                remainingDays,
                daysInMonth,
              },
            },
            remark: `套餐由「${tenant.plan.name}」升级为「${targetPlan.name}」按剩余 ${remainingDays} 天补差`,
          },
        });
        billId = bill.id;
      }

      await tx.planChangeRecord.create({
        data: {
          tenantId: id,
          fromPlanId: tenant.plan.id,
          fromPlanName: tenant.plan.name,
          toPlanId: targetPlan.id,
          toPlanName: targetPlan.name,
          changeType,
          priceDiff,
          billId,
          remark: dto.remark,
        },
      });

      return tx.tenant.update({
        where: { id },
        data: { planId: targetPlan.id },
        include: { plan: true },
      });
    });
  }
}

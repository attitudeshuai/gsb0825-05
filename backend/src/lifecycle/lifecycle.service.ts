import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// 欠费宽限天数：账单逾期超过该天数后，联动停用租户
export const ARREARS_GRACE_DAYS = 30;

@Injectable()
export class LifecycleService implements OnModuleInit {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(private prisma: PrismaService) {}

  // 启动时先跑一遍，保证停机期间的状态也能被纠正
  async onModuleInit() {
    const result = await this.runAllChecks();
    this.logger.log(
      `启动检查完成：试用到期停用 ${result.trialExpired} 个，账单标记逾期 ${result.billsMarkedOverdue} 条，欠费停用 ${result.tenantsSuspended} 个`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyChecks() {
    const result = await this.runAllChecks();
    this.logger.log(
      `每日生命周期检查完成：试用到期停用 ${result.trialExpired} 个，账单标记逾期 ${result.billsMarkedOverdue} 条，欠费停用 ${result.tenantsSuspended} 个`,
    );
  }

  async runAllChecks() {
    const trialExpired = await this.suspendExpiredTrials();
    const billsMarkedOverdue = await this.markOverdueBills();
    const tenantsSuspended = await this.suspendArrearsTenants();
    return { trialExpired, billsMarkedOverdue, tenantsSuspended };
  }

  // 试用到期：trial 状态且 trialEndsAt 已过 → 停用并标记原因
  async suspendExpiredTrials() {
    const result = await this.prisma.tenant.updateMany({
      where: {
        status: 'trial',
        trialEndsAt: { lt: new Date() },
      },
      data: {
        status: 'suspended',
        suspendReason: 'trial_expired',
      },
    });
    return result.count;
  }

  // 账单逾期：pending 且已过到期日 → overdue
  async markOverdueBills() {
    const result = await this.prisma.bill.updateMany({
      where: {
        status: 'pending',
        dueDate: { lt: new Date() },
      },
      data: { status: 'overdue' },
    });
    return result.count;
  }

  // 长期欠费：存在逾期超过宽限期的账单 → 停用正式租户并标记原因
  async suspendArrearsTenants() {
    const graceDeadline = new Date(
      Date.now() - ARREARS_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );

    const longOverdueBills = await this.prisma.bill.findMany({
      where: {
        status: 'overdue',
        dueDate: { lt: graceDeadline },
        tenant: { status: 'active' },
      },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });

    if (longOverdueBills.length === 0) {
      return 0;
    }

    const tenantIds = longOverdueBills.map((bill) => bill.tenantId);
    const result = await this.prisma.tenant.updateMany({
      where: { id: { in: tenantIds }, status: 'active' },
      data: { status: 'suspended', suspendReason: 'arrears' },
    });
    return result.count;
  }
}

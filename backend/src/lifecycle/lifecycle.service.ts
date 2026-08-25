import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const OVERDUE_SUSPEND_GRACE_DAYS = 30;
const LIFECYCLE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LIFECYCLE_INITIAL_DELAY_MS = 10 * 1000;

@Injectable()
export class LifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LifecycleService.name);
  private timer: NodeJS.Timeout;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    setTimeout(() => {
      this.runLifecycleChecks().catch((err) => {
        this.logger.error(`生命周期初始化检查失败: ${err.message}`, err.stack);
      });
    }, LIFECYCLE_INITIAL_DELAY_MS);

    this.timer = setInterval(() => {
      this.runLifecycleChecks().catch((err) => {
        this.logger.error(`生命周期定时检查失败: ${err.message}`, err.stack);
      });
    }, LIFECYCLE_CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async runLifecycleChecks() {
    const now = new Date();
    const trialExpired = await this.expireTrials(now);
    const overdueMarked = await this.markOverdueBills(now);
    const arrearsSuspended = await this.suspendArrearsTenants(now);

    const summary = {
      checkedAt: now,
      trialExpired,
      overdueMarked,
      arrearsSuspended,
    };
    this.logger.log(
      `生命周期检查完成：试用到期停用 ${trialExpired} 个，账单标记逾期 ${overdueMarked} 张，欠费停用 ${arrearsSuspended} 个租户`,
    );
    return summary;
  }

  async expireTrials(now: Date = new Date()): Promise<number> {
    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        status: 'trial',
        trialEndsAt: { not: null, lt: now },
      },
      select: { id: true, name: true },
    });

    if (expiredTenants.length === 0) {
      return 0;
    }

    const ids = expiredTenants.map((t) => t.id);
    await this.prisma.tenant.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'suspended',
        suspendReason: 'trial_expired',
      },
    });

    this.logger.warn(
      `试用到期已停用租户: ${expiredTenants.map((t) => t.name).join(', ')}`,
    );
    return expiredTenants.length;
  }

  async markOverdueBills(now: Date = new Date()): Promise<number> {
    const result = await this.prisma.bill.updateMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
      data: { status: 'overdue' },
    });

    if (result.count > 0) {
      this.logger.warn(`已标记 ${result.count} 张账单为逾期`);
    }
    return result.count;
  }

  async suspendArrearsTenants(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(
      now.getTime() - OVERDUE_SUSPEND_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );

    const delinquentTenants = await this.prisma.tenant.findMany({
      where: {
        status: 'active',
        bills: {
          some: {
            status: { in: ['pending', 'overdue'] },
            dueDate: { lt: cutoff },
          },
        },
      },
      select: { id: true, name: true },
    });

    if (delinquentTenants.length === 0) {
      return 0;
    }

    const ids = delinquentTenants.map((t) => t.id);
    await this.prisma.tenant.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'suspended',
        suspendReason: 'arrears',
      },
    });

    this.logger.warn(
      `长期欠费已停用租户: ${delinquentTenants.map((t) => t.name).join(', ')}`,
    );
    return delinquentTenants.length;
  }

  async reactivateIfArrearsCleared(tenantId: number): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return false;
    }

    if (tenant.status !== 'suspended' || tenant.suspendReason !== 'arrears') {
      return false;
    }

    const unpaidCount = await this.prisma.bill.count({
      where: {
        tenantId,
        status: { in: ['pending', 'overdue'] },
      },
    });

    if (unpaidCount > 0) {
      return false;
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'active',
        suspendReason: null,
      },
    });

    this.logger.log(`租户 ${tenant.name} 欠费已结清，自动恢复启用`);
    return true;
  }
}

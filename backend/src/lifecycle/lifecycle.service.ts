import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 长期欠费停用阈值：账单逾期超过该天数则停用租户
const ARREARS_SUSPEND_DAYS = 30;
// 定时任务执行间隔（毫秒），此处每小时执行一次
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class LifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LifecycleService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // 启动时立即执行一次，之后按固定间隔轮询
    this.runAll().catch((e) => this.logger.error('初始生命周期检查失败', e));
    this.timer = setInterval(() => {
      this.runAll().catch((e) => this.logger.error('生命周期检查失败', e));
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** 执行全部生命周期检查，返回各步骤处理数量 */
  async runAll() {
    const overdue = await this.markOverdueBills();
    const trial = await this.suspendExpiredTrials();
    const arrears = await this.suspendArrearsTenants();
    const result = { overdue, trialExpired: trial, arrearsSuspended: arrears };
    this.logger.log(`生命周期检查完成: ${JSON.stringify(result)}`);
    return result;
  }

  /** 将已过到期日仍未支付的待支付账单标记为已逾期 */
  async markOverdueBills(): Promise<number> {
    const now = new Date();
    const { count } = await this.prisma.bill.updateMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
      data: { status: 'overdue' },
    });
    return count;
  }

  /** 试用到期自动停用：trialEndsAt 已过且仍为激活状态的租户 */
  async suspendExpiredTrials(): Promise<number> {
    const now = new Date();
    const { count } = await this.prisma.tenant.updateMany({
      where: {
        status: 'active',
        trialEndsAt: { not: null, lt: now },
      },
      data: { status: 'suspended', suspendReason: 'trial_expired' },
    });
    return count;
  }

  /** 长期欠费停用：存在逾期超过阈值天数的未结清账单的租户 */
  async suspendArrearsTenants(): Promise<number> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - ARREARS_SUSPEND_DAYS);

    // 找出存在超期未付账单的租户
    const arrearsBills = await this.prisma.bill.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
        dueDate: { lt: threshold },
      },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });

    let suspended = 0;
    for (const { tenantId } of arrearsBills) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (tenant && tenant.status !== 'suspended') {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { status: 'suspended', suspendReason: 'arrears' },
        });
        suspended++;
      }
    }
    return suspended;
  }

  /**
   * 账单结清后联动：若某租户因欠费被停用，且已无逾期/待支付的超期账单，则恢复激活。
   * 由账单支付流程调用，保持状态一致。
   */
  async reactivateIfCleared(tenantId: number): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || tenant.status !== 'suspended' || tenant.suspendReason !== 'arrears') {
      return;
    }

    const outstanding = await this.prisma.bill.count({
      where: {
        tenantId,
        status: { in: ['pending', 'overdue'] },
      },
    });

    if (outstanding === 0) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'active', suspendReason: null },
      });
      this.logger.log(`租户 ${tenantId} 已结清欠费，自动恢复激活`);
    }
  }
}

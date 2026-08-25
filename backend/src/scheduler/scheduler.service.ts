import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTrialExpiration() {
    this.logger.log('开始检查试用到期租户...');

    const now = new Date();
    const expiredTrials = await this.prisma.tenant.findMany({
      where: {
        trialEndsAt: {
          lt: now,
          not: null,
        },
        status: 'active',
      },
    });

    let suspendedCount = 0;
    for (const tenant of expiredTrials) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          status: 'suspended',
          suspendedAt: now,
          suspendedReason: '试用期已到期',
        },
      });
      suspendedCount++;
      this.logger.log(`租户 ${tenant.name}(${tenant.code}) 因试用到期已停用`);
    }

    this.logger.log(`试用到期检查完成，共停用 ${suspendedCount} 个租户`);
    return { checked: expiredTrials.length, suspended: suspendedCount };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleBillOverdue() {
    this.logger.log('开始检查逾期账单...');

    const now = new Date();
    const overdueBills = await this.prisma.bill.findMany({
      where: {
        status: 'pending',
        dueDate: {
          lt: now,
        },
      },
      include: { tenant: true },
    });

    let overdueCount = 0;
    for (const bill of overdueBills) {
      await this.prisma.bill.update({
        where: { id: bill.id },
        data: { status: 'overdue' },
      });
      overdueCount++;
      this.logger.log(
        `账单 #${bill.id} (租户: ${bill.tenant.name}) 已标记为逾期，到期日: ${bill.dueDate}`
      );
    }

    this.logger.log(`逾期账单检查完成，共标记 ${overdueCount} 笔账单逾期`);
    return { checked: overdueBills.length, overdue: overdueCount };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleLongTermOverdue() {
    this.logger.log('开始检查长期欠费租户...');

    const now = new Date();
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    const tenantsWithOverdue = await this.prisma.tenant.findMany({
      where: {
        status: {
          in: ['active', 'overdue'],
        },
        bills: {
          some: {
            status: 'overdue',
            dueDate: {
              lt: overdueThreshold,
            },
          },
        },
      },
      include: {
        bills: {
          where: {
            status: 'overdue',
            dueDate: { lt: overdueThreshold },
          },
        },
      },
    });

    let suspendedCount = 0;
    for (const tenant of tenantsWithOverdue) {
      const earliestOverdue = tenant.bills.reduce((earliest, bill) => {
        return bill.dueDate < earliest ? bill.dueDate : earliest;
      }, tenant.bills[0].dueDate);

      const overdueDays = Math.floor(
        (now.getTime() - earliestOverdue.getTime()) / (1000 * 60 * 60 * 24)
      );

      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          status: 'suspended',
          suspendedAt: now,
          suspendedReason: `长期欠费（逾期${overdueDays}天）`,
        },
      });
      suspendedCount++;
      this.logger.log(
        `租户 ${tenant.name}(${tenant.code}) 因长期欠费已停用，逾期 ${overdueDays} 天`
      );
    }

    this.logger.log(`长期欠费检查完成，共停用 ${suspendedCount} 个租户`);
    return { checked: tenantsWithOverdue.length, suspended: suspendedCount };
  }

  async runAllChecks() {
    this.logger.log('手动触发所有定时检查任务...');
    const trialResult = await this.handleTrialExpiration();
    const overdueResult = await this.handleBillOverdue();
    const longTermResult = await this.handleLongTermOverdue();

    return {
      trialExpiration: trialResult,
      billOverdue: overdueResult,
      longTermOverdue: longTermResult,
    };
  }
}

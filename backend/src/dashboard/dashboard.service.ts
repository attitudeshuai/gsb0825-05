import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const tenantStats = await this.prisma.tenant.aggregate({
      _count: true,
    });

    const activeTenants = await this.prisma.tenant.count({
      where: { status: 'active' },
    });

    const planStats = await this.prisma.plan.count({
      where: { status: 'active' },
    });

    const billStats = await this.prisma.bill.aggregate({
      _count: true,
      _sum: { amount: true },
    });

    const paidBills = await this.prisma.bill.count({
      where: { status: 'paid' },
    });

    const pendingBills = await this.prisma.bill.count({
      where: { status: 'pending' },
    });

    const paidAmount = await this.prisma.bill.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });

    const overdueBills = await this.prisma.bill.count({
      where: { status: 'overdue' },
    });

    const pendingAmount = await this.prisma.bill.aggregate({
      where: { status: { in: ['pending', 'overdue'] } },
      _sum: { amount: true },
    });

    const newTenantsThisMonth = await this.prisma.tenant.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const recentTenants = await this.prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    const recentBills = await this.prisma.bill.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { tenant: true },
    });

    const revenueByPlan = await this.prisma.plan.findMany({
      where: { status: 'active' },
      include: {
        _count: { select: { tenants: true } },
      },
    });

    const planRevenue = revenueByPlan.map((plan) => ({
      planId: plan.id,
      planName: plan.name,
      tenantCount: plan._count.tenants,
      monthlyRevenue: plan._count.tenants * plan.price.toNumber(),
    }));

    return {
      tenants: {
        total: tenantStats._count,
        active: activeTenants,
        newThisMonth: newTenantsThisMonth,
      },
      plans: {
        total: planStats,
      },
      bills: {
        count: {
          total: billStats._count,
          paid: paidBills,
          pending: pendingBills,
          overdue: overdueBills,
        },
        amount: {
          total: billStats._sum.amount?.toNumber() || 0,
          paid: paidAmount._sum.amount?.toNumber() || 0,
          pending: pendingAmount._sum.amount?.toNumber() || 0,
        },
      },
      recentTenants,
      recentBills,
      planRevenue,
    };
  }
}

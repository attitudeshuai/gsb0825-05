import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto, UpdateBillDto } from './dto/bill.dto';
import { PaginationDto, PaginationResultDto } from '../common/dto/pagination.dto';

@Injectable()
export class BillService {
  constructor(private prisma: PrismaService) {}

  async create(createBillDto: CreateBillDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: createBillDto.tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return this.prisma.bill.create({
      data: {
        ...createBillDto,
        billDate: new Date(createBillDto.billDate),
        dueDate: new Date(createBillDto.dueDate),
        items: createBillDto.items as any,
      },
      include: { tenant: true },
    });
  }

  async findAll(paginationDto: PaginationDto & { status?: string; tenantId?: number }): Promise<PaginationResultDto<any>> {
    const { page = 1, pageSize = 10, keyword, status, tenantId } = paginationDto;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (keyword) {
      where.tenant = {
        OR: [
          { name: { contains: keyword } },
          { code: { contains: keyword } },
        ],
      };
    }
    if (status) {
      where.status = status;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [data, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        skip,
        take: pageSize,
        include: { tenant: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bill.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: number) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { tenant: { include: { plan: true } } },
    });

    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    return bill;
  }

  async update(id: number, updateBillDto: UpdateBillDto) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    const updateData: any = { ...updateBillDto };
    if (updateBillDto.billDate) {
      updateData.billDate = new Date(updateBillDto.billDate);
    }
    if (updateBillDto.dueDate) {
      updateData.dueDate = new Date(updateBillDto.dueDate);
    }
    if (updateBillDto.items) {
      updateData.items = updateBillDto.items as any;
    }

    return this.prisma.bill.update({
      where: { id },
      data: updateData,
      include: { tenant: true },
    });
  }

  async remove(id: number) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    return this.prisma.bill.delete({ where: { id } });
  }

  async updateStatus(id: number, status: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    if (bill.status === 'paid' && status !== 'paid') {
      throw new ConflictException('已支付的账单不能修改为其他状态');
    }

    if (bill.status === 'cancelled' && status !== 'cancelled') {
      throw new ConflictException('已取消的账单不能修改为其他状态');
    }

    const updateData: any = { status };
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: updateData,
      include: { tenant: true },
    });

    if (status === 'paid' && bill.status === 'overdue') {
      const remainingOverdue = await this.prisma.bill.count({
        where: {
          tenantId: bill.tenantId,
          status: 'overdue',
          id: { not: id },
        },
      });

      if (remainingOverdue === 0 && bill.tenant.status === 'suspended') {
        const suspendedReason = bill.tenant.suspendedReason || '';
        if (suspendedReason.includes('欠费') || suspendedReason.includes('逾期')) {
          const trialExpired =
            bill.tenant.trialEndsAt && new Date() > bill.tenant.trialEndsAt;
          if (!trialExpired) {
            await this.prisma.tenant.update({
              where: { id: bill.tenantId },
              data: {
                status: 'active',
                suspendedAt: null,
                suspendedReason: null,
              },
            });
          }
        }
      }
    }

    return updatedBill;
  }

  async getStats() {
    const total = await this.prisma.bill.count();
    const pending = await this.prisma.bill.count({ where: { status: 'pending' } });
    const paid = await this.prisma.bill.count({ where: { status: 'paid' } });
    const overdue = await this.prisma.bill.count({
      where: { status: 'overdue' },
    });

    const totalAmount = await this.prisma.bill.aggregate({
      _sum: { amount: true },
    });

    const paidAmount = await this.prisma.bill.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });

    const pendingAmount = await this.prisma.bill.aggregate({
      where: { status: { in: ['pending', 'overdue'] } },
      _sum: { amount: true },
    });

    return {
      count: { total, pending, paid, overdue },
      amount: {
        total: totalAmount._sum.amount?.toNumber() || 0,
        paid: paidAmount._sum.amount?.toNumber() || 0,
        pending: pendingAmount._sum.amount?.toNumber() || 0,
      },
    };
  }

  async generateMonthlyBills() {
    const now = new Date();
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'active',
        OR: [
          { trialEndsAt: null },
          { trialEndsAt: { lt: now } },
        ],
      },
      include: { plan: true },
    });

    const billDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 10);

    const results = [];
    for (const tenant of tenants) {
      const existingBill = await this.prisma.bill.findFirst({
        where: {
          tenantId: tenant.id,
          billType: 'subscription',
          billDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      });

      if (!existingBill) {
        const planPrice = Number(tenant.plan.price);
        const creditBalance = Number(tenant.creditBalance || 0);
        const deductedCredit = Math.min(creditBalance, planPrice);
        const finalAmount = Math.round((planPrice - deductedCredit) * 100) / 100;

        const bill = await this.prisma.$transaction(async (prisma) => {
          if (deductedCredit > 0) {
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: {
                creditBalance: {
                  decrement: deductedCredit,
                },
              },
            });
          }

          return prisma.bill.create({
            data: {
              tenantId: tenant.id,
              amount: finalAmount,
              billDate,
              dueDate,
              status: finalAmount <= 0 ? 'paid' : 'pending',
              paidAt: finalAmount <= 0 ? now : null,
              billType: 'subscription',
              items: {
                planFee: {
                  name: `${tenant.plan.name}月费`,
                  amount: planPrice,
                  quantity: 1,
                },
                ...(deductedCredit > 0
                  ? {
                      creditDeduction: {
                        name: '账户余额抵扣',
                        amount: -deductedCredit,
                        quantity: 1,
                      },
                    }
                  : {}),
              },
              remark:
                deductedCredit > 0
                  ? `${now.getFullYear()}年${now.getMonth() + 1}月账单（余额抵扣¥${deductedCredit.toFixed(2)}）`
                  : `${now.getFullYear()}年${now.getMonth() + 1}月账单`,
            },
            include: { tenant: true },
          });
        });
        results.push(bill);
      }
    }

    return { generated: results.length, bills: results };
  }
}

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto, UpdateBillDto } from './dto/bill.dto';
import { PaginationDto, PaginationResultDto } from '../common/dto/pagination.dto';
import { LifecycleService } from '../lifecycle/lifecycle.service';

@Injectable()
export class BillService {
  constructor(
    private prisma: PrismaService,
    private lifecycle: LifecycleService,
  ) {}

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
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      throw new NotFoundException('账单不存在');
    }

    if (bill.status === 'paid' && status !== 'paid') {
      throw new ConflictException('已支付的账单不能修改为其他状态');
    }

    const updateData: any = { status };
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const updated = await this.prisma.bill.update({
      where: { id },
      data: updateData,
      include: { tenant: true },
    });

    // 账单结清后，若租户因欠费被停用且已无欠款，自动恢复激活，保持状态一致
    if (status === 'paid') {
      await this.lifecycle.reactivateIfCleared(bill.tenantId);
    }

    return updated;
  }

  async getStats() {
    const total = await this.prisma.bill.count();
    const pending = await this.prisma.bill.count({ where: { status: 'pending' } });
    const paid = await this.prisma.bill.count({ where: { status: 'paid' } });
    // 逾期账单已由定时任务标记为 overdue，同时兼容尚未被标记的过期待支付账单
    const overdue = await this.prisma.bill.count({
      where: {
        OR: [
          { status: 'overdue' },
          { status: 'pending', dueDate: { lt: new Date() } },
        ],
      },
    });

    const totalAmount = await this.prisma.bill.aggregate({
      _sum: { amount: true },
    });

    const paidAmount = await this.prisma.bill.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    });

    // 待收金额包含待支付与已逾期的未结清账单
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
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'active' },
      include: { plan: true },
    });

    const now = new Date();
    const billDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 10);

    const results = [];
    for (const tenant of tenants) {
      const existingBill = await this.prisma.bill.findFirst({
        where: {
          tenantId: tenant.id,
          billDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
      });

      if (!existingBill) {
        const bill = await this.prisma.bill.create({
          data: {
            tenantId: tenant.id,
            amount: tenant.plan.price,
            billDate,
            dueDate,
            status: 'pending',
            items: {
              planFee: {
                name: `${tenant.plan.name}月费`,
                amount: tenant.plan.price.toNumber(),
                quantity: 1,
              },
            },
            remark: `${now.getFullYear()}年${now.getMonth() + 1}月账单`,
          },
          include: { tenant: true },
        });
        results.push(bill);
      }
    }

    return { generated: results.length, bills: results };
  }
}

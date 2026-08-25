import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PaginationDto, PaginationResultDto } from '../common/dto/pagination.dto';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { name: createPlanDto.name },
    });
    if (existing) {
      throw new ConflictException('套餐名称已存在');
    }

    return this.prisma.plan.create({
      data: {
        ...createPlanDto,
        features: createPlanDto.features as any,
      },
    });
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginationResultDto<any>> {
    const { page = 1, pageSize = 10, keyword } = paginationDto;
    const skip = (page - 1) * pageSize;

    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { tenants: true },
          },
        },
        orderBy: { price: 'asc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findAllActive() {
    return this.prisma.plan.findMany({
      where: { status: 'active' },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tenants: true },
        },
        tenants: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('套餐不存在');
    }

    return plan;
  }

  async update(id: number, updatePlanDto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('套餐不存在');
    }

    if (updatePlanDto.name && updatePlanDto.name !== plan.name) {
      const existing = await this.prisma.plan.findUnique({
        where: { name: updatePlanDto.name },
      });
      if (existing) {
        throw new ConflictException('套餐名称已存在');
      }
    }

    const updateData: any = { ...updatePlanDto };
    if (updatePlanDto.features) {
      updateData.features = updatePlanDto.features as any;
    }

    return this.prisma.plan.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('套餐不存在');
    }

    const tenantCount = await this.prisma.tenant.count({ where: { planId: id } });
    if (tenantCount > 0) {
      throw new ConflictException('该套餐下存在租户，无法删除');
    }

    return this.prisma.plan.delete({ where: { id } });
  }

  async updateStatus(id: number, status: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('套餐不存在');
    }

    return this.prisma.plan.update({
      where: { id },
      data: { status },
    });
  }

  async getStats() {
    const total = await this.prisma.plan.count();
    const active = await this.prisma.plan.count({ where: { status: 'active' } });
    const inactive = await this.prisma.plan.count({ where: { status: 'inactive' } });

    const tenantsWithPlans = await this.prisma.tenant.findMany({
      where: { status: 'active' },
      include: {
        plan: {
          select: {
            price: true,
          },
        },
      },
    });

    const totalRevenue = tenantsWithPlans.reduce((sum, tenant) => {
      return sum + Number(tenant.plan.price);
    }, 0);

    return { total, active, inactive, totalRevenue };
  }
}

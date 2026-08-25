import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
      data: createTenantDto,
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
        tenantUsers: true,
        bills: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return tenant;
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
    return this.prisma.tenant.delete({ where: { id } });
  }

  async updateStatus(id: number, status: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { status },
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
}

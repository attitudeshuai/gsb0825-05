import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTenantUserDto,
  UpdateTenantUserDto,
} from './dto/tenant-user.dto';

@Injectable()
export class TenantUserService {
  constructor(private prisma: PrismaService) {}

  private sanitize<T extends { password?: string }>(user: T): Omit<T, 'password'> {
    const { password, ...rest } = user as any;
    return rest;
  }

  private async getTenantOrThrow(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }
    return tenant;
  }

  async findAll(tenantId: number) {
    await this.getTenantOrThrow(tenantId);
    const users = await this.prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.sanitize(u));
  }

  async create(tenantId: number, dto: CreateTenantUserDto) {
    const tenant = await this.getTenantOrThrow(tenantId);

    // 按套餐 maxUsers 上限校验：新增激活用户不能超过上限
    const status = dto.status || 'active';
    if (status === 'active') {
      const activeCount = await this.prisma.tenantUser.count({
        where: { tenantId, status: 'active' },
      });
      if (activeCount >= tenant.plan.maxUsers) {
        throw new BadRequestException(
          `当前套餐「${tenant.plan.name}」最多允许 ${tenant.plan.maxUsers} 个用户，已达上限`,
        );
      }
    }

    const existingByUsername = await this.prisma.tenantUser.findUnique({
      where: { username: dto.username },
    });
    if (existingByUsername) {
      throw new ConflictException('用户名已存在');
    }

    const existingByEmail = await this.prisma.tenantUser.findUnique({
      where: { email: dto.email },
    });
    if (existingByEmail) {
      throw new ConflictException('邮箱已存在');
    }

    const user = await this.prisma.tenantUser.create({
      data: {
        tenantId,
        username: dto.username,
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        role: dto.role || 'user',
        status,
      },
    });

    return this.sanitize(user);
  }

  async update(tenantId: number, userId: number, dto: UpdateTenantUserDto) {
    const tenant = await this.getTenantOrThrow(tenantId);
    const user = await this.prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 从非激活变为激活时，同样受套餐上限约束
    if (dto.status === 'active' && user.status !== 'active') {
      const activeCount = await this.prisma.tenantUser.count({
        where: { tenantId, status: 'active' },
      });
      if (activeCount >= tenant.plan.maxUsers) {
        throw new BadRequestException(
          `当前套餐「${tenant.plan.name}」最多允许 ${tenant.plan.maxUsers} 个用户，已达上限`,
        );
      }
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.tenantUser.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('邮箱已存在');
      }
    }

    const data: any = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.tenantUser.update({
      where: { id: userId },
      data,
    });

    return this.sanitize(updated);
  }

  async updateStatus(tenantId: number, userId: number, status: string) {
    return this.update(tenantId, userId, { status });
  }

  async remove(tenantId: number, userId: number) {
    const user = await this.prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.prisma.tenantUser.delete({ where: { id: userId } });
    return { success: true };
  }
}

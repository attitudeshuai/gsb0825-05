import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant.dto';

@Injectable()
export class TenantUserService {
  constructor(private prisma: PrismaService) {}

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

  private async countActiveUsers(tenantId: number): Promise<number> {
    return this.prisma.tenantUser.count({
      where: { tenantId, status: 'active' },
    });
  }

  async findAll(tenantId: number) {
    await this.getTenantOrThrow(tenantId);

    const users = await this.prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const activeCount = users.filter((u) => u.status === 'active').length;

    return {
      data: users,
      total: users.length,
      activeCount,
    };
  }

  async create(tenantId: number, createUserDto: CreateTenantUserDto) {
    const tenant = await this.getTenantOrThrow(tenantId);

    const activeCount = await this.countActiveUsers(tenantId);
    const willBeActive = createUserDto.status !== 'inactive';
    if (willBeActive && activeCount >= tenant.plan.maxUsers) {
      throw new ConflictException(
        `租户活跃用户数已达套餐上限（${tenant.plan.maxUsers} 人），无法新增用户。请停用多余用户或升级套餐`,
      );
    }

    const existingByUsername = await this.prisma.tenantUser.findUnique({
      where: { username: createUserDto.username },
    });
    if (existingByUsername) {
      throw new ConflictException('用户名已存在');
    }

    const existingByEmail = await this.prisma.tenantUser.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingByEmail) {
      throw new ConflictException('邮箱已被使用');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.tenantUser.create({
      data: {
        tenantId,
        username: createUserDto.username,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role || 'user',
        status: createUserDto.status || 'active',
      },
      select: {
        id: true,
        tenantId: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    tenantId: number,
    userId: number,
    updateUserDto: UpdateTenantUserDto,
  ) {
    await this.getTenantOrThrow(tenantId);

    const user = await this.prisma.tenantUser.findUnique({
      where: { id: userId },
    });
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('租户用户不存在');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.prisma.tenantUser.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existing) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    if (
      updateUserDto.status === 'active' &&
      user.status !== 'active'
    ) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { plan: true },
      });
      const activeCount = await this.countActiveUsers(tenantId);
      if (activeCount >= tenant.plan.maxUsers) {
        throw new ConflictException(
          `租户活跃用户数已达套餐上限（${tenant.plan.maxUsers} 人），无法启用该用户。请停用其他用户或升级套餐`,
        );
      }
    }

    const data: any = {
      email: updateUserDto.email,
      role: updateUserDto.role,
      status: updateUserDto.status,
    };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });

    return this.prisma.tenantUser.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        tenantId: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(tenantId: number, userId: number) {
    await this.getTenantOrThrow(tenantId);

    const user = await this.prisma.tenantUser.findUnique({
      where: { id: userId },
    });
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('租户用户不存在');
    }

    if (user.role === 'admin') {
      const adminCount = await this.prisma.tenantUser.count({
        where: { tenantId, role: 'admin', status: 'active' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('租户至少需要保留一个活跃管理员');
      }
    }

    return this.prisma.tenantUser.delete({ where: { id: userId } });
  }
}

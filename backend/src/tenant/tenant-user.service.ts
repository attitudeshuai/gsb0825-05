import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant-user.dto';

@Injectable()
export class TenantUserService {
  constructor(private prisma: PrismaService) {}

  private async getTenantOrFail(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }
    return tenant;
  }

  // 校验套餐 maxUsers 上限：active 状态的用户占用名额
  private async assertUserQuota(tenantId: number) {
    const tenant = await this.getTenantOrFail(tenantId);
    const activeCount = await this.prisma.tenantUser.count({
      where: { tenantId, status: 'active' },
    });
    if (activeCount >= tenant.plan.maxUsers) {
      throw new BadRequestException(
        `租户用户数已达套餐上限（${tenant.plan.maxUsers} 人），无法新增或启用用户`,
      );
    }
  }

  async findAll(tenantId: number) {
    await this.getTenantOrFail(tenantId);
    const users = await this.prisma.tenantUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ password, ...user }) => user);
  }

  async create(tenantId: number, dto: CreateTenantUserDto) {
    await this.getTenantOrFail(tenantId);

    const status = dto.status || 'active';
    if (status === 'active') {
      await this.assertUserQuota(tenantId);
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

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.tenantUser.create({
      data: {
        tenantId,
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        role: dto.role || 'user',
        status,
      },
    });
    const { password, ...result } = user;
    return result;
  }

  async update(tenantId: number, userId: number, dto: UpdateTenantUserDto) {
    const user = await this.prisma.tenantUser.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 启用用户时需校验套餐上限
    if (dto.status === 'active' && user.status !== 'active') {
      await this.assertUserQuota(tenantId);
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
    if (dto.email) data.email = dto.email;
    if (dto.role) data.role = dto.role;
    if (dto.status) data.status = dto.status;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.tenantUser.update({
      where: { id: userId },
      data,
    });
    const { password, ...result } = updated;
    return result;
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

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantUserService } from './tenant-user.service';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('租户用户管理')
@Controller('api/tenants/:tenantId/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantUserController {
  constructor(private readonly tenantUserService: TenantUserService) {}

  @Get()
  @ApiOperation({ summary: '获取租户用户列表' })
  findAll(@Param('tenantId') tenantId: string) {
    return this.tenantUserService.findAll(+tenantId);
  }

  @Post()
  @ApiOperation({ summary: '新增租户用户（校验套餐 maxUsers 上限）' })
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateTenantUserDto) {
    return this.tenantUserService.create(+tenantId, dto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: '更新租户用户（启用时校验套餐 maxUsers 上限）' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    return this.tenantUserService.update(+tenantId, +userId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: '删除租户用户' })
  remove(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.tenantUserService.remove(+tenantId, +userId);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { TenantUserService } from './tenant-user.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateStatusDto,
  CreateTenantUserDto,
  UpdateTenantUserDto,
  ExtendTrialDto,
  ChangePlanDto,
  UpdateStorageDto,
} from './dto/tenant.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('租户管理')
@Controller('api/tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantUserService: TenantUserService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建租户（trialDays > 0 时创建为试用租户）' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: '获取租户列表' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.tenantService.findAll(paginationDto);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取租户统计信息' })
  getStats() {
    return this.tenantService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取租户详情' })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新租户信息' })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(+id, updateTenantDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新租户状态' })
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.tenantService.updateStatus(+id, updateStatusDto.status);
  }

  @Post(':id/trial/extend')
  @ApiOperation({ summary: '试用延期（试用到期停用后也可用于恢复试用）' })
  extendTrial(
    @Param('id') id: string,
    @Body() extendTrialDto: ExtendTrialDto,
  ) {
    return this.tenantService.extendTrial(+id, extendTrialDto);
  }

  @Post(':id/trial/convert')
  @ApiOperation({ summary: '试用转正' })
  convertTrial(@Param('id') id: string) {
    return this.tenantService.convertTrial(+id);
  }

  @Post(':id/change-plan')
  @ApiOperation({ summary: '切换套餐（生成变更记录，升级时生成补差账单）' })
  changePlan(@Param('id') id: string, @Body() changePlanDto: ChangePlanDto) {
    return this.tenantService.changePlan(+id, changePlanDto);
  }

  @Patch(':id/storage')
  @ApiOperation({ summary: '更新租户存储用量（受套餐 maxStorage 限制）' })
  updateStorage(
    @Param('id') id: string,
    @Body() updateStorageDto: UpdateStorageDto,
  ) {
    return this.tenantService.updateStorage(+id, updateStorageDto);
  }

  @Get(':id/plan-changes')
  @ApiOperation({ summary: '获取租户套餐变更记录' })
  getPlanChanges(@Param('id') id: string) {
    return this.tenantService.getPlanChanges(+id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: '获取租户用户列表' })
  listUsers(@Param('id') id: string) {
    return this.tenantUserService.findAll(+id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: '创建租户用户（受套餐 maxUsers 限制）' })
  createUser(
    @Param('id') id: string,
    @Body() createUserDto: CreateTenantUserDto,
  ) {
    return this.tenantUserService.create(+id, createUserDto);
  }

  @Patch(':id/users/:userId')
  @ApiOperation({ summary: '更新租户用户' })
  updateUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateTenantUserDto,
  ) {
    return this.tenantUserService.update(+id, +userId, updateUserDto);
  }

  @Delete(':id/users/:userId')
  @ApiOperation({ summary: '删除租户用户' })
  removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.tenantUserService.remove(+id, +userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除租户' })
  remove(@Param('id') id: string) {
    return this.tenantService.remove(+id);
  }
}

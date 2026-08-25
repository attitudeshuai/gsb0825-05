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
import { CreateTenantDto, UpdateTenantDto, UpdateStatusDto } from './dto/tenant.dto';
import { CreateTenantUserDto, UpdateTenantUserDto } from './dto/tenant-user.dto';
import { ChangePlanDto, ExtendTrialDto, ConvertTrialDto } from './dto/plan-change.dto';
import { UpdateStorageDto } from './dto/storage.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('租户管理')
@Controller('api/tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: '创建租户' })
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

  @Patch(':id/activate')
  @ApiOperation({ summary: '启用租户' })
  activate(@Param('id') id: string) {
    return this.tenantService.activateTenant(+id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: '停用租户' })
  suspend(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.tenantService.suspendTenant(+id, body.reason || '');
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除租户' })
  remove(@Param('id') id: string) {
    return this.tenantService.remove(+id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: '获取租户用户列表' })
  getTenantUsers(@Param('id') id: string) {
    return this.tenantService.findTenantUsers(+id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: '创建租户用户' })
  createTenantUser(
    @Param('id') id: string,
    @Body() createUserDto: CreateTenantUserDto,
  ) {
    return this.tenantService.createTenantUser(+id, createUserDto);
  }

  @Patch(':id/users/:userId')
  @ApiOperation({ summary: '更新租户用户' })
  updateTenantUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateTenantUserDto,
  ) {
    return this.tenantService.updateTenantUser(+id, +userId, updateUserDto);
  }

  @Delete(':id/users/:userId')
  @ApiOperation({ summary: '删除租户用户' })
  removeTenantUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.tenantService.removeTenantUser(+id, +userId);
  }

  @Post(':id/change-plan')
  @ApiOperation({ summary: '切换租户套餐' })
  changePlan(
    @Param('id') id: string,
    @Body() changePlanDto: ChangePlanDto,
  ) {
    return this.tenantService.changePlan(+id, changePlanDto);
  }

  @Get(':id/plan-changes')
  @ApiOperation({ summary: '获取套餐变更记录' })
  getPlanChanges(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.tenantService.getPlanChanges(+id, paginationDto);
  }

  @Post(':id/extend-trial')
  @ApiOperation({ summary: '延长试用期' })
  extendTrial(
    @Param('id') id: string,
    @Body() extendTrialDto: ExtendTrialDto,
  ) {
    return this.tenantService.extendTrial(+id, extendTrialDto);
  }

  @Post(':id/convert-trial')
  @ApiOperation({ summary: '试用转正' })
  convertTrial(
    @Param('id') id: string,
    @Body() body: ConvertTrialDto,
  ) {
    return this.tenantService.convertTrial(+id, body.remark);
  }

  @Get(':id/storage')
  @ApiOperation({ summary: '查询存储配额使用情况（plan.maxStorage 单位为 GB，存储用量及本接口参数单位均为 MB）' })
  getStorageQuota(
    @Param('id') id: string,
    @Query('requiredMb') requiredMb?: string,
  ) {
    return this.tenantService.checkStorageQuota(+id, requiredMb ? Number(requiredMb) : 0);
  }

  @Post(':id/storage')
  @ApiOperation({ summary: '更新存储使用量（delta 单位：MB，正数增加，负数减少；超 maxStorage 上限将拒绝）' })
  updateStorageUsage(
    @Param('id') id: string,
    @Body() updateStorageDto: UpdateStorageDto,
  ) {
    return this.tenantService.updateStorageUsage(+id, updateStorageDto.delta);
  }
}

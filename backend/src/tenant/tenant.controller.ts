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
import { CreateTenantDto, UpdateTenantDto, UpdateStatusDto, ExtendTrialDto, ChangePlanDto, UpdateStorageDto } from './dto/tenant.dto';
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

  @Post(':id/trial/extend')
  @ApiOperation({ summary: '延长租户试用期' })
  extendTrial(@Param('id') id: string, @Body() dto: ExtendTrialDto) {
    return this.tenantService.extendTrial(+id, dto.trialEndsAt);
  }

  @Post(':id/trial/convert')
  @ApiOperation({ summary: '租户试用转正' })
  convertToFormal(@Param('id') id: string) {
    return this.tenantService.convertToFormal(+id);
  }

  @Post(':id/change-plan')
  @ApiOperation({ summary: '切换租户套餐' })
  changePlan(@Param('id') id: string, @Body() dto: ChangePlanDto) {
    return this.tenantService.changePlan(+id, dto);
  }

  @Patch(':id/storage')
  @ApiOperation({ summary: '更新租户存储用量（按套餐 maxStorage 校验）' })
  updateStorage(@Param('id') id: string, @Body() dto: UpdateStorageDto) {
    return this.tenantService.updateStorage(+id, dto.storageUsed);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除租户' })
  remove(@Param('id') id: string) {
    return this.tenantService.remove(+id);
  }
}

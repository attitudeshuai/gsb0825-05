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
import { PlanService } from './plan.service';
import { CreatePlanDto, UpdatePlanDto, UpdateStatusDto } from './dto/plan.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('套餐管理')
@Controller('api/plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @ApiOperation({ summary: '创建套餐' })
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @Get()
  @ApiOperation({ summary: '获取套餐列表' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.planService.findAll(paginationDto);
  }

  @Get('active')
  @ApiOperation({ summary: '获取所有启用的套餐' })
  findAllActive() {
    return this.planService.findAllActive();
  }

  @Get('stats')
  @ApiOperation({ summary: '获取套餐统计信息' })
  getStats() {
    return this.planService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取套餐详情' })
  findOne(@Param('id') id: string) {
    return this.planService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新套餐信息' })
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(+id, updatePlanDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新套餐状态' })
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.planService.updateStatus(+id, updateStatusDto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除套餐' })
  remove(@Param('id') id: string) {
    return this.planService.remove(+id);
  }
}

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
import { BillService } from './bill.service';
import { CreateBillDto, UpdateBillDto, UpdateStatusDto } from './dto/bill.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('账单管理')
@Controller('api/bills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Post()
  @ApiOperation({ summary: '创建账单' })
  create(@Body() createBillDto: CreateBillDto) {
    return this.billService.create(createBillDto);
  }

  @Post('generate-monthly')
  @ApiOperation({ summary: '批量生成月度账单' })
  generateMonthlyBills() {
    return this.billService.generateMonthlyBills();
  }

  @Get()
  @ApiOperation({ summary: '获取账单列表' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.billService.findAll({
      ...paginationDto,
      status,
      tenantId: tenantId ? +tenantId : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取账单统计信息' })
  getStats() {
    return this.billService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取账单详情' })
  findOne(@Param('id') id: string) {
    return this.billService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新账单信息' })
  update(@Param('id') id: string, @Body() updateBillDto: UpdateBillDto) {
    return this.billService.update(+id, updateBillDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新账单状态' })
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.billService.updateStatus(+id, updateStatusDto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除账单' })
  remove(@Param('id') id: string) {
    return this.billService.remove(+id);
  }
}

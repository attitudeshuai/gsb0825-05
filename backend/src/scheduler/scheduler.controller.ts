import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('定时任务')
@Controller('api/scheduler')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('run-checks')
  @ApiOperation({ summary: '手动触发所有检查任务（试用到期、账单逾期、欠费停用）' })
  runAllChecks() {
    return this.schedulerService.runAllChecks();
  }
}

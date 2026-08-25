import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LifecycleService } from './lifecycle.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('生命周期任务')
@Controller('api/lifecycle')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Post('run')
  @ApiOperation({ summary: '手动触发生命周期检查（试用到期/账单逾期/欠费停用）' })
  run() {
    return this.lifecycleService.runAllChecks();
  }
}

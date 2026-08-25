import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LifecycleService } from './lifecycle.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('租户生命周期')
@Controller('api/lifecycle')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Post('run')
  @ApiOperation({ summary: '手动触发全部生命周期检查（标记逾期、试用到期停用、欠费停用）' })
  run() {
    return this.lifecycleService.runAll();
  }
}

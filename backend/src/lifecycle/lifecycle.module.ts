import { Module } from '@nestjs/common';
import { LifecycleService } from './lifecycle.service';
import { LifecycleController } from './lifecycle.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LifecycleController],
  providers: [LifecycleService],
  exports: [LifecycleService],
})
export class LifecycleModule {}

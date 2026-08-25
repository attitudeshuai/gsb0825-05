import { Module } from '@nestjs/common';
import { BillService } from './bill.service';
import { BillController } from './bill.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';

@Module({
  imports: [PrismaModule, LifecycleModule],
  controllers: [BillController],
  providers: [BillService],
})
export class BillModule {}

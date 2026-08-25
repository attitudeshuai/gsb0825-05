import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantUserService } from './tenant-user.service';
import { TenantController } from './tenant.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantController],
  providers: [TenantService, TenantUserService],
  exports: [TenantService, TenantUserService],
})
export class TenantModule {}

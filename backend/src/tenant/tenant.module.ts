import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantUserService } from './tenant-user.service';
import { TenantUserController } from './tenant-user.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantController, TenantUserController],
  providers: [TenantService, TenantUserService],
})
export class TenantModule {}

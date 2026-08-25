import { Module } from '@nestjs/common';
import { TenantUserService } from './tenant-user.service';
import { TenantUserController } from './tenant-user.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantUserController],
  providers: [TenantUserService],
})
export class TenantUserModule {}

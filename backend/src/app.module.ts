import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantUserModule } from './tenant-user/tenant-user.module';
import { PlanModule } from './plan/plan.module';
import { BillModule } from './bill/bill.module';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    TenantUserModule,
    PlanModule,
    BillModule,
    DashboardModule,
    LifecycleModule,
  ],
})
export class AppModule {}

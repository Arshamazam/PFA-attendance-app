import { Module } from '@nestjs/common';
import { LeaveBalanceController } from './leave-balance.controller';
import { LeaveBalanceService } from './leave-balance.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmployeeCategoriesModule } from 'src/employee-categories/employee-categories.module';

@Module({
  imports:     [EmployeeCategoriesModule],
  controllers: [LeaveBalanceController],
  providers:   [LeaveBalanceService, PrismaService],
  exports:     [LeaveBalanceService],
})
export class LeaveBalanceModule {}

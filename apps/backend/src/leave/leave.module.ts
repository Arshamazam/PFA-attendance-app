import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { LeaveBalanceModule } from 'src/leave-balance/leave-balance.module';

@Module({
  imports:     [LeaveBalanceModule],
  providers:   [LeaveService, PrismaService],
  controllers: [LeaveController],
})
export class LeaveModule {}

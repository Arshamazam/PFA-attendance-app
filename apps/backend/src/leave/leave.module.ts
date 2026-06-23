import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [LeaveService, PrismaService],
  controllers: [LeaveController],
})
export class LeaveModule {}

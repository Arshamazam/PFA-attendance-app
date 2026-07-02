import { Module } from '@nestjs/common';
import { DropdownMasterController } from './dropdown-master.controller';
import { DropdownMasterService } from './dropdown-master.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [DropdownMasterController],
  providers: [DropdownMasterService, PrismaService],
  exports: [DropdownMasterService],
})
export class DropdownMasterModule {}

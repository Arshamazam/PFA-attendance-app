import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeofenceService } from 'src/geofence/geofence.service';

@Module({
  providers: [AttendanceService, PrismaService, GeofenceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}

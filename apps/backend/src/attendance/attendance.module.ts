import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { FaceDetectionService } from './face-detection.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeofenceService } from 'src/geofence/geofence.service';

@Module({
  providers: [AttendanceService, FaceDetectionService, PrismaService, GeofenceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}

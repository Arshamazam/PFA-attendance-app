import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { GeofenceModule } from './geofence/geofence.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [AuthModule, EmployeesModule, AttendanceModule, LeaveModule, GeofenceModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}

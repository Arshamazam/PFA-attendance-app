import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { GeofenceModule } from './geofence/geofence.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmployeeTransfersModule } from './employee-transfers/employee-transfers.module';
import { PerformanceGoalsModule } from './performance-goals/performance-goals.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { DropdownMasterModule } from './dropdown-master/dropdown-master.module';
import { PerformanceReviewModule } from './performance-review/performance-review.module';
import { EmployeeCategoriesModule } from './employee-categories/employee-categories.module';
import { LeaveBalanceModule } from './leave-balance/leave-balance.module';
import { GeofenceSyncModule } from './geofence-sync/geofence-sync.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    GeofenceSyncModule,
    AuthModule,
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    GeofenceModule,
    AnalyticsModule,
    NotificationsModule,
    EmployeeTransfersModule,
    PerformanceGoalsModule,
    AnnouncementsModule,
    DropdownMasterModule,
    PerformanceReviewModule,
    EmployeeCategoriesModule,
    LeaveBalanceModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('gender-count')
  getGenderCount(@Query('department') department?: string) {
    return this.analyticsService.getGenderCount(department);
  }

  @Get('age-gender-distribution')
  getAgeGenderDistribution(@Query('department') department?: string) {
    return this.analyticsService.getAgeGenderDistribution(department);
  }

  @Get('on-leave-today')
  getOnLeaveToday(@Query('department') department?: string) {
    return this.analyticsService.getOnLeaveToday(department);
  }

  @Get('employees-by-department')
  getEmployeesByDepartment() {
    return this.analyticsService.getEmployeesByDepartment();
  }

  @Get('leave-history-6months')
  getLeaveHistory6Months() {
    return this.analyticsService.getLeaveHistory6Months();
  }

  @Get('top-present-employees')
  getTopPresentEmployees(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.analyticsService.getTopPresentEmployees(
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Get('top-absent-employees')
  getTopAbsentEmployees(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.analyticsService.getTopAbsentEmployees(
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }
}

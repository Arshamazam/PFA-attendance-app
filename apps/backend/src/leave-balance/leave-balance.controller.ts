import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { LeaveBalanceService } from './leave-balance.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('leave-balance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveBalanceController {
  constructor(private readonly service: LeaveBalanceService) {}

  @Get('my')
  getMyBalances(@CurrentUser() user: { id: string }, @Query('year') year?: string) {
    return this.service.getBalances(user.id, year);
  }

  @Get('employee/:id')
  @Roles('admin', 'manager', 'super_admin')
  getBalances(@Param('id') id: string, @Query('year') year?: string) {
    return this.service.getBalances(id, year);
  }

  @Post('employee/:id/init')
  @Roles('admin', 'super_admin')
  init(
    @Param('id') id: string,
    @Body() body: { categoryId: string; year?: string },
    ) {
    return this.service.initFromCategory(id, body.categoryId, body.year);
  }

  @Post('employee/:id/adjust')
  @Roles('admin', 'super_admin')
  adjust(
    @Param('id') id: string,
    @Body() body: { leaveType: string; days: number; reason: string; year?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.service.adjust(id, body.leaveType, body.days, body.reason, user.id, body.year);
  }

  @Post('reverse/:logId')
  @Roles('admin', 'super_admin')
  reverse(
    @Param('logId') logId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.service.reverse(logId, body.reason, user.id);
  }

  @Get('logs/:employeeId')
  @Roles('admin', 'manager', 'super_admin')
  getLogs(@Param('employeeId') id: string, @Query('year') year?: string) {
    return this.service.getLogs(id, year);
  }
}

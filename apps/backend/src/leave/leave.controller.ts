import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('request')
  createRequest(@Body() dto: CreateLeaveDto, @CurrentUser() user: { id: string }) {
    return this.leaveService.createRequest(user.id, dto);
  }

  @Get('my-requests')
  getMyRequests(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaveService.getMyRequests(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /** Pending requests assigned to the calling officer's queue */
  @Get('pending-approvals')
  @Roles('admin', 'manager', 'employee', 'super_admin')
  getPendingApprovals(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaveService.getPendingApprovals(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** Approval history (approved + rejected) by the calling officer */
  @Get('my-approvals')
  @Roles('admin', 'manager', 'employee', 'super_admin')
  getMyApprovals(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaveService.getMyApprovals(
      user.id,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** All leave requests — for admin dashboard */
  @Get('all')
  @Roles('admin', 'manager', 'super_admin')
  getAllRequests(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaveService.getAllRequests(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 200,
      status,
    );
  }

  /** All pending — for admin panel */
  @Get('pending')
  @Roles('admin', 'manager', 'super_admin')
  getPendingRequests(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.leaveService.getPendingRequests(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch(':id/approve')
  @Roles('admin', 'manager', 'employee', 'super_admin')
  approve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.leaveService.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles('admin', 'manager', 'employee', 'super_admin')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { rejectionReason?: string },
  ) {
    return this.leaveService.reject(id, user.id, body.rejectionReason);
  }
}

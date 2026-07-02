import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Admin / manager routes ────────────────────────────────────────────

  @Get()
  @Roles('admin', 'manager')
  findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('isRead') isRead?: string,
  ) {
    const readFilter = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return this.notificationsService.findAll(
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
      readFilter,
    );
  }

  @Get('unread-count')
  @Roles('admin', 'manager')
  getUnreadCount() {
    return this.notificationsService.getUnreadCount();
  }

  @Patch('mark-all-read')
  @Roles('admin', 'manager')
  markAllRead() {
    return this.notificationsService.markAllRead();
  }

  @Post()
  @Roles('admin')
  create(
    @Body() body: { type: string; title: string; message: string; relatedEmployeeId?: string; severity?: string },
  ) {
    return this.notificationsService.create(body);
  }

  // ── Employee-scoped routes (accessible by any role) ───────────────────

  /** Returns only notifications addressed to the calling employee */
  @Get('my')
  @Roles('admin', 'manager', 'employee')
  getMyNotifications(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.notificationsService.findForEmployee(
      user.id,
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  /** Unread count for the calling employee only */
  @Get('my/unread-count')
  @Roles('admin', 'manager', 'employee')
  getMyUnreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCountForEmployee(user.id);
  }

  /** Mark all of the calling employee's notifications as read */
  @Patch('my/mark-all-read')
  @Roles('admin', 'manager', 'employee')
  markMyAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllReadForEmployee(user.id);
  }

  // ── Shared (mark single notification read) ────────────────────────────

  @Patch(':id/mark-read')
  @Roles('admin', 'manager', 'employee')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }
}

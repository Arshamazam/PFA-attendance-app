import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /** Admin/manager — all notifications, optionally filtered */
  async findAll(limit = 20, skip = 0, isRead?: boolean) {
    const where: Record<string, unknown> = {};
    if (isRead !== undefined) where.isRead = isRead;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: { relatedEmployee: { select: { id: true, name: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total };
  }

  /** Employee — only notifications addressed to them */
  async findForEmployee(employeeId: string, limit = 20, skip = 0) {
    const where = { relatedEmployeeId: employeeId };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, total };
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead() {
    return this.prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  }

  async markAllReadForEmployee(employeeId: string) {
    return this.prisma.notification.updateMany({
      where: { relatedEmployeeId: employeeId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(dto: {
    type: string;
    title: string;
    message: string;
    relatedEmployeeId?: string;
    severity?: string;
  }) {
    return this.prisma.notification.create({ data: dto });
  }

  /** Admin unread count (all notifications) */
  async getUnreadCount() {
    return { count: await this.prisma.notification.count({ where: { isRead: false } }) };
  }

  /** Employee unread count (only their notifications) */
  async getUnreadCountForEmployee(employeeId: string) {
    return {
      count: await this.prisma.notification.count({
        where: { relatedEmployeeId: employeeId, isRead: false },
      }),
    };
  }
}

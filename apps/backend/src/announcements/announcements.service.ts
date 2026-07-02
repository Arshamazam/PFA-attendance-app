import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  private computeStatus(a: {
    isPublished: boolean;
    isActive: boolean;
    scheduledDate: Date;
    expiryDate: Date | null;
    publishedAt: Date | null;
  }): string {
    const now = new Date();
    if (!a.isActive) return 'Archived';
    if (a.isPublished) {
      if (a.expiryDate && a.expiryDate < now) return 'Expired';
      return 'Published';
    }
    return 'Scheduled';
  }

  async create(dto: CreateAnnouncementDto) {
    const scheduledDate = new Date(dto.scheduledDate);
    if (isNaN(scheduledDate.getTime())) throw new BadRequestException('Invalid scheduledDate');

    let expiryDate: Date | undefined;
    if (dto.expiryDate) {
      expiryDate = new Date(dto.expiryDate);
      if (expiryDate < scheduledDate) throw new BadRequestException('expiryDate must be >= scheduledDate');
    }

    const autoPublish = dto.autoPublish !== false;
    const now = new Date();
    const isDue = scheduledDate <= now;
    const isPublished = autoPublish && isDue;

    const ann = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        description: dto.description,
        content: dto.content,
        type: dto.type,
        priority: dto.priority,
        targetAudience: dto.targetAudience ?? 'All',
        targetDepartment: dto.targetDepartment,
        scheduledDate,
        scheduledTime: dto.scheduledTime ?? '00:00',
        expiryDate,
        imageUrl: dto.imageUrl,
        autoPublish,
        isPublished,
        publishedAt: isPublished ? now : undefined,
      },
    });
    return { ...ann, status: this.computeStatus(ann) };
  }

  async findAll(filters: {
    status?: string;
    type?: string;
    priority?: string;
    search?: string;
    from?: string;
    to?: string;
    skip?: number;
    take?: number;
    sortBy?: string;
    sortDir?: string;
  }) {
    const now = new Date();
    const { status, type, priority, search, from, to, skip = 0, take = 10, sortBy = 'scheduledDate', sortDir = 'desc' } = filters;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (from || to) {
      where.scheduledDate = {};
      if (from) (where.scheduledDate as Record<string, unknown>).gte = new Date(from);
      if (to) (where.scheduledDate as Record<string, unknown>).lte = new Date(to);
    }

    if (status === 'Published') {
      where.isPublished = true;
      where.isActive = true;
      where.OR = [{ expiryDate: null }, { expiryDate: { gt: now } }];
    } else if (status === 'Scheduled') {
      where.isPublished = false;
      where.isActive = true;
    } else if (status === 'Archived') {
      where.isActive = false;
    } else if (status === 'Expired') {
      where.isPublished = true;
      where.expiryDate = { lte: now };
    }

    const validSorts = ['title', 'scheduledDate', 'views', 'priority', 'createdAt'];
    const orderField = validSorts.includes(sortBy) ? sortBy : 'scheduledDate';
    const orderDir = sortDir === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take,
        orderBy: { [orderField]: orderDir },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return { data: data.map((a) => ({ ...a, status: this.computeStatus(a) })), total };
  }

  async findActive(skip = 0, take = 10, department?: string) {
    const now = new Date();
    const where: Record<string, unknown> = {
      isPublished: true,
      isActive: true,
      scheduledDate: { lte: now },
      OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
    };

    if (department) {
      where.AND = [
        { OR: [{ targetAudience: 'All' }, { targetAudience: 'Employees' }, { targetDepartment: department }] },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({ where, skip, take, orderBy: { publishedAt: 'desc' } }),
      this.prisma.announcement.count({ where }),
    ]);
    return { data, total };
  }

  async findOne(id: string) {
    const a = await this.prisma.announcement.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found');
    return { ...a, status: this.computeStatus(a) };
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.scheduledDate) data.scheduledDate = new Date(dto.scheduledDate);
    if (dto.expiryDate) data.expiryDate = new Date(dto.expiryDate);
    delete data.scheduledDate;
    delete data.expiryDate;
    if (dto.scheduledDate) data.scheduledDate = new Date(dto.scheduledDate);
    if (dto.expiryDate) data.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    const ann = await this.prisma.announcement.update({ where: { id }, data });
    return { ...ann, status: this.computeStatus(ann) };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { message: 'Announcement deleted' };
  }

  async publish(id: string) {
    const a = await this.findOne(id);
    if (a.isPublished) throw new BadRequestException('Already published');
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
    return { ...updated, status: this.computeStatus(updated) };
  }

  async archive(id: string) {
    const a = await this.findOne(id);
    if (!a.isActive) throw new BadRequestException('Already archived');
    const updated = await this.prisma.announcement.update({ where: { id }, data: { isActive: false } });
    return { ...updated, status: this.computeStatus(updated) };
  }

  async incrementView(id: string) {
    const updated = await this.prisma.announcement.update({ where: { id }, data: { views: { increment: 1 } } });
    return { views: updated.views };
  }

  async getAnalyticsSummary() {
    const now = new Date();
    const [total, scheduledCount, publishedCount, archivedCount, viewsAgg, mostViewed] = await Promise.all([
      this.prisma.announcement.count(),
      this.prisma.announcement.count({ where: { isPublished: false, isActive: true } }),
      this.prisma.announcement.count({ where: { isPublished: true, isActive: true } }),
      this.prisma.announcement.count({ where: { isActive: false } }),
      this.prisma.announcement.aggregate({ _sum: { views: true }, _avg: { views: true } }),
      this.prisma.announcement.findFirst({ where: { isPublished: true }, orderBy: { views: 'desc' }, select: { title: true, views: true } }),
    ]);
    return {
      total,
      scheduled: scheduledCount,
      published: publishedCount,
      archived: archivedCount,
      totalViews: viewsAgg._sum.views ?? 0,
      avgViews: Math.round(viewsAgg._avg.views ?? 0),
      mostViewed: mostViewed ? { title: mostViewed.title, views: mostViewed.views } : null,
    };
  }

  // Called by scheduler
  async publishDueAnnouncements(notificationsService?: { create: (dto: { type: string; title: string; message: string; severity?: string }) => Promise<unknown> }) {
    const now = new Date();
    const due = await this.prisma.announcement.findMany({
      where: { autoPublish: true, isPublished: false, isActive: true, scheduledDate: { lte: now } },
    });

    for (const a of due) {
      await this.prisma.announcement.update({ where: { id: a.id }, data: { isPublished: true, publishedAt: now } });
      if (notificationsService) {
        await notificationsService.create({
          type: 'Announcement',
          title: a.title,
          message: a.description,
          severity: a.priority === 'Urgent' ? 'Critical' : a.priority === 'High' ? 'Warning' : 'Info',
        }).catch(() => {});
      }
    }
    return due.length;
  }

  async archiveExpiredAnnouncements() {
    const now = new Date();
    const result = await this.prisma.announcement.updateMany({
      where: { expiryDate: { lte: now }, isActive: true, isPublished: true },
      data: { isActive: false },
    });
    return result.count;
  }
}

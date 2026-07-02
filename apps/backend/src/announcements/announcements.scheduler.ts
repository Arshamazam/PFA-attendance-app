import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class AnnouncementsScheduler implements OnModuleInit {
  private readonly logger = new Logger('AnnouncementsScheduler');

  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    // Tick every 60 seconds
    setInterval(() => this.tick(), 60_000);
    // Also run immediately on startup
    setTimeout(() => this.tick(), 5_000);
  }

  private async tick() {
    try {
      const published = await this.announcementsService.publishDueAnnouncements(this.notificationsService);
      if (published > 0) this.logger.log(`Auto-published ${published} announcement(s)`);

      const archived = await this.announcementsService.archiveExpiredAnnouncements();
      if (archived > 0) this.logger.log(`Auto-archived ${archived} expired announcement(s)`);
    } catch (err) {
      this.logger.error('Scheduler tick failed', err);
    }
  }
}

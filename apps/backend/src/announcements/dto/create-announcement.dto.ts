export class CreateAnnouncementDto {
  title: string;
  description: string;
  content: string;
  type: string;
  priority: string;
  targetAudience?: string;
  targetDepartment?: string;
  scheduledDate: string;
  scheduledTime?: string;
  expiryDate?: string;
  imageUrl?: string;
  autoPublish?: boolean;
}

export class UpdateAnnouncementDto {
  title?: string;
  description?: string;
  content?: string;
  type?: string;
  priority?: string;
  targetAudience?: string;
  targetDepartment?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  expiryDate?: string;
  imageUrl?: string;
  autoPublish?: boolean;
}

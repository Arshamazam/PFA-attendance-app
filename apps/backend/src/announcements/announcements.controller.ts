import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/create-announcement.dto';

const announcementImageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'announcements');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `ann-${Date.now()}${extname(file.originalname)}`);
  },
});

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  // ── Image upload ───────────────────────────────────────────────────────────
  @Post('upload-image')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @UseInterceptors(FileInterceptor('image', {
    storage: announcementImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
    },
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/announcements/${file.filename}` };
  }

  // ── Stats (must be before :id) ─────────────────────────────────────────────
  @Get('analytics/summary')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  summary() {
    return this.service.getAnalyticsSummary();
  }

  // ── Active announcements for mobile ────────────────────────────────────────
  @Get('active')
  findActive(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('department') department?: string,
  ) {
    return this.service.findActive(skip ? +skip : 0, take ? +take : 10, department);
  }

  // ── Admin CRUD ─────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  create(@Body() dto: CreateAnnouncementDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.service.findAll({ status, type, priority, search, from, to, skip: skip ? +skip : 0, take: take ? +take : 10, sortBy, sortDir });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Patch(':id/publish')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Patch(':id/archive')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Patch(':id/view')
  view(@Param('id') id: string) {
    return this.service.incrementView(id);
  }
}

import { Controller, Post, Get, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
  ) {}

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'attendance');
          if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Photo upload failed or was interrupted. Please try again.');
    }
    return { url: `/uploads/attendance/${file.filename}` };
  }

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: { id: string }) {
    return this.attendanceService.checkIn(user.id, dto);
  }

  @Post('check-out')
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: { id: string }) {
    return this.attendanceService.checkOut(user.id, dto);
  }

  @Get('my-records')
  getMyRecords(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.attendanceService.getMyRecords(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('all')
  @Roles('admin', 'manager')
  getAllRecords(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getAllRecords(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      employeeId,
      startDate,
      endDate,
    );
  }

  @Get('statistics')
  @Roles('admin', 'manager')
  getStatistics(
    @Query('date') date?: string,
    @Query('zoneId') zoneId?: string,
    @Query('department') department?: string,
  ) {
    return this.attendanceService.getStatistics(date, zoneId, department);
  }

  @Get('trend')
  @Roles('admin', 'manager')
  getTrend(
    @Query('days') days?: string,
    @Query('zoneId') zoneId?: string,
    @Query('department') department?: string,
  ) {
    return this.attendanceService.getTrend(days ? parseInt(days, 10) : 30, zoneId, department);
  }

  @Get('employee/:id')
  @Roles('admin', 'manager')
  getEmployeeRecords(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.attendanceService.getEmployeeRecords(
      id,
      user.id,
      user.role,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}

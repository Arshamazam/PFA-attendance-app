import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PerformanceReviewService } from './performance-review.service';
import { CreateReviewDto, SubmitReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('performance-reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceReviewController {
  constructor(private readonly service: PerformanceReviewService) {}

  @Get('criteria')
  getCriteria() {
    return this.service.getCriteria();
  }

  @Post()
  @Roles('admin', 'manager', 'super_admin')
  create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: { id: string; name?: string },
  ) {
    return this.service.create(dto, user.id, user.name ?? 'Admin');
  }

  @Get()
  @Roles('admin', 'manager', 'super_admin')
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(employeeId, status, page ? +page : 1, limit ? +limit : 20);
  }

  @Get('trends/:employeeId')
  getTrends(@Param('employeeId') employeeId: string) {
    return this.service.getTrends(employeeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/scores')
  @Roles('admin', 'manager', 'super_admin')
  saveScores(
    @Param('id') id: string,
    @Body() body: { scores: { criteriaId: string; score: number; feedback?: string }[] },
  ) {
    return this.service.saveScores(id, body.scores);
  }

  @Post(':id/submit')
  @Roles('admin', 'manager', 'super_admin')
  submit(@Param('id') id: string, @Body() dto: SubmitReviewDto) {
    return this.service.submit(id, dto);
  }

  @Patch(':id/approve')
  @Roles('admin', 'super_admin')
  approve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles('admin', 'super_admin')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { reason?: string },
  ) {
    return this.service.reject(id, user.id, body.reason);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

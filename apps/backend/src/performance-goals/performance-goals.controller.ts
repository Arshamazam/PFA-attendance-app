import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PerformanceGoalsService } from './performance-goals.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('performance-goals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceGoalsController {
  constructor(private readonly service: PerformanceGoalsService) {}

  @Get()
  @Roles('admin', 'manager')
  findAll(@Query('department') department?: string, @Query('employeeId') employeeId?: string) {
    return this.service.findAll(department, employeeId);
  }

  @Get('my')
  @Roles('admin', 'manager', 'employee')
  getMyGoals(@CurrentUser() user: { id: string }) {
    return this.service.findMyGoals(user.id);
  }

  @Post()
  @Roles('admin', 'manager')
  create(@Body() body: { employeeId: string; goalTitle: string; targetValue: number; currentProgress?: number; startDate: string; endDate: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  update(@Param('id') id: string, @Body() body: { currentProgress?: number; goalTitle?: string; targetValue?: number }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

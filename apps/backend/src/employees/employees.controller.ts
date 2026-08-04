import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('admin', 'manager', 'super_admin')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('designation') designation?: string,
  ) {
    return this.employeesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      role,
      search,
      department,
      status,
      designation,
    );
  }

  @Get(':id/geofence-status')
  @Roles('admin', 'manager', 'employee', 'super_admin')
  getGeofenceStatus(@Param('id') id: string) {
    return this.employeesService.getGeofenceStatus(id);
  }

  @Patch(':id/geofence-requirement')
  @Roles('super_admin')
  updateGeofenceRequirement(
    @Param('id') id: string,
    @Body() body: { requiresGeofence: boolean; reason?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.employeesService.updateGeofenceRequirement(
      id,
      body.requiresGeofence,
      body.reason,
      user.id,
    );
  }

  @Get('departments')
  @Roles('admin', 'manager', 'super_admin')
  getDepartments() {
    return this.employeesService.getDepartments();
  }

  @Get('districts')
  @Roles('admin', 'manager', 'super_admin')
  getDistricts() {
    return this.employeesService.getDistricts();
  }

  @Get('check-unique/:field/:value')
  @Roles('admin', 'manager')
  checkUnique(
    @Param('field') field: 'email' | 'cnic' | 'badgeNumber',
    @Param('value') value: string,
  ) {
    return this.employeesService.checkUnique(field, value);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.employeesService.update(id, dto, user.id, user.role);
  }

  @Patch(':id/reset-password')
  @Roles('admin', 'super_admin')
  resetPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    return this.employeesService.resetPassword(id, body.newPassword);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}

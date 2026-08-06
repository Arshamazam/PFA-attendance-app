import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeeTransfersService } from './employee-transfers.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('employee-transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeTransfersController {
  constructor(private readonly service: EmployeeTransfersService) {}

  @Get()
  @Roles('admin', 'manager')
  findAll(
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAll(department, status, page ? +page : 1, limit ? +limit : 20, employeeId);
  }

  @Post()
  @Roles('admin')
  create(
    @Body() body: { employeeId: string; fromDepartment: string; toDepartment: string; transferDate: string; reason?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create({ ...body, approvedBy: user.id });
  }

  @Patch(':id')
  @Roles('admin')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updateStatus(id, body.status, user.id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

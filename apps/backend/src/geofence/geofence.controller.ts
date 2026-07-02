import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { GeofenceService } from './geofence.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('geofence')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  // Read — all roles can list zones (admin needs them for employee assignment)
  @Get()
  @Roles('admin', 'manager', 'employee', 'super_admin')
  findAll() {
    return this.geofenceService.findAll();
  }

  @Get(':id/check-ins')
  @Roles('admin', 'manager', 'super_admin')
  getCheckIns(@Param('id') id: string) {
    return this.geofenceService.getCheckIns(id);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'employee', 'super_admin')
  findOne(@Param('id') id: string) {
    return this.geofenceService.findOne(id);
  }

  // Write — super_admin only creates and manages zones
  @Post()
  @Roles('super_admin')
  create(@Body() dto: CreateZoneDto) {
    return this.geofenceService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin')
  update(@Param('id') id: string, @Body() dto: Partial<CreateZoneDto>) {
    return this.geofenceService.update(id, dto);
  }

  @Patch(':id/activate')
  @Roles('super_admin')
  activate(@Param('id') id: string) {
    return this.geofenceService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @Roles('super_admin')
  deactivate(@Param('id') id: string) {
    return this.geofenceService.setActive(id, false);
  }

  @Delete(':id')
  @Roles('super_admin')
  remove(@Param('id') id: string) {
    return this.geofenceService.remove(id);
  }
}

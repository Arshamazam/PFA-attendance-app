import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { GeofenceService } from './geofence.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('geofence')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Get()
  @Roles('admin', 'manager')
  findAll() {
    return this.geofenceService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'manager')
  findOne(@Param('id') id: string) {
    return this.geofenceService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateZoneDto) {
    return this.geofenceService.create(dto);
  }

  @Patch(':id/activate')
  @Roles('admin')
  activate(@Param('id') id: string) {
    return this.geofenceService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @Roles('admin')
  deactivate(@Param('id') id: string) {
    return this.geofenceService.setActive(id, false);
  }
}

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { DropdownMasterService } from './dropdown-master.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('dropdown-master')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DropdownMasterController {
  constructor(private readonly service: DropdownMasterService) {}

  // ── Public reads (any authenticated role) ────────────────────────────────

  @Get()
  @Roles('admin', 'manager', 'employee', 'super_admin')
  findAll() {
    return this.service.findAll();
  }

  @Get(':fieldType')
  @Roles('admin', 'manager', 'employee', 'super_admin')
  findByType(@Param('fieldType') fieldType: string) {
    return this.service.findByType(fieldType);
  }

  // ── Super Admin write operations ──────────────────────────────────────────

  @Post()
  @Roles('super_admin')
  create(@Body() body: { fieldName: string; fieldLabel: string; fieldType: string; displayOrder?: number }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles('super_admin')
  update(
    @Param('id') id: string,
    @Body() body: { fieldLabel?: string; displayOrder?: number; isActive?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Post(':dropdownId/values')
  @Roles('super_admin')
  addValue(
    @Param('dropdownId') dropdownId: string,
    @Body() body: { value: string; label: string; displayOrder?: number },
  ) {
    return this.service.addValue(dropdownId, body);
  }

  @Patch(':dropdownId/values/:valueId')
  @Roles('super_admin')
  updateValue(
    @Param('dropdownId') dropdownId: string,
    @Param('valueId') valueId: string,
    @Body() body: { label?: string; value?: string; displayOrder?: number; isActive?: boolean },
  ) {
    return this.service.updateValue(dropdownId, valueId, body);
  }

  @Delete(':dropdownId/values/:valueId')
  @Roles('super_admin')
  removeValue(
    @Param('dropdownId') dropdownId: string,
    @Param('valueId') valueId: string,
  ) {
    return this.service.removeValue(dropdownId, valueId);
  }
}

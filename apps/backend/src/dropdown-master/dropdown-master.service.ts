import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DropdownMasterService {
  constructor(private prisma: PrismaService) {}

  /** All dropdown masters with their active values — public read */
  async findAll() {
    return this.prisma.dropdownMaster.findMany({
      where: { isActive: true },
      include: {
        values: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Single dropdown by fieldType with active values */
  async findByType(fieldType: string) {
    const dropdown = await this.prisma.dropdownMaster.findFirst({
      where: { fieldType, isActive: true },
      include: {
        values: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!dropdown) throw new NotFoundException(`Dropdown type "${fieldType}" not found`);
    return dropdown;
  }

  /** Create a new dropdown master (super_admin only) */
  async create(dto: { fieldName: string; fieldLabel: string; fieldType: string; displayOrder?: number }) {
    return this.prisma.dropdownMaster.create({ data: { ...dto }, include: { values: true } });
  }

  /** Update a dropdown master's meta (isActive, label, order) */
  async update(id: string, dto: { fieldLabel?: string; displayOrder?: number; isActive?: boolean }) {
    await this.findMasterOrThrow(id);
    return this.prisma.dropdownMaster.update({ where: { id }, data: dto, include: { values: true } });
  }

  /** Add a value to an existing dropdown */
  async addValue(dropdownId: string, dto: { value: string; label: string; displayOrder?: number }) {
    await this.findMasterOrThrow(dropdownId);
    return this.prisma.dropdownValue.create({ data: { dropdownId, ...dto } });
  }

  /** Update an existing value */
  async updateValue(dropdownId: string, valueId: string, dto: { label?: string; value?: string; displayOrder?: number; isActive?: boolean }) {
    await this.findValueOrThrow(dropdownId, valueId);
    return this.prisma.dropdownValue.update({ where: { id: valueId }, data: dto });
  }

  /** Soft-delete (deactivate) a dropdown value */
  async removeValue(dropdownId: string, valueId: string) {
    await this.findValueOrThrow(dropdownId, valueId);
    await this.prisma.dropdownValue.update({ where: { id: valueId }, data: { isActive: false } });
    return { success: true, message: 'Value removed' };
  }

  private async findMasterOrThrow(id: string) {
    const d = await this.prisma.dropdownMaster.findUnique({ where: { id } });
    if (!d) throw new NotFoundException(`Dropdown ${id} not found`);
    return d;
  }

  private async findValueOrThrow(dropdownId: string, valueId: string) {
    const v = await this.prisma.dropdownValue.findFirst({ where: { id: valueId, dropdownId } });
    if (!v) throw new NotFoundException(`Value ${valueId} not found in dropdown ${dropdownId}`);
    return v;
  }
}

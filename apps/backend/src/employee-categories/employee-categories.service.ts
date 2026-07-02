import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

export const LEAVE_TYPES = ['Annual', 'Casual', 'Medical', 'Sick', 'Extraordinary', 'Earned', 'Compensatory', 'Unpaid'];

const DEFAULT_CATEGORIES = [
  { name: 'Grade A', description: 'Senior Inspector', annualLeaves: 20, casualLeaves: 8, medicalLeaves: 5, sickLeaves: 10, extraordinaryLeaves: 2, earnedLeaves: 5, compensatoryLeaves: 3, carryForwardLimit: 5, maxConsecutiveDays: 30, advanceNoticeDays: 5 },
  { name: 'Grade B', description: 'Junior Inspector',  annualLeaves: 15, casualLeaves: 6, medicalLeaves: 3, sickLeaves: 8,  extraordinaryLeaves: 1, earnedLeaves: 3, compensatoryLeaves: 2, carryForwardLimit: 3, maxConsecutiveDays: 15, advanceNoticeDays: 7 },
  { name: 'Grade C', description: 'Support Staff',    annualLeaves: 12, casualLeaves: 5, medicalLeaves: 3, sickLeaves: 6,  extraordinaryLeaves: 1, earnedLeaves: 2, compensatoryLeaves: 0, carryForwardLimit: 2, maxConsecutiveDays: 10, advanceNoticeDays: 10 },
  { name: 'Manager', description: 'Manager',          annualLeaves: 25, casualLeaves: 10,medicalLeaves: 7, sickLeaves: 12, extraordinaryLeaves: 3, earnedLeaves: 7, compensatoryLeaves: 5, carryForwardLimit: 7, maxConsecutiveDays: 45, advanceNoticeDays: 3 },
];

@Injectable()
export class EmployeeCategoriesService {
  constructor(private prisma: PrismaService) {}

  async seedDefaults() {
    const count = await this.prisma.employeeCategory.count();
    if (count > 0) return;
    await this.prisma.employeeCategory.createMany({ data: DEFAULT_CATEGORIES });
  }

  async findAll() {
    await this.seedDefaults();
    return this.prisma.employeeCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.employeeCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.employeeCategory.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Category name already exists');
    return this.prisma.employeeCategory.create({ data: { ...dto } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.employeeCategory.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const cat = await this.findOne(id);
    const empCount = await this.prisma.employee.count({ where: { categoryId: id } });
    if (empCount > 0) throw new ConflictException(`Cannot delete: ${empCount} employees assigned to this category`);
    await this.prisma.employeeCategory.delete({ where: { id } });
    return { message: 'Category deleted', name: cat.name };
  }

  /** Allocation map from a category row */
  allocationMap(cat: { annualLeaves: number; casualLeaves: number; medicalLeaves: number; sickLeaves: number; extraordinaryLeaves: number; earnedLeaves: number; compensatoryLeaves: number; unpaidLeaves: number }) {
    return {
      Annual:        cat.annualLeaves,
      Casual:        cat.casualLeaves,
      Medical:       cat.medicalLeaves,
      Sick:          cat.sickLeaves,
      Extraordinary: cat.extraordinaryLeaves,
      Earned:        cat.earnedLeaves,
      Compensatory:  cat.compensatoryLeaves,
      Unpaid:        cat.unpaidLeaves,
    };
  }
}

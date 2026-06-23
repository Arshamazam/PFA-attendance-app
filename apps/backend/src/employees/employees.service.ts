import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where: { deletedAt: null },
        select: SAFE_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where: { deletedAt: null } }),
    ]);

    return { data: employees, total, page, limit };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      select: SAFE_SELECT,
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const employee = await this.prisma.employee.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role ?? 'employee',
      },
      select: SAFE_SELECT,
    });

    this.logger.log(`Employee created: ${employee.email}`);
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto, requesterId: string, requesterRole: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    if (requesterId !== id && requesterRole !== 'admin') {
      throw new ForbiddenException('Can only update your own profile');
    }

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.role && requesterRole === 'admin') data.role = dto.role;

    const updated = await this.prisma.employee.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });

    this.logger.log(`Employee updated: ${updated.email} by ${requesterId}`);
    return updated;
  }

  async remove(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Employee soft-deleted: ${id}`);
    return { message: 'Employee deleted successfully' };
  }
}

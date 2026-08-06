import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EmployeeTransfersService {
  constructor(private prisma: PrismaService) {}

  async findAll(department?: string, status?: string, page = 1, limit = 20, employeeId?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (department) where.OR = [{ fromDepartment: department }, { toDepartment: department }];

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.employeeTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true, department: true } },
          approver: { select: { id: true, name: true } },
        },
      }),
      this.prisma.employeeTransfer.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async create(dto: {
    employeeId: string;
    fromDepartment: string;
    toDepartment: string;
    transferDate: string;
    reason?: string;
    approvedBy?: string;
  }) {
    // Admin transfers are auto-approved: create record and update employee district immediately
    const transfer = await this.prisma.employeeTransfer.create({
      data: {
        ...dto,
        transferDate: new Date(dto.transferDate),
        status: 'Approved',
        updatedAt: new Date(),
      },
      include: {
        employee: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    // Immediately move the employee to the new district
    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { department: dto.toDepartment },
    });

    return transfer;
  }

  async updateStatus(id: string, status: string, approvedBy?: string) {
    const transfer = await this.prisma.employeeTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Transfer not found');

    const updated = await this.prisma.employeeTransfer.update({
      where: { id },
      data: { status, ...(approvedBy ? { approvedBy } : {}), updatedAt: new Date() },
    });

    // If approved, update employee's department
    if (status === 'Approved') {
      await this.prisma.employee.update({
        where: { id: transfer.employeeId },
        data: { department: transfer.toDepartment },
      });
    }
    return updated;
  }

  async remove(id: string) {
    return this.prisma.employeeTransfer.delete({ where: { id } });
  }
}

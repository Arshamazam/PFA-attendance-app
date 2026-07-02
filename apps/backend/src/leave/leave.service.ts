import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveBalanceService } from 'src/leave-balance/leave-balance.service';

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  department: true,
  designation: true,
} as const;

function computeDays(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private prisma: PrismaService,
    private leaveBalance: LeaveBalanceService,
  ) {}

  async createRequest(employeeId: string, dto: CreateLeaveDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    // Inherit reporting officer from employee profile
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { reportingOfficerId: true },
    });

    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: start,
        endDate: end,
        reason: dto.reason,
        leaveType: dto.leaveType ?? 'Casual',
        status: 'pending',
        reportingOfficerId: emp?.reportingOfficerId ?? null,
        updatedAt: new Date(),
      },
      include: { employee: { select: EMPLOYEE_SELECT } },
    });

    this.logger.log(`Leave request created by employee ${employeeId}`);
    return { ...request, days: computeDays(start, end) };
  }

  async getMyRequests(employeeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { employeeId },
        include: { approver: { select: { id: true, name: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveRequest.count({ where: { employeeId } }),
    ]);

    const data = requests.map((r) => ({
      ...r,
      days: computeDays(r.startDate, r.endDate),
    }));

    return { data, total, page, limit };
  }

  /** All pending requests — for admin panel */
  async getPendingRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { status: 'pending' },
        include: { employee: { select: EMPLOYEE_SELECT } },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.leaveRequest.count({ where: { status: 'pending' } }),
    ]);

    const data = requests.map((r) => ({
      ...r,
      days: computeDays(r.startDate, r.endDate),
    }));

    return { data, total, page, limit };
  }

  /** Pending requests where current officer is the reporting officer */
  async getPendingApprovals(officerId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { reportingOfficerId: officerId, status: 'pending' },
        include: { employee: { select: EMPLOYEE_SELECT } },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.leaveRequest.count({
        where: { reportingOfficerId: officerId, status: 'pending' },
      }),
    ]);

    const data = requests.map((r) => ({
      ...r,
      days: computeDays(r.startDate, r.endDate),
    }));

    return { data, total, page, limit };
  }

  /** History of requests this officer approved or rejected */
  async getMyApprovals(officerId: string, status?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { approvedBy: officerId };
    if (status && status !== 'all') where.status = status;

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: { employee: { select: EMPLOYEE_SELECT } },
        skip,
        take: limit,
        orderBy: { approvedAt: 'desc' },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    const data = requests.map((r) => ({
      ...r,
      days: computeDays(r.startDate, r.endDate),
    }));

    return { data, total, page, limit };
  }

  async approve(id: string, approverId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, status: 'pending' },
    });

    if (!request) {
      throw new NotFoundException('Pending leave request not found');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        employee: { select: EMPLOYEE_SELECT },
        approver: { select: { id: true, name: true } },
      },
    });

    // Auto-deduct leave balance (silently skips if no balance record exists)
    await this.leaveBalance.deductOnApproval(id, approverId).catch(() => null);

    this.logger.log(`Leave request ${id} approved by ${approverId}`);
    return updated;
  }

  async reject(id: string, approverId: string, rejectionReason?: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, status: 'pending' },
    });

    if (!request) {
      throw new NotFoundException('Pending leave request not found');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason?.trim() ?? null,
        updatedAt: new Date(),
      },
      include: {
        employee: { select: EMPLOYEE_SELECT },
        approver: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Leave request ${id} rejected by ${approverId}`);
    return updated;
  }
}

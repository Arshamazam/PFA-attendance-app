import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(private prisma: PrismaService) {}

  async createRequest(employeeId: string, dto: CreateLeaveDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: start,
        endDate: end,
        reason: dto.reason,
        status: 'pending',
        updatedAt: new Date(),
      },
      include: { employee: { select: { id: true, name: true, email: true } } },
    });

    this.logger.log(`Leave request created by employee ${employeeId}`);
    return request;
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

    return { data: requests, total, page, limit };
  }

  async getPendingRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { status: 'pending' },
        include: { employee: { select: { id: true, name: true, email: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.leaveRequest.count({ where: { status: 'pending' } }),
    ]);

    return { data: requests, total, page, limit };
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
      data: { status: 'approved', approvedBy: approverId, updatedAt: new Date() },
      include: { employee: { select: { id: true, name: true, email: true } } },
    });

    this.logger.log(`Leave request ${id} approved by ${approverId}`);
    return updated;
  }

  async reject(id: string, approverId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, status: 'pending' },
    });

    if (!request) {
      throw new NotFoundException('Pending leave request not found');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'rejected', approvedBy: approverId, updatedAt: new Date() },
      include: { employee: { select: { id: true, name: true, email: true } } },
    });

    this.logger.log(`Leave request ${id} rejected by ${approverId}`);
    return updated;
  }
}

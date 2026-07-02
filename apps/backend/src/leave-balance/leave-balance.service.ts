import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmployeeCategoriesService } from 'src/employee-categories/employee-categories.service';

function fiscalYear(date = new Date()) {
  return String(date.getFullYear());
}

@Injectable()
export class LeaveBalanceService {
  constructor(
    private prisma: PrismaService,
    private categories: EmployeeCategoriesService,
  ) {}

  // ── Get balances for an employee ─────────────────────────────────────────
  async getBalances(employeeId: string, year?: string) {
    const fy = year ?? fiscalYear();
    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId, fiscalYear: fy },
      orderBy: { leaveType: 'asc' },
      include: {
        deductionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    return { fiscalYear: fy, balances };
  }

  // ── Initialise leave balances from a category ─────────────────────────────
  async initFromCategory(employeeId: string, categoryId: string, year?: string) {
    const fy  = year ?? fiscalYear();
    const cat = await this.categories.findOne(categoryId);
    const map = this.categories.allocationMap(cat);

    const results = await Promise.all(
      Object.entries(map).map(([leaveType, alloc]) =>
        this.prisma.leaveBalance.upsert({
          where:  { employeeId_leaveType_fiscalYear: { employeeId, leaveType, fiscalYear: fy } },
          create: { employeeId, leaveType, fiscalYear: fy, totalAllocation: alloc, balanceRemaining: alloc },
          update: { totalAllocation: alloc, balanceRemaining: { set: Math.max(0, alloc) } },
        }),
      ),
    );
    return results;
  }

  // ── Auto-deduct on leave approval ─────────────────────────────────────────
  async deductOnApproval(leaveRequestId: string, actionById: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } });
    if (!req) return;

    const days = Math.ceil((req.endDate.getTime() - req.startDate.getTime()) / 86400000) + 1;
    const fy   = fiscalYear(req.startDate);

    const balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveType_fiscalYear: { employeeId: req.employeeId, leaveType: req.leaveType, fiscalYear: fy } },
    });

    if (!balance) return; // no balance record — skip silently (legacy employees without category)

    const before = balance.balanceRemaining;
    const after  = Math.max(0, before - days);

    const updated = await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data:  { totalUsed: { increment: days }, balanceRemaining: after },
    });

    await this.prisma.leaveDeductionLog.create({
      data: {
        employeeId:     req.employeeId,
        leaveType:      req.leaveType,
        leaveRequestId: leaveRequestId,
        balanceId:      balance.id,
        deductionType:  'APPROVAL',
        daysDeducted:   days,
        balanceBefore:  before,
        balanceAfter:   after,
        actionBy:       actionById,
        reason:         `Leave approved: ${req.startDate.toISOString().slice(0, 10)} – ${req.endDate.toISOString().slice(0, 10)}`,
      },
    });

    return updated;
  }

  // ── Manual adjustment (add or subtract) ──────────────────────────────────
  async adjust(
    employeeId: string,
    leaveType: string,
    days: number,
    reason: string,
    actionById: string,
    year?: string,
  ) {
    const fy = year ?? fiscalYear();
    let balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveType_fiscalYear: { employeeId, leaveType, fiscalYear: fy } },
    });

    if (!balance) {
      balance = await this.prisma.leaveBalance.create({
        data: { employeeId, leaveType, fiscalYear: fy, totalAllocation: 0, balanceRemaining: 0 },
      });
    }

    const before = balance.balanceRemaining;
    const after  = Math.max(0, before + days);

    const updated = await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalAllocation:  days > 0 ? { increment: days } : balance.totalAllocation,
        totalUsed:        days < 0 ? { increment: Math.abs(days) } : balance.totalUsed,
        balanceRemaining: after,
        lastUpdatedBy:    actionById,
        lastUpdateReason: reason,
      },
    });

    await this.prisma.leaveDeductionLog.create({
      data: {
        employeeId,
        leaveType,
        balanceId:     balance.id,
        deductionType: 'MANUAL',
        daysDeducted:  -days, // positive log = deduction, negative = addition
        balanceBefore: before,
        balanceAfter:  after,
        actionBy:      actionById,
        reason,
      },
    });

    await this.prisma.notification.create({
      data: {
        type:              'Leave Balance',
        title:             days > 0 ? `${days} ${leaveType} leave(s) added` : `${Math.abs(days)} ${leaveType} leave(s) deducted`,
        message:           `${reason}. Balance: ${after} days remaining.`,
        relatedEmployeeId: employeeId,
        severity:          'Info',
      },
    });

    return updated;
  }

  // ── Reverse a deduction ───────────────────────────────────────────────────
  async reverse(logId: string, reason: string, actionById: string) {
    const log = await this.prisma.leaveDeductionLog.findUnique({
      where: { id: logId },
      include: { balance: true },
    });
    if (!log) throw new NotFoundException('Deduction log not found');
    if (log.isReversed) throw new BadRequestException('Already reversed');

    const before = log.balance.balanceRemaining;
    const after  = before + log.daysDeducted;

    await this.prisma.leaveBalance.update({
      where: { id: log.balanceId },
      data:  { totalUsed: { decrement: log.daysDeducted }, balanceRemaining: after },
    });

    const reversal = await this.prisma.leaveDeductionLog.create({
      data: {
        employeeId:    log.employeeId,
        leaveType:     log.leaveType,
        balanceId:     log.balanceId,
        deductionType: 'REVERSAL',
        daysDeducted:  -log.daysDeducted,
        balanceBefore: before,
        balanceAfter:  after,
        actionBy:      actionById,
        reason,
        reversalId:    logId,
      },
    });

    await this.prisma.leaveDeductionLog.update({
      where: { id: logId },
      data:  { isReversed: true, reversalId: reversal.id, reversedAt: new Date(), reversedBy: actionById, reversalReason: reason },
    });

    await this.prisma.notification.create({
      data: {
        type:              'Leave Balance',
        title:             `${log.daysDeducted} ${log.leaveType} leave(s) restored`,
        message:           `${reason}. Balance: ${after} days remaining.`,
        relatedEmployeeId: log.employeeId,
        severity:          'Info',
      },
    });

    return { reversal, newBalance: after };
  }

  // ── Deduction history ─────────────────────────────────────────────────────
  async getLogs(employeeId: string, year?: string) {
    const fy = year ?? fiscalYear();
    return this.prisma.leaveDeductionLog.findMany({
      where: { employeeId, balance: { fiscalYear: fy } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getGenderCount(department?: string) {
    const where: Record<string, unknown> = { deletedAt: null, active: true };
    if (department) where.department = department;

    const employees = await this.prisma.employee.findMany({ where, select: { gender: true, department: true } });

    const result = { male: 0, female: 0, other: 0, total: 0, byDepartment: {} as Record<string, { male: number; female: number; other: number }> };
    for (const e of employees) {
      const g = (e.gender ?? 'other').toLowerCase();
      const key = g === 'male' ? 'male' : g === 'female' ? 'female' : 'other';
      result[key]++;
      result.total++;
      if (e.department) {
        if (!result.byDepartment[e.department]) result.byDepartment[e.department] = { male: 0, female: 0, other: 0 };
        result.byDepartment[e.department][key]++;
      }
    }
    return result;
  }

  async getAgeGenderDistribution(department?: string) {
    const where: Record<string, unknown> = { deletedAt: null, active: true, dateOfBirth: { not: null } };
    if (department) where.department = department;

    const employees = await this.prisma.employee.findMany({ where, select: { gender: true, dateOfBirth: true } });
    const groups: Record<string, { male: number; female: number }> = {
      '20-25': { male: 0, female: 0 },
      '26-30': { male: 0, female: 0 },
      '31-35': { male: 0, female: 0 },
      '36-40': { male: 0, female: 0 },
      '40+': { male: 0, female: 0 },
    };

    const now = new Date();
    for (const e of employees) {
      if (!e.dateOfBirth) continue;
      const age = now.getFullYear() - new Date(e.dateOfBirth).getFullYear();
      const bucket = age <= 25 ? '20-25' : age <= 30 ? '26-30' : age <= 35 ? '31-35' : age <= 40 ? '36-40' : '40+';
      const g = (e.gender ?? '').toLowerCase() === 'female' ? 'female' : 'male';
      groups[bucket][g]++;
    }
    return Object.entries(groups).map(([ageGroup, counts]) => ({ ageGroup, ...counts }));
  }

  async getOnLeaveToday(department?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: Record<string, unknown> = {
      status: 'approved',
      startDate: { lte: tomorrow },
      endDate: { gte: today },
    };

    const leaves = await this.prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { id: true, name: true, department: true } } },
    });

    const filtered = department ? leaves.filter((l) => l.employee?.department === department) : leaves;
    const byDepartment: Record<string, number> = {};
    const employees = filtered.map((l) => {
      const dept = l.employee?.department ?? 'Unknown';
      byDepartment[dept] = (byDepartment[dept] ?? 0) + 1;
      return {
        id: l.employee?.id,
        name: l.employee?.name,
        department: dept,
        leaveType: l.leaveType,
        returnDate: l.endDate,
        reason: l.reason,
      };
    });

    return { count: employees.length, employees, byDepartment };
  }

  async getEmployeesByDepartment() {
    const employees = await this.prisma.employee.findMany({
      where: { deletedAt: null, active: true },
      select: { department: true },
    });
    const map: Record<string, number> = {};
    for (const e of employees) {
      const d = e.department ?? 'Unknown';
      map[d] = (map[d] ?? 0) + 1;
    }
    const total = employees.length || 1;
    return Object.entries(map).map(([department, count]) => ({
      department,
      count,
      percentage: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }

  async getLeaveHistory6Months() {
    const now = new Date();
    const result: { month: string; approved: number; rejected: number; pending: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const leaves = await this.prisma.leaveRequest.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { status: true },
      });
      result.push({
        month: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
        approved: leaves.filter((l) => l.status === 'approved').length,
        rejected: leaves.filter((l) => l.status === 'rejected').length,
        pending: leaves.filter((l) => l.status === 'pending').length,
      });
    }
    return result;
  }

  async getTopPresentEmployees(month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth();
    const y = year ?? now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const records = await this.prisma.attendance.findMany({
      where: { checkInTime: { gte: start, lte: end } },
      include: { employee: { select: { id: true, name: true, department: true } } },
    });

    const map: Record<string, { name: string; department: string; days: number }> = {};
    for (const r of records) {
      const id = r.employeeId;
      if (!map[id]) map[id] = { name: r.employee?.name ?? '—', department: r.employee?.department ?? '—', days: 0 };
      map[id].days++;
    }
    const workDays = 22;
    return Object.entries(map)
      .sort((a, b) => b[1].days - a[1].days)
      .slice(0, 10)
      .map(([employeeId, data], i) => ({
        rank: i + 1,
        employeeId,
        name: data.name,
        department: data.department,
        presentDays: data.days,
        attendanceRate: `${Math.min(100, Math.round((data.days / workDays) * 100))}%`,
      }));
  }

  async getTopAbsentEmployees(month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth();
    const y = year ?? now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const [records, employees] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { checkInTime: { gte: start, lte: end } },
        select: { employeeId: true },
      }),
      this.prisma.employee.findMany({
        where: { deletedAt: null, active: true },
        select: { id: true, name: true, department: true },
      }),
    ]);

    const workDays = 22;
    const presentMap: Record<string, number> = {};
    for (const r of records) presentMap[r.employeeId] = (presentMap[r.employeeId] ?? 0) + 1;

    return employees
      .map((e) => ({
        employeeId: e.id,
        name: e.name,
        department: e.department ?? '—',
        presentDays: presentMap[e.id] ?? 0,
        absentDays: workDays - (presentMap[e.id] ?? 0),
        attendanceRate: `${Math.min(100, Math.round(((presentMap[e.id] ?? 0) / workDays) * 100))}%`,
      }))
      .sort((a, b) => b.absentDays - a.absentDays)
      .slice(0, 10)
      .map((e, i) => ({ rank: i + 1, ...e }));
  }
}

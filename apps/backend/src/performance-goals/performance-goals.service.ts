import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

function computeStatus(progress: number, target: number, endDate: Date): string {
  const pct = target > 0 ? (progress / target) * 100 : 0;
  if (pct >= 100) return 'Completed';
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / 86400000);
  if (pct >= 75) return 'On Track';
  if (pct >= 50 || daysLeft > 30) return 'In Progress';
  return 'At Risk';
}

@Injectable()
export class PerformanceGoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(department?: string, employeeId?: string) {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (department) {
      where.employee = { department };
    }

    const goals = await this.prisma.performanceGoal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { id: true, name: true, department: true } } },
    });

    return goals.map((g) => ({
      ...g,
      percentage: Math.round(g.targetValue > 0 ? (g.currentProgress / g.targetValue) * 100 : 0),
      status: computeStatus(g.currentProgress, g.targetValue, g.endDate),
    }));
  }

  async findMyGoals(employeeId: string) {
    return this.findAll(undefined, employeeId);
  }

  async create(dto: {
    employeeId: string;
    goalTitle: string;
    targetValue: number;
    currentProgress?: number;
    startDate: string;
    endDate: string;
  }) {
    const goal = await this.prisma.performanceGoal.create({
      data: {
        employeeId: dto.employeeId,
        goalTitle: dto.goalTitle,
        targetValue: dto.targetValue,
        currentProgress: dto.currentProgress ?? 0,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        updatedAt: new Date(),
      },
    });
    return {
      ...goal,
      percentage: Math.round(goal.targetValue > 0 ? (goal.currentProgress / goal.targetValue) * 100 : 0),
      status: computeStatus(goal.currentProgress, goal.targetValue, goal.endDate),
    };
  }

  async update(id: string, dto: { currentProgress?: number; goalTitle?: string; targetValue?: number }) {
    const goal = await this.prisma.performanceGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');

    const updated = await this.prisma.performanceGoal.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    });
    return {
      ...updated,
      percentage: Math.round(updated.targetValue > 0 ? (updated.currentProgress / updated.targetValue) * 100 : 0),
      status: computeStatus(updated.currentProgress, updated.targetValue, updated.endDate),
    };
  }

  async remove(id: string) {
    return this.prisma.performanceGoal.delete({ where: { id } });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto, SubmitReviewDto } from './dto/create-review.dto';

const DEFAULT_CRITERIA = [
  { name: 'Attendance & Punctuality',    description: 'Regularity, timeliness and adherence to schedule', weight: 20, displayOrder: 1 },
  { name: 'Productivity & Output',       description: 'Quality and quantity of work completed',           weight: 25, displayOrder: 2 },
  { name: 'Teamwork & Collaboration',    description: 'Working with colleagues and supporting team goals', weight: 20, displayOrder: 3 },
  { name: 'Communication Skills',        description: 'Clarity of verbal and written communication',      weight: 20, displayOrder: 4 },
  { name: 'Initiative & Problem Solving',description: 'Proactiveness, creativity and issue resolution',   weight: 15, displayOrder: 5 },
];

@Injectable()
export class PerformanceReviewService {
  constructor(private prisma: PrismaService) {}

  // ─── Seed default criteria if none exist ──────────────────────────────────
  async seedCriteria() {
    const existing = await this.prisma.reviewCriteria.count();
    if (existing > 0) return;
    await this.prisma.reviewCriteria.createMany({ data: DEFAULT_CRITERIA });
  }

  // ─── Get all active criteria ───────────────────────────────────────────────
  async getCriteria() {
    await this.seedCriteria();
    return this.prisma.reviewCriteria.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  // ─── Create a new draft review ─────────────────────────────────────────────
  async create(dto: CreateReviewDto, reviewerId: string, reviewerName: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const review = await this.prisma.performanceReview.create({
      data: {
        employeeId:  dto.employeeId,
        reviewerId,
        reviewerName,
        reviewDate:  new Date(dto.reviewDate),
        reviewPeriod: dto.reviewPeriod,
        comments:    dto.comments,
        status:      'draft',
      },
      include: {
        employee: { select: { id: true, name: true, department: true, designation: true, profilePhotoUrl: true } },
        scores:   { include: { criteria: true } },
      },
    });

    return review;
  }

  // ─── Get single review ─────────────────────────────────────────────────────
  async findOne(id: string) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, department: true, designation: true, profilePhotoUrl: true, employeeCode: true } },
        scores:   { include: { criteria: { select: { id: true, name: true, weight: true, displayOrder: true } } }, orderBy: { criteria: { displayOrder: 'asc' } } },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  // ─── List reviews (all or by employee) ────────────────────────────────────
  async findAll(employeeId?: string, status?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (status)     where.status     = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.performanceReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reviewDate: 'desc' },
        include: {
          employee: { select: { id: true, name: true, department: true, designation: true, profilePhotoUrl: true } },
          scores:   { include: { criteria: { select: { name: true, weight: true } } } },
        },
      }),
      this.prisma.performanceReview.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Save scores + auto-calculate overall ─────────────────────────────────
  async saveScores(reviewId: string, scores: { criteriaId: string; score: number; feedback?: string }[]) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status === 'approved') throw new BadRequestException('Cannot edit an approved review');

    await Promise.all(
      scores.map((s) =>
        this.prisma.reviewScore.upsert({
          where:  { reviewId_criteriaId: { reviewId, criteriaId: s.criteriaId } },
          create: { reviewId, criteriaId: s.criteriaId, score: s.score, feedback: s.feedback },
          update: { score: s.score, feedback: s.feedback },
        }),
      ),
    );

    return this.recalcOverall(reviewId);
  }

  // ─── Submit review ─────────────────────────────────────────────────────────
  async submit(reviewId: string, dto: SubmitReviewDto) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status === 'approved') throw new BadRequestException('Already approved');

    // Save scores first
    if (dto.scores?.length) {
      await this.saveScores(reviewId, dto.scores);
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        strengths:   dto.strengths,
        improvements: dto.improvements,
        comments:    dto.comments,
        status:      'submitted',
        submittedAt: new Date(),
      },
      include: {
        employee: { select: { id: true, name: true } },
        scores:   { include: { criteria: true } },
      },
    });

    // Notify employee
    await this.prisma.notification.create({
      data: {
        type:              'Performance Review',
        title:             'Your performance review has been submitted',
        message:           `Your ${review.reviewPeriod} performance review has been submitted by ${review.reviewerName ?? 'your supervisor'}. Overall score: ${updated.overallScore?.toFixed(1) ?? 'N/A'}/5.`,
        relatedEmployeeId: review.employeeId,
        severity:          'Info',
      },
    });

    return updated;
  }

  // ─── Approve review ────────────────────────────────────────────────────────
  async approve(reviewId: string, approverId: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status:      'approved',
        approvedAt:  new Date(),
        approvedById: approverId,
      },
    });

    await this.prisma.notification.create({
      data: {
        type:              'Performance Review',
        title:             'Your performance review has been approved',
        message:           `Your ${review.reviewPeriod} performance review has been approved. Overall score: ${review.overallScore?.toFixed(1) ?? 'N/A'}/5.`,
        relatedEmployeeId: review.employeeId,
        severity:          'Success',
      },
    });

    return updated;
  }

  // ─── Reject review ─────────────────────────────────────────────────────────
  async reject(reviewId: string, approverId: string, reason?: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status:   'rejected',
        comments: reason ? `[Rejected] ${reason}` : review.comments,
        approvedById: approverId,
      },
    });

    return updated;
  }

  // ─── Performance trends for one employee ──────────────────────────────────
  async getTrends(employeeId: string) {
    const reviews = await this.prisma.performanceReview.findMany({
      where:   { employeeId, status: { in: ['submitted', 'approved'] } },
      orderBy: { reviewDate: 'asc' },
      take:    8,
      include: { scores: { include: { criteria: { select: { name: true, weight: true } } } } },
    });

    return reviews.map((r) => ({
      id:          r.id,
      reviewPeriod: r.reviewPeriod,
      reviewDate:  r.reviewDate,
      overallScore: r.overallScore,
      status:      r.status,
    }));
  }

  // ─── Delete (draft only) ───────────────────────────────────────────────────
  async remove(reviewId: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status !== 'draft') throw new BadRequestException('Only draft reviews can be deleted');
    await this.prisma.performanceReview.delete({ where: { id: reviewId } });
    return { message: 'Review deleted' };
  }

  // ─── Internal: recalculate weighted overall score ─────────────────────────
  private async recalcOverall(reviewId: string) {
    const scores = await this.prisma.reviewScore.findMany({
      where:   { reviewId },
      include: { criteria: { select: { weight: true } } },
    });

    if (scores.length === 0) return this.prisma.performanceReview.findUnique({ where: { id: reviewId } });

    const totalWeight  = scores.reduce((s, r) => s + r.criteria.weight, 0);
    const weightedSum  = scores.reduce((s, r) => s + r.score * r.criteria.weight, 0);
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : null;

    return this.prisma.performanceReview.update({
      where: { id: reviewId },
      data:  { overallScore },
      include: {
        employee: { select: { id: true, name: true, department: true, designation: true, profilePhotoUrl: true } },
        scores:   { include: { criteria: true } },
      },
    });
  }
}

export class CreateCategoryDto {
  name: string;
  description?: string;
  annualLeaves?: number;
  casualLeaves?: number;
  medicalLeaves?: number;
  sickLeaves?: number;
  extraordinaryLeaves?: number;
  earnedLeaves?: number;
  compensatoryLeaves?: number;
  unpaidLeaves?: number;
  requiresApproval?: boolean;
  carryForwardLimit?: number;
  maxConsecutiveDays?: number;
  advanceNoticeDays?: number;
}

export class UpdateCategoryDto extends CreateCategoryDto {
  isActive?: boolean;
}

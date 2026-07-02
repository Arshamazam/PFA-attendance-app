import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  employeeId: string;

  @IsDateString()
  reviewDate: string;

  @IsString()
  reviewPeriod: string;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class UpsertScoreDto {
  @IsString()
  criteriaId: string;

  score: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class SubmitReviewDto {
  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  improvements?: string;

  @IsString()
  @IsOptional()
  comments?: string;

  scores: UpsertScoreDto[];
}

import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  groupId?: number;

  @IsOptional()
  @IsNumber()
  courseId?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthFor must be in YYYY-MM format' })
  monthFor?: string;

  
}
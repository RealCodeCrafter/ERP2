import { IsOptional, IsNumber, IsEnum } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(['click', 'naxt', 'percheslinei'])
paymentType?: 'click' | 'naxt' | 'percheslinei';
}
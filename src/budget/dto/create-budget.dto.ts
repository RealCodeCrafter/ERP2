import { IsNotEmpty, IsNumber, IsEnum, IsString, Matches } from 'class-validator';

export class CreateBudgetDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(['click', 'naxt', 'percheslinei'])
  paymentType: 'click' | 'naxt' | 'percheslinei';

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthFor must be in YYYY-MM format' })
  monthFor: string;
}

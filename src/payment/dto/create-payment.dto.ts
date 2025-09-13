import { IsIn, IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'monthFor must be in YYYY-MM format' })
  monthFor: string;

  @IsNotEmpty()
@IsString()
@IsIn(['click', 'naxt', 'percheslinei'])
paymentType: 'click' | 'naxt' | 'percheslinei';
}
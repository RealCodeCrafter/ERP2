import { IsString, IsNotEmpty, IsPhoneNumber, IsOptional, IsNumber } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  groupId?: number;

  @IsOptional()
  @IsNumber()
  courseId?: number;
}
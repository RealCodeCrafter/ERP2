import { IsString, IsOptional, IsPhoneNumber, IsNumber } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsString()
  firstName: string; 

  @IsString()
  lastName: string; 

  @IsPhoneNumber()
  phone: string; 

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsNumber()
  courseId?: number;

  @IsOptional()
  @IsNumber()
  groupId?: number;
}
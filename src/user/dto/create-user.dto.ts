import { IsString, IsOptional, IsPhoneNumber, IsNumber } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  firstName?: string; 

  @IsOptional()
  @IsString()
  lastName?: string; 

  @IsOptional()
  @IsPhoneNumber()
  phone?: string; 

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
  percent?: number;

  @IsOptional()
  @IsNumber()
  courseId?: number;

  @IsOptional()
  @IsNumber()
  groupId?: number;
}
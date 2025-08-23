

import { IsNumber, IsOptional, IsString, IsPhoneNumber, Length } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsNumber()
  courseId?: number;
  
  @IsOptional()
  @IsNumber()
  groupId?: number;
}

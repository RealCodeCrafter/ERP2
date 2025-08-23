
import { IsNotEmpty, IsString, IsPhoneNumber, Length, IsInt, IsOptional, IsNumber } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  lastName: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @IsInt()
  @IsNotEmpty()
  groupId: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
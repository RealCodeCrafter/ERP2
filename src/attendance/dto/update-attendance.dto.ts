import { IsNotEmpty, IsEnum, IsNumber, IsArray, ValidateNested, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from './create-attendance.dto';

export class SingleAttendanceUpdateDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  studentId: number;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  grade?: number;
}

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAttendanceUpdateDto)
  attendances: SingleAttendanceUpdateDto[];
}
import { IsNotEmpty, IsNumber, IsArray, ValidateNested, IsEnum, IsString, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
}

export class SingleAttendanceCreateDto {
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

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  groupId: number;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAttendanceCreateDto)
  attendances: SingleAttendanceCreateDto[];
}

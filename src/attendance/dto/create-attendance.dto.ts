// create-attendance.dto.ts
import { IsNotEmpty, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
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
}

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  lessonId: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAttendanceCreateDto)
  attendances: SingleAttendanceCreateDto[];
}

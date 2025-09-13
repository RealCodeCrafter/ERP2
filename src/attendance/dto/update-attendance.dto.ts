// update-attendance.dto.ts
import { IsNotEmpty, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from './create-attendance.dto'; // yoki bitta common faylga ko'chiring

export class SingleAttendanceUpdateDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  studentId: number;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAttendanceUpdateDto)
  attendances: SingleAttendanceUpdateDto[];
}

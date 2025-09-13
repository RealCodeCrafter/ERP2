import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;
}
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsBoolean()
  isContacted?: boolean;
}
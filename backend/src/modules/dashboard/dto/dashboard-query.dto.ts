// backend/src/modules/dashboard/dto/dashboard-query.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
// backend/src/modules/metrics/dto/compute-metrics.dto.ts
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ComputeMetricsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];
}
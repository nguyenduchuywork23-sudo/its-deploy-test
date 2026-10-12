// backend/src/modules/metrics/metrics.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ComputeMetricsDto } from './dto/compute-metrics.dto';
import { isValidDateString, toVnDateString } from '../../common/utils/date.util';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Compute cho 1 nhóm / 1 ngày.
   */
  @Post('compute/group/:id')
  async computeOne(
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    const dateStr = date ?? toVnDateString();
    if (!isValidDateString(dateStr)) {
      throw new BadRequestException(`Ngày không hợp lệ: "${dateStr}"`);
    }
    return this.metrics.computeForGroup(id, dateStr);
  }

  /**
   * Compute cho nhiều nhóm (hoặc tất cả) / 1 ngày.
   */
  @Post('compute')
  async computeAll(
    @Query('date') date?: string,
    @Body() dto?: ComputeMetricsDto,
  ) {
    const dateStr = date ?? toVnDateString();
    if (!isValidDateString(dateStr)) {
      throw new BadRequestException(`Ngày không hợp lệ: "${dateStr}"`);
    }
    return this.metrics.computeForDate(dateStr, dto?.groupIds);
  }

  /**
   * Lấy metric của 1 nhóm / 1 ngày.
   */
  @Get('group/:id')
  async getOne(
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    const dateStr = date ?? toVnDateString();
    if (!isValidDateString(dateStr)) {
      throw new BadRequestException(`Ngày không hợp lệ: "${dateStr}"`);
    }
    return this.metrics.getMetricForGroup(id, dateStr);
  }
}
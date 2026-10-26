// backend/src/modules/metrics/metrics.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { MetricsService } from './metrics.service';
import { ComputeMetricsDto } from './dto/compute-metrics.dto';
import { isValidDateString, toVnDateString } from '../../common/utils/date.util';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(OptionalJwtAuthGuard)
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
    @CurrentUser() user?: any,
  ) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền tính toán metric');
    }
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
    @CurrentUser() user?: any,
  ) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền tính toán metric');
    }
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
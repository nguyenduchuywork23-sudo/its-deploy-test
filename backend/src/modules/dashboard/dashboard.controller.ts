// backend/src/modules/dashboard/dashboard.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /**
   * Dashboard tổng cho 1 ngày.
   * GET /api/dashboard?date=2026-10-07
   */
  @Get()
  async getDashboard(@Query('date') date?: string) {
    return this.dashboard.getDashboard(date);
  }

  /**
   * Chi tiết hoạt động 1 nhóm / 1 ngày.
   * GET /api/dashboard/group/:id?date=2026-10-07
   */
  @Get('group/:id')
  async getGroupActivity(
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    return this.dashboard.getGroupActivity(id, date);
  }
}
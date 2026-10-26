// backend/src/modules/alerts/alerts.controller.ts
import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AlertsService } from './alerts.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(OptionalJwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  /**
   * GET /api/alerts?date=YYYY-MM-DD
   */
  @Get()
  getAlerts(
    @Query('date') date?: string,
    @CurrentUser() user?: any,
  ) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền truy cập cảnh báo hệ thống');
    }
    return this.alerts.getAlerts(date, user);
  }
}
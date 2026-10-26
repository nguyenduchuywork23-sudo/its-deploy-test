// backend/src/modules/sprint/sprint.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SprintService } from './sprint.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(OptionalJwtAuthGuard)
@Controller('sprint')
export class SprintController {
  constructor(private readonly sprint: SprintService) {}

  /**
   * GET /api/sprint/group/:id
   */
  @Get('group/:id')
  getOverview(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.sprint.getSprintOverview(id, user);
  }
}
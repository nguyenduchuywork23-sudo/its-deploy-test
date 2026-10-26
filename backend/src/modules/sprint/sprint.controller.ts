// backend/src/modules/sprint/sprint.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SprintService } from './sprint.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@UseGuards(OptionalJwtAuthGuard)
@Controller('sprint')
export class SprintController {
  constructor(private readonly sprint: SprintService) {}

  /**
   * GET /api/sprint/group/:id
   */
  @Get('group/:id')
  getOverview(@Param('id') id: string) {
    return this.sprint.getSprintOverview(id);
  }
}
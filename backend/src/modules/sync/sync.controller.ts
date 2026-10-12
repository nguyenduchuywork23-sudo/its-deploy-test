import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncSchedulerService } from './sync-scheduler.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(OptionalJwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly syncScheduler: SyncSchedulerService,
  ) {}

  private checkSyncPermission(user: any) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh chỉ có quyền xem dữ liệu, không thể kích hoạt đồng bộ');
    }
  }

  /**
   * Đồng bộ toàn bộ các nhóm (Batch / Periodic Worker - US-20).
   * Hỗ trợ đồng bộ tăng dần (US-10).
   */
  @Post('all')
  syncAllGroups(
    @CurrentUser() user: any,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = incremental !== 'false';
    return this.syncScheduler.syncAllGroups({ incremental: isIncremental });
  }

  /**
   * Lấy trạng thái của tiến trình đồng bộ tự động.
   */
  @Get('status')
  getSchedulerStatus() {
    return this.syncScheduler.getStatus();
  }

  /**
   * Sync cả Jira + GitHub cho 1 nhóm.
   */
  @Post('group/:id')
  syncGroup(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = incremental === 'true';
    return this.sync.syncGroup(id, { incremental: isIncremental });
  }

  /**
   * Chỉ sync Jira kèm ghi nhận log.
   */
  @Post('group/:id/jira')
  syncJira(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = incremental === 'true';
    return this.sync.syncGroupJira(id, { incremental: isIncremental });
  }

  /**
   * Chỉ sync GitHub kèm ghi nhận log.
   */
  @Post('group/:id/github')
  syncGithub(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = incremental === 'true';
    return this.sync.syncGroupGithub(id, { incremental: isIncremental });
  }

  /**
   * Lấy lịch sử sync.
   */
  @Get('logs/:groupId')
  getLogs(
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    return this.sync.getSyncLogs(groupId, limit ? Number(limit) : 20);
  }
}
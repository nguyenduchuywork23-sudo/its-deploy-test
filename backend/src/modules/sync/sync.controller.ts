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
      throw new ForbiddenException(
        'Thực tập sinh chỉ có quyền xem dữ liệu, không thể kích hoạt đồng bộ',
      );
    }
  }

  /**
   * Helper: parse incremental từ cả `?full=` và `?incremental=`
   * - full=true  → incremental=false
   * - full=false → incremental=true
   * - incremental=true  → incremental=true (ưu tiên incremental nếu không có full)
   * - Mặc định: incremental=true
   */
  private parseIncremental(full?: string, incremental?: string): boolean {
    if (full === 'true') return false;   // full=true → KHÔNG incremental
    if (full === 'false') return true;   // full=false → incremental
    if (incremental === 'false') return false;
    return true; // mặc định incremental
  }

  /**
   * Đồng bộ toàn bộ các nhóm (Batch / Periodic Worker - US-20).
   * Hỗ trợ đồng bộ tăng dần (US-10).
   */
  @Post('all')
  syncAllGroups(
    @CurrentUser() user: any,
    @Query('full') full?: string,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = this.parseIncremental(full, incremental);
    return this.syncScheduler.syncAllGroups({ incremental: isIncremental });
  }

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
    @Query('full') full?: string,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = this.parseIncremental(full, incremental);
    return this.sync.syncGroup(id, { incremental: isIncremental });
  }

  /**
   * Chỉ sync Jira.
   */
  @Post('group/:id/jira')
  syncJira(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('full') full?: string,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = this.parseIncremental(full, incremental);
    return this.sync.syncGroupJira(id, { incremental: isIncremental });
  }

  /**
   * Chỉ sync GitHub.
   */
  @Post('group/:id/github')
  syncGithub(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('full') full?: string,
    @Query('incremental') incremental?: string,
  ) {
    this.checkSyncPermission(user);
    const isIncremental = this.parseIncremental(full, incremental);
    return this.sync.syncGroupGithub(id, { incremental: isIncremental });
  }

  @Get('logs/:groupId')
  getLogs(
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    return this.sync.getSyncLogs(groupId, limit ? Number(limit) : 20);
  }
}
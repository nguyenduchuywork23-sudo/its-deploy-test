import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncService, SyncGroupResult } from './sync.service';
import { MetricsService } from '../metrics/metrics.service';
import { toVnDateString } from '../../common/utils/date.util';


export interface BatchSyncSummary {
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  totalGroups: number;
  successCount: number;
  errorCount: number;
  partialCount: number;
  skippedCount: number;
  errors: Array<{ groupId: string; groupCode: string; error: string }>;
}

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private isRunning = false;
  private lastSummary: BatchSyncSummary | null = null;

    constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Cron job chạy định kỳ tự động (US-20).
   * Mặc định mỗi 1 giờ chạy 1 lần; có thể tinh chỉnh bằng biến môi trường SYNC_CRON_DISABLED.
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'periodic-group-sync',
    timeZone: 'Asia/Saigon',
  })
  async handleCron() {
    if (process.env.SYNC_CRON_DISABLED === 'true') {
      this.logger.debug('Scheduled sync is disabled by SYNC_CRON_DISABLED=true');
      return;
    }

    this.logger.log('⏰ Triggering automated periodic sync for all active groups (US-20)...');
    try {
      await this.syncAllGroups({ incremental: true });
    } catch (err: any) {
      this.logger.error(`Automated sync batch encountered critical failure: ${err?.message}`);
    }
  }

  /**
   * Chạy đồng bộ toàn bộ nhóm với kiểm soát Rate Limit và Cô lập lỗi (US-20).
   * Lỗi tại một nhóm không làm gián đoạn các nhóm còn lại.
   */
  async syncAllGroups(options: { incremental?: boolean } = { incremental: true }): Promise<BatchSyncSummary> {
    if (this.isRunning) {
      this.logger.warn('A sync batch is already in progress. Skipping new request.');
      if (this.lastSummary) return this.lastSummary;
      throw new Error('Tiến trình đồng bộ tự động đang chạy. Vui lòng chờ hoàn tất.');
    }

    this.isRunning = true;
    const startedAt = new Date();
    this.logger.log(`Starting sync batch (incremental=${options.incremental})...`);

    // 1. Lấy tất cả các nhóm có cấu hình Jira hoặc GitHub
    const groups = await this.prisma.group.findMany({
      include: {
        repositories: true,
      },
      orderBy: { code: 'asc' },
    });

    const summary: BatchSyncSummary = {
      startedAt,
      totalGroups: groups.length,
      successCount: 0,
      errorCount: 0,
      partialCount: 0,
      skippedCount: 0,
      errors: [],
    };

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const hasJira = Boolean(g.jiraProjectKey);
      const hasGithub = g.repositories && g.repositories.length > 0;

      if (!hasJira && !hasGithub) {
        summary.skippedCount++;
        continue;
      }

      try {
        // Đồng bộ độc lập từng nhóm (Error Isolation)
        const result: SyncGroupResult = await this.syncService.syncGroup(g.id, {
          incremental: options.incremental,
        });

        if (result.overallStatus === 'SUCCESS') {
          summary.successCount++;
        } else if (result.overallStatus === 'PARTIAL') {
          summary.partialCount++;
        } else {
          summary.errorCount++;
          summary.errors.push({
            groupId: g.id,
            groupCode: g.code,
            error: result.jira.error || result.github.error || 'Đồng bộ thất bại',
          });
        }
      } catch (err: any) {
        // Lỗi một nhóm không làm dừng toàn bộ tiến trình (US-20 AC2)
        summary.errorCount++;
        const errMsg = err?.message || 'Lỗi không xác định khi đồng bộ';
        summary.errors.push({
          groupId: g.id,
          groupCode: g.code,
          error: errMsg,
        });
        this.logger.error(`[Group ${g.code}] Isolated sync error: ${errMsg}`);
      }

      // Kiểm soát tần suất gọi Jira API và GitHub API tránh Rate Limit (US-20 AC3)
      if (i < groups.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    const finishedAt = new Date();
    summary.finishedAt = finishedAt;
    summary.durationMs = finishedAt.getTime() - startedAt.getTime();
    this.lastSummary = summary;
    this.isRunning = false;

        this.logger.log(
      `Finished sync batch in ${summary.durationMs}ms: Total=${summary.totalGroups}, Success=${summary.successCount}, Partial=${summary.partialCount}, Error=${summary.errorCount}, Skipped=${summary.skippedCount}`,
    );

    // US-20: Compute metric sau khi sync hoàn tất.
    // Lỗi compute metric không làm thay đổi kết quả sync.
    try {
      const today = toVnDateString();
      const metricResult = await this.metricsService.computeForDate(today);

      this.logger.log(
        `[US-20] Metrics computed after cron: ${metricResult.computed}/${metricResult.total} in ${metricResult.durationMs}ms`,
      );
    } catch (metricErr: unknown) {
      const message =
        metricErr instanceof Error ? metricErr.message : String(metricErr);

      this.logger.error(
        `[US-20] Metrics compute failed after cron: ${message}`,
      );
    }

    return summary;
  }

  /**
   * Lấy trạng thái hiện tại của Background Sync Worker
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      schedule: '0 * * * * (Every Hour)',
      cronEnabled: process.env.SYNC_CRON_DISABLED !== 'true',
      lastSummary: this.lastSummary,
    };
  }
}

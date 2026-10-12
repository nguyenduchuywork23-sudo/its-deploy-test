// backend/src/modules/dashboard/dashboard.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseVnDay, toVnDateString } from '../../common/utils/date.util';

export type DataStatus = 'VALID' | 'NO_SYNC' | 'SYNC_ERROR';

export interface DashboardRow {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  jiraProjectKey: string | null;
  repoCount: number;

  // Metric (null nếu chưa có metric row)
  taskDone: number | null;
  subtaskDone: number | null;
  commitCount: number | null;
  prCreated: number | null;
  prMerged: number | null;
  blocked: number | null;

  // Trạng thái
  dataStatus: DataStatus;
  syncStatus: 'SUCCESS' | 'ERROR' | 'PARTIAL' | 'NEVER_SYNCED';
  lastSyncAt: string | null;
  metricCalculatedAt: string | null;
  syncError: { source: string; message: string } | null;
}

export interface DashboardSummary {
  total: number;
  valid: number;
  noSync: number;
  syncError: number;
  totalTaskDone: number;
  totalSubtaskDone: number;
  totalCommit: number;
  totalPrCreated: number;
  totalPrMerged: number;
  totalBlocked: number;
}

export interface DashboardResult {
  date: string;
  summary: DashboardSummary;
  items: DashboardRow[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard tổng cho 1 ngày (mặc định hôm nay giờ VN).
   *
   * Với mỗi nhóm, join:
   *   - DailyGroupMetric của ngày
   *   - SyncLog gần nhất của JIRA và GITHUB
   *   - Trạng thái group.syncStatus
   * → xác định dataStatus: VALID / NO_SYNC / SYNC_ERROR
   */
  async getDashboard(dateInput?: string): Promise<DashboardResult> {
    const dateStr = dateInput ?? toVnDateString();
    let range;
    try {
      range = parseVnDay(dateStr);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    // Lấy tất cả nhóm + repo count + metric của ngày
    const groups = await this.prisma.group.findMany({
      orderBy: { code: 'asc' },
      include: {
        repositories: { select: { id: true } },
        metrics: {
          where: { date: range.dateOnly },
          take: 1,
        },
      },
    });

    if (groups.length === 0) {
      return {
        date: dateStr,
        summary: this.emptySummary(),
        items: [],
      };
    }

    const groupIds = groups.map((g) => g.id);

    // Lấy sync log gần nhất cho mỗi (groupId, source)
    // Prisma không có distinct on multi-column trực tiếp, nên fetch rồi filter.
    // Với 100 nhóm × 2 nguồn ≈ 200 row → OK.
    const latestLogs = await this.prisma.$queryRaw<
  Array<{
    groupId: string;
    source: string;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    errorMessage: string | null;
  }>
>`
  SELECT DISTINCT ON ("groupId", source)
    "groupId",
    source,
    status,
    "startedAt",
    "finishedAt",
    "errorMessage"
  FROM "sync_logs"
  WHERE "groupId" = ANY(${groupIds}::text[])
  ORDER BY "groupId", source, "startedAt" DESC
`;

const logMap = new Map<string, any>();

for (const row of latestLogs) {
  const key = row.groupId;

  if (!logMap.has(key)) {
    logMap.set(key, {});
  }

  const entry = logMap.get(key)!;

  entry[row.source] = {
    status: row.status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    errorMessage: row.errorMessage,
  };
}

  

    // Build rows
    const items: DashboardRow[] = [];
    const summary = this.emptySummary();
    summary.total = groups.length;

    for (const g of groups) {
      const metric = g.metrics[0] ?? null;
      const logs = logMap.get(g.id) ?? {};
      const jiraLog = logs.JIRA;
      const githubLog = logs.GITHUB;

      // ---- Xác định dataStatus ----
      let dataStatus: DataStatus;
      let syncError: { source: string; message: string } | null = null;

      const jiraError = jiraLog?.status === 'ERROR';
      const githubError = githubLog?.status === 'ERROR';

      if (jiraError || githubError) {
        dataStatus = 'SYNC_ERROR';
        if (jiraError) {
          syncError = { source: 'JIRA', message: jiraLog?.errorMessage ?? 'Lỗi sync Jira' };
        } else if (githubError) {
          syncError = {
            source: 'GITHUB',
            message: githubLog?.errorMessage ?? 'Lỗi sync GitHub',
          };
        }
      } else if (!metric) {
        // Chưa có metric → chưa sync hoặc chưa compute
        dataStatus = 'NO_SYNC';
      } else {
        dataStatus = 'VALID';
      }

      // syncStatus hiển thị: ưu tiên log lỗi, sau đó group.syncStatus
      let displaySyncStatus: DashboardRow['syncStatus'];
      if (jiraError || githubError) {
        displaySyncStatus = 'ERROR';
      } else if (!jiraLog && !githubLog) {
        displaySyncStatus = 'NEVER_SYNCED';
      } else if (
        (jiraLog && jiraLog.status !== 'SUCCESS') ||
        (githubLog && githubLog.status !== 'SUCCESS')
      ) {
        displaySyncStatus = 'PARTIAL';
      } else {
        displaySyncStatus = 'SUCCESS';
      }

      const row: DashboardRow = {
        id: g.id,
        code: g.code,
        name: g.name,
        memberCount: g.memberCount,
        jiraProjectKey: g.jiraProjectKey,
        repoCount: g.repositories.length,

        taskDone: metric?.taskDone ?? null,
        subtaskDone: metric?.subtaskDone ?? null,
        commitCount: metric?.commitCount ?? null,
        prCreated: metric?.prCreated ?? null,
        prMerged: metric?.prMerged ?? null,
        blocked: metric?.blocked ?? null,

        dataStatus,
        syncStatus: displaySyncStatus,
        lastSyncAt: g.lastSyncAt?.toISOString() ?? null,
        metricCalculatedAt: metric?.calculatedAt?.toISOString() ?? null,
        syncError,
      };

      // Update summary (chỉ cộng cho VALID)
      if (dataStatus === 'VALID' && metric) {
        summary.valid++;
        summary.totalTaskDone += metric.taskDone;
        summary.totalSubtaskDone += metric.subtaskDone;
        summary.totalCommit += metric.commitCount;
        summary.totalPrCreated += metric.prCreated;
        summary.totalPrMerged += metric.prMerged;
        summary.totalBlocked += metric.blocked;
      } else if (dataStatus === 'NO_SYNC') {
        summary.noSync++;
      } else if (dataStatus === 'SYNC_ERROR') {
        summary.syncError++;
      }

      items.push(row);
    }

    return { date: dateStr, summary, items };
  }

  /**
   * Chi tiết hoạt động của 1 nhóm trong ngày.
   * Dùng cho trang chi tiết nhóm (Day 4).
   */
  async getGroupActivity(groupId: string, dateInput?: string) {
    const dateStr = dateInput ?? toVnDateString();
    const range = parseVnDay(dateStr);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { repositories: true },
    });
    if (!group) throw new BadRequestException('Không tìm thấy nhóm');

    const [metric, jiraDone, commits, prsCreated, prsMerged] = await Promise.all([
      this.prisma.dailyGroupMetric.findUnique({
        where: { groupId_date: { groupId, date: range.dateOnly } },
      }),

      // Danh sách issue chuyển sang Done trong ngày
      this.prisma.jiraTransition.findMany({
        where: {
          changedAt: { gte: range.startUtc, lt: range.endUtc },
          toStatus: {
            in: ['Done', 'Closed', 'Resolved', 'Complete', 'Completed'],
          },
          issue: { groupId },
        },
        include: {
          issue: {
            select: {
              id: true,
              issueKey: true,
              issueType: true,
              summary: true,
              url: true,
            },
          },
        },
        orderBy: { changedAt: 'asc' },
      }),

      this.prisma.githubCommit.findMany({
        where: {
          groupId,
          committedAt: { gte: range.startUtc, lt: range.endUtc },
        },
        orderBy: { committedAt: 'asc' },
      }),

      this.prisma.githubPullRequest.findMany({
        where: {
          groupId,
          createdAt: { gte: range.startUtc, lt: range.endUtc },
        },
        orderBy: { createdAt: 'asc' },
      }),

      this.prisma.githubPullRequest.findMany({
        where: {
          groupId,
          mergedAt: { gte: range.startUtc, lt: range.endUtc, not: null },
        },
        orderBy: { mergedAt: 'asc' },
      }),
    ]);

    return {
      date: dateStr,
      group: {
        id: group.id,
        code: group.code,
        name: group.name,
        syncStatus: group.syncStatus,
        lastSyncAt: group.lastSyncAt,
      },
      metric: metric
        ? {
            taskDone: metric.taskDone,
            subtaskDone: metric.subtaskDone,
            commitCount: metric.commitCount,
            prCreated: metric.prCreated,
            prMerged: metric.prMerged,
            blocked: metric.blocked,
            calculatedAt: metric.calculatedAt,
          }
        : null,
      jiraDone: jiraDone.map((t) => ({
        issueKey: t.issue.issueKey,
        issueType: t.issue.issueType,
        summary: t.issue.summary,
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        completedAt: t.changedAt,
        url: t.issue.url,
      })),
      commits: commits.map((c) => ({
        sha: c.sha,
        shortSha: c.sha.slice(0, 7),
        message: c.message.split('\n')[0],
        author: c.author,
        committedAt: c.committedAt,
        url: c.url,
      })),
      prsCreated: prsCreated.map((p) => ({
        number: p.number,
        title: p.title,
        state: p.state,
        createdAt: p.createdAt,
        mergedAt: p.mergedAt,
        url: p.url,
      })),
      prsMerged: prsMerged.map((p) => ({
        number: p.number,
        title: p.title,
        mergedAt: p.mergedAt,
        url: p.url,
      })),
    };
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private emptySummary(): DashboardSummary {
    return {
      total: 0,
      valid: 0,
      noSync: 0,
      syncError: 0,
      totalTaskDone: 0,
      totalSubtaskDone: 0,
      totalCommit: 0,
      totalPrCreated: 0,
      totalPrMerged: 0,
      totalBlocked: 0,
    };
  }
}
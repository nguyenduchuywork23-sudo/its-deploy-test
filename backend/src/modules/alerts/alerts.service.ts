// backend/src/modules/alerts/alerts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseVnDay,
  toVnDateString,
} from '../../common/utils/date.util';
import {
  DONE_STATUSES,
  BLOCKED_STATUSES,
} from '../metrics/metrics.constants';
import { Role } from '@prisma/client';

export type AlertType = 'SYNC_ERROR' | 'BLOCKED' | 'STALE_ISSUE' | 'NO_ACTIVITY';

export interface AlertItem {
  groupId: string;
  groupCode: string;
  groupName: string;
  types: AlertType[];
  details: {
    syncError?: { source: string; message: string };
    blockedCount?: number;
    staleCount?: number;
    noActivitySince?: string;
  };
}

export interface AlertsSummary {
  total: number;
  syncError: number;
  blocked: number;
  staleIssue: number;
  noActivity: number;
}

export interface AlertsResult {
  date: string;
  summary: AlertsSummary;
  items: AlertItem[];
}

const STALE_DAYS = 2;

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAlerts(
    dateInput?: string,
    user?: { id: string; role: Role },
  ): Promise<AlertsResult> {
    const dateStr = dateInput ?? toVnDateString();
    const range = parseVnDay(dateStr);
    const staleThreshold = new Date(
      Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000,
    );

    const where: any = {};
    if (user) {
      if (user.role === Role.MENTOR) {
        where.mentorId = user.id;
      } else if (user.role === Role.INTERN) {
        where.members = { some: { userId: user.id } };
      }
    }

    // 1. Lấy tất cả group theo quyền + metric của ngày
    const groups = await this.prisma.group.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        metrics: { where: { date: range.dateOnly }, take: 1 },
      },
    });

    if (groups.length === 0) {
      return {
        date: dateStr,
        summary: {
          total: 0,
          syncError: 0,
          blocked: 0,
          staleIssue: 0,
          noActivity: 0,
        },
        items: [],
      };
    }

    const groupIds = groups.map((g) => g.id);

    // 2. Latest sync log per (group, source)
    const latestLogs = await this.prisma.$queryRaw<
      Array<{
        groupId: string;
        source: string;
        status: string;
        errorMessage: string | null;
      }>
    >`
      SELECT DISTINCT ON ("groupId", source)
        "groupId",
        source,
        status,
        "errorMessage"
      FROM "sync_logs"
      WHERE "groupId" = ANY(${groupIds}::text[])
      ORDER BY "groupId", source, "startedAt" DESC
    `;

    const logMap = new Map<string, { JIRA?: any; GITHUB?: any }>();
    for (const r of latestLogs) {
      if (!logMap.has(r.groupId)) logMap.set(r.groupId, {});
      (logMap.get(r.groupId) as any)[r.source] = r;
    }

    // 3. Blocked count per group
    const blockedGroups = await this.prisma.jiraIssue.groupBy({
      by: ['groupId'],
      where: {
        groupId: { in: groupIds },
        status: { in: BLOCKED_STATUSES as unknown as string[] },
      },
      _count: { _all: true },
    });
    const blockedMap = new Map(
      blockedGroups.map((b) => [b.groupId, b._count._all]),
    );

    // 4. Stale issues per group (chưa Done, chưa Blocked, updatedAt > 2 ngày)
    const staleRows = await this.prisma.jiraIssue.findMany({
      where: {
        groupId: { in: groupIds },
        updatedAt: { lt: staleThreshold },
        NOT: {
          OR: [
            { status: { in: DONE_STATUSES as unknown as string[] } },
            { status: { in: BLOCKED_STATUSES as unknown as string[] } },
          ],
        },
      },
      select: { groupId: true },
    });
    const staleMap = new Map<string, number>();
    for (const s of staleRows) {
      staleMap.set(s.groupId, (staleMap.get(s.groupId) ?? 0) + 1);
    }

    // 5. Build items
    const items: AlertItem[] = [];
    const summary: AlertsSummary = {
      total: 0,
      syncError: 0,
      blocked: 0,
      staleIssue: 0,
      noActivity: 0,
    };

    for (const g of groups) {
      const types: AlertType[] = [];
      const details: AlertItem['details'] = {};

      const logs = logMap.get(g.id) ?? {};
      const jiraErr = logs.JIRA?.status === 'ERROR';
      const ghErr = logs.GITHUB?.status === 'ERROR';

      // --- SYNC_ERROR ---
      if (jiraErr || ghErr) {
        types.push('SYNC_ERROR');
        summary.syncError++;
        if (jiraErr) {
          details.syncError = {
            source: 'JIRA',
            message: logs.JIRA?.errorMessage ?? 'Lỗi sync Jira',
          };
        } else if (ghErr) {
          details.syncError = {
            source: 'GITHUB',
            message: logs.GITHUB?.errorMessage ?? 'Lỗi sync GitHub',
          };
        }
      }

      // --- BLOCKED ---
      const blockedCount = blockedMap.get(g.id) ?? 0;
      if (blockedCount > 0) {
        types.push('BLOCKED');
        summary.blocked++;
        details.blockedCount = blockedCount;
      }

      // --- STALE_ISSUE ---
      const staleCount = staleMap.get(g.id) ?? 0;
      if (staleCount > 0) {
        types.push('STALE_ISSUE');
        summary.staleIssue++;
        details.staleCount = staleCount;
      }

      // --- NO_ACTIVITY ---
      // Chỉ tính khi: đã sync OK + có metric + tất cả metric = 0
      const metric = g.metrics[0];
      const hasSyncError = types.includes('SYNC_ERROR');
      const isNoActivity =
        !hasSyncError &&
        metric != null &&
        metric.taskDone === 0 &&
        metric.subtaskDone === 0 &&
        metric.commitCount === 0 &&
        metric.prCreated === 0 &&
        metric.prMerged === 0;

      if (isNoActivity && metric) {
        types.push('NO_ACTIVITY');
        summary.noActivity++;
        details.noActivitySince = metric.calculatedAt.toISOString();
      }

      if (types.length > 0) {
        items.push({
          groupId: g.id,
          groupCode: g.code,
          groupName: g.name,
          types,
          details,
        });
      }
    }

    summary.total = items.length;

    // Sort: nhiều loại cảnh báo trước, rồi theo code
    items.sort((a, b) => {
      if (b.types.length !== a.types.length) {
        return b.types.length - a.types.length;
      }
      return a.groupCode.localeCompare(b.groupCode);
    });

    this.logger.log(
      `getAlerts date=${dateStr} total=${summary.total} syncError=${summary.syncError} blocked=${summary.blocked} stale=${summary.staleIssue} noActivity=${summary.noActivity}`,
    );

    return { date: dateStr, summary, items };
  }
}
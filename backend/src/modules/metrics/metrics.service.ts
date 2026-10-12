// backend/src/modules/metrics/metrics.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseVnDay, type VnDayRange } from '../../common/utils/date.util';
import {
  BLOCKED_STATUSES,
  DONE_STATUSES,
  METRICS_COMPUTE_CONCURRENCY,
  SUBTASK_TYPE_PATTERN,
} from './metrics.constants';

export interface ComputeOneResult {
  groupId: string;
  date: string;
  taskDone: number;
  subtaskDone: number;
  commitCount: number;
  prCreated: number;
  prMerged: number;
  blocked: number;
}

export interface ComputeAllResult {
  date: string;
  total: number;
  computed: number;
  failed: number;
  errors: { groupId: string; message: string }[];
  durationMs: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // PUBLIC
  // ============================================================

  /**
   * Tính metric cho 1 nhóm / 1 ngày.
   * Idempotent: dùng upsert theo (groupId, date).
   */
  async computeForGroup(groupId: string, dateStr: string): Promise<ComputeOneResult> {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new BadRequestException(`Không tìm thấy nhóm ${groupId}`);

    const range = parseVnDay(dateStr);

    // ---- 1. Task Done trong ngày ----
    // Đếm các transition có toStatus ∈ DONE_STATUSES, changedAt trong [start, end),
    // và issue có type = Task (không phải Subtask).
    const taskDone = await this.countDoneTransitions(groupId, range, 'TASK');

    // ---- 2. Subtask Done trong ngày ----
    const subtaskDone = await this.countDoneTransitions(groupId, range, 'SUBTASK');

    // ---- 3. Commit count trong ngày ----
    const commitCount = await this.prisma.githubCommit.count({
      where: {
        groupId,
        committedAt: { gte: range.startUtc, lt: range.endUtc },
      },
    });

    // ---- 4. PR Created trong ngày ----
    const prCreated = await this.prisma.githubPullRequest.count({
      where: {
        groupId,
        createdAt: { gte: range.startUtc, lt: range.endUtc },
      },
    });

    // ---- 5. PR Merged trong ngày ----
    const prMerged = await this.prisma.githubPullRequest.count({
      where: {
        groupId,
        mergedAt: { gte: range.startUtc, lt: range.endUtc, not: null },
      },
    });

    // ---- 6. Blocked (snapshot hiện tại — không theo ngày) ----
    // Blocked là trạng thái hiện tại của issue; metric này là snapshot cuối ngày.
    // MVP: đếm số issue đang Blocked tại thời điểm compute.
    const blocked = await this.prisma.jiraIssue.count({
      where: {
        groupId,
        status: { in: BLOCKED_STATUSES as unknown as string[] },
      },
    });

    // ---- 7. Upsert vào daily_group_metrics ----
    const saved = await this.prisma.dailyGroupMetric.upsert({
      where: {
        groupId_date: { groupId, date: range.dateOnly },
      },
      create: {
        groupId,
        date: range.dateOnly,
        taskDone,
        subtaskDone,
        commitCount,
        prCreated,
        prMerged,
        blocked,
      },
      update: {
        taskDone,
        subtaskDone,
        commitCount,
        prCreated,
        prMerged,
        blocked,
        calculatedAt: new Date(),
      },
    });

    this.logger.log(
      `computeForGroup group=${group.code} date=${dateStr} task=${taskDone} subtask=${subtaskDone} commit=${commitCount} prC=${prCreated} prM=${prMerged} blocked=${blocked}`,
    );

    return {
      groupId,
      date: dateStr,
      taskDone: saved.taskDone,
      subtaskDone: saved.subtaskDone,
      commitCount: saved.commitCount,
      prCreated: saved.prCreated,
      prMerged: saved.prMerged,
      blocked: saved.blocked,
    };
  }

  /**
   * Tính metric cho nhiều nhóm (hoặc tất cả nếu groupIds rỗng).
   * Chạy tuần tự theo batch để tránh nghẽn DB.
   * Lỗi 1 nhóm không làm fail cả batch.
   */
  async computeForDate(
    dateStr: string,
    groupIds?: string[],
  ): Promise<ComputeAllResult> {
    const started = Date.now();

    const groups = groupIds?.length
      ? await this.prisma.group.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, code: true },
        })
      : await this.prisma.group.findMany({
          select: { id: true, code: true },
          orderBy: { code: 'asc' },
        });

    const total = groups.length;
    const result: ComputeAllResult = {
      date: dateStr,
      total,
      computed: 0,
      failed: 0,
      errors: [],
      durationMs: 0,
    };

    // Batch theo concurrency
    for (let i = 0; i < groups.length; i += METRICS_COMPUTE_CONCURRENCY) {
      const batch = groups.slice(i, i + METRICS_COMPUTE_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((g) => this.computeForGroup(g.id, dateStr)),
      );

      settled.forEach((s, idx) => {
        const g = batch[idx];
        if (s.status === 'fulfilled') {
          result.computed++;
        } else {
          result.failed++;
          result.errors.push({
            groupId: g.code,
            message: (s.reason as Error)?.message ?? 'Lỗi không xác định',
          });
        }
      });
    }

    result.durationMs = Date.now() - started;
    this.logger.log(
      `computeForDate date=${dateStr} total=${total} computed=${result.computed} failed=${result.failed} in ${result.durationMs}ms`,
    );
    return result;
  }

  /**
   * Lấy metric của 1 nhóm / 1 ngày (nếu có).
   */
  async getMetricForGroup(groupId: string, dateStr: string) {
    const range = parseVnDay(dateStr);
    const metric = await this.prisma.dailyGroupMetric.findUnique({
      where: { groupId_date: { groupId, date: range.dateOnly } },
    });
    return metric;
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /**
   * Đếm số transition vào Done trong khoảng [start, end),
   * lọc theo issue type (TASK hoặc SUBTASK).
   *
   * Logic: query JiraTransition join JiraIssue, filter changedAt + toStatus + issueType.
   */
  private async countDoneTransitions(
    groupId: string,
    range: VnDayRange,
    kind: 'TASK' | 'SUBTASK',
  ): Promise<number> {
    const doneArr = DONE_STATUSES as unknown as string[];
    const typePattern =
      kind === 'TASK'
        ? await this.getTaskTypeKeywords()
        : SUBTASK_TYPE_PATTERN;

    // Với Prisma không có full-text cho array, ta dùng OR contains case-insensitive
    const typeOr = typePattern.map((kw) => ({
      issueType: { contains: kw, mode: 'insensitive' as const },
    }));

    const count = await this.prisma.jiraTransition.count({
      where: {
        changedAt: { gte: range.startUtc, lt: range.endUtc },
        toStatus: { in: doneArr },
        issue: {
          groupId,
          OR: typeOr,
          // Với TASK, LOẠI trừ issue là Subtask (tránh đếm trùng)
          ...(kind === 'TASK'
            ? {
                NOT: {
                  OR: SUBTASK_TYPE_PATTERN.map((kw) => ({
                    issueType: { contains: kw, mode: 'insensitive' as const },
                  })),
                },
              }
            : {}),
        },
      },
    });

    return count;
  }

  /**
   * Từ khóa nhận diện Task types (không bao gồm Subtask).
   */
  private async getTaskTypeKeywords(): Promise<string[]> {
    return ['task', 'story', 'bug', 'feature', 'chore', 'improvement'];
  }
}
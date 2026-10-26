// backend/src/modules/sprint/sprint.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DONE_STATUSES,
  BLOCKED_STATUSES,
} from '../metrics/metrics.constants';

export interface SprintBreakdown {
  total: number;
  done: number;
  inProgress: number;
  toDo: number;
  blocked: number;
}

export interface SprintOverview {
  groupId: string;
  groupCode: string;
  groupName: string;
  sprint: string | null;
  breakdown: SprintBreakdown;
  completionRate: number;
  lastUpdatedAt: string | null;
}

@Injectable()
export class SprintService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy Sprint Overview cho 1 nhóm.
   * Sprint "hiện tại" = sprint có updatedAt mới nhất trong các issue.
   * Nếu không có issue nào có sprint → dùng toàn bộ issue.
   */
  async getSprintOverview(groupId: string): Promise<SprintOverview> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, code: true, name: true },
    });
    if (!group) throw new BadRequestException('Không tìm thấy nhóm');

    const issues = await this.prisma.jiraIssue.findMany({
      where: { groupId },
      select: { sprint: true, status: true, updatedAt: true },
    });

    if (issues.length === 0) {
      return {
        groupId,
        groupCode: group.code,
        groupName: group.name,
        sprint: null,
        breakdown: { total: 0, done: 0, inProgress: 0, toDo: 0, blocked: 0 },
        completionRate: 0,
        lastUpdatedAt: null,
      };
    }

    // Xác định sprint hiện tại: sprint có issue updatedAt mới nhất
    const sprintLatest = new Map<string, Date>();
    for (const i of issues) {
      if (!i.sprint) continue;
      const cur = sprintLatest.get(i.sprint);
      if (!cur || i.updatedAt > cur) {
        sprintLatest.set(i.sprint, i.updatedAt);
      }
    }

    let currentSprint: string | null = null;
    if (sprintLatest.size > 0) {
      currentSprint = Array.from(sprintLatest.entries()).sort(
        (a, b) => b[1].getTime() - a[1].getTime(),
      )[0][0];
    }

    // Lọc issue theo sprint hiện tại (hoặc toàn bộ nếu không có sprint)
    const targetIssues = currentSprint
      ? issues.filter((i) => i.sprint === currentSprint)
      : issues;

    const doneSet = new Set(DONE_STATUSES as unknown as string[]);
    const blockedSet = new Set(BLOCKED_STATUSES as unknown as string[]);

    let done = 0;
    let blocked = 0;
    let inProgress = 0;
    let toDo = 0;

    for (const i of targetIssues) {
      const s = i.status ?? '';
      if (doneSet.has(s)) done++;
      else if (blockedSet.has(s)) blocked++;
      else if (/in[\s-]?progress|in[\s-]?review|in[\s-]?dev/i.test(s)) inProgress++;
      else toDo++;
    }

    const total = targetIssues.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    const lastUpdatedAt =
      targetIssues.length > 0
        ? targetIssues
            .map((i) => i.updatedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]
            .toISOString()
        : null;

    return {
      groupId,
      groupCode: group.code,
      groupName: group.name,
      sprint: currentSprint,
      breakdown: { total, done, inProgress, toDo, blocked },
      completionRate,
      lastUpdatedAt,
    };
  }
}
import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JiraService } from '../jira/jira.service';
import { GithubService } from '../github/github.service';
import { SYNC_SOURCE } from './sync.constants';

export interface SourceResult {
  ok: boolean;
  processed: number;
  error?: string;
}

export interface SyncGroupResult {
  groupId: string;
  jira: SourceResult;
  github: SourceResult;
  overallStatus: 'SUCCESS' | 'ERROR' | 'PARTIAL';
}

/** Lùi watermark 5 phút để tránh sót dữ liệu do lệch đồng hồ / độ trễ API */
const WATERMARK_OFFSET_MS = 5 * 60 * 1000;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private jira: JiraService,
    private github: GithubService,
  ) {}

  private async checkGroupAccess(
    groupId: string,
    user?: { id: string; role: Role },
    mutate = false,
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new BadRequestException('Không tìm thấy nhóm');

    if (user) {
      if (mutate && user.role === Role.INTERN) {
        throw new ForbiddenException(
          'Thực tập sinh không có quyền kích hoạt đồng bộ',
        );
      }
      if (user.role === Role.MENTOR && group.mentorId !== user.id) {
        throw new ForbiddenException(
          'Bạn chỉ có quyền thao tác với nhóm được gắn với tài khoản của mình',
        );
      }
      if (
        user.role === Role.INTERN &&
        !group.members.some((m) => m.userId === user.id)
      ) {
        throw new ForbiddenException(
          'Bạn chỉ có quyền xem dữ liệu nhóm mà bạn là thành viên',
        );
      }
    }
    return group;
  }

  /**
   * Sync cả 2 nguồn. Lỗi 1 nguồn không làm chết nguồn còn lại.
   * Hỗ trợ cờ incremental (US-10).
   */
  async syncGroup(
    groupId: string,
    options?: { incremental?: boolean },
    user?: { id: string; role: Role },
  ): Promise<SyncGroupResult> {
    const group = await this.checkGroupAccess(groupId, user, true);

    const [jiraRes, githubRes] = await Promise.all([
      this.syncGroupJira(groupId, options, user),
      this.syncGroupGithub(groupId, options, user),
    ]);

    // Tính overall status
    let overallStatus: SyncGroupResult['overallStatus'];
    if (jiraRes.ok && githubRes.ok) overallStatus = 'SUCCESS';
    else if (!jiraRes.ok && !githubRes.ok) overallStatus = 'ERROR';
    else overallStatus = 'PARTIAL';

    await this.prisma.group.update({
      where: { id: groupId },
      data: { syncStatus: overallStatus, lastSyncAt: new Date() },
    });

    // Tự động quét và bổ sung thành viên từ Jira & GitHub sau khi sync
    try {
      await this.autoDiscoverMembers(groupId, group);
    } catch (e: any) {
      this.logger.warn(`AutoDiscover members skipped for ${groupId}: ${e.message}`);
    }

    return { groupId, jira: jiraRes, github: githubRes, overallStatus };
  }

  /**
   * Sync riêng Jira kèm ghi nhận SyncLog và cập nhật watermark riêng (US-10)
   */
  async syncGroupJira(
    groupId: string,
    options?: { incremental?: boolean },
    user?: { id: string; role: Role },
  ): Promise<SourceResult> {
    await this.checkGroupAccess(groupId, user, true);
    const res = await this.runSyncWithLog(groupId, 'JIRA', () => this.syncJira(groupId, options));
    if (res.ok) {
      await this.prisma.group.update({
        where: { id: groupId },
        data: { jiraLastSyncAt: new Date() }, // ← watermark riêng
      });
    }
    return res;
  }

  /**
   * Sync riêng GitHub kèm ghi nhận SyncLog và cập nhật watermark riêng (US-10)
   */
  async syncGroupGithub(
    groupId: string,
    options?: { incremental?: boolean },
    user?: { id: string; role: Role },
  ): Promise<SourceResult> {
    await this.checkGroupAccess(groupId, user, true);
    const res = await this.runSyncWithLog(groupId, 'GITHUB', () => this.syncGithub(groupId, options));
    if (res.ok) {
      await this.prisma.group.update({
        where: { id: groupId },
        data: { githubLastSyncAt: new Date() }, // ← watermark riêng
      });
    }
    return res;
  }

  /**
   * Wrapper: tạo SyncLog RUNNING → gọi sync → update log + trả về kết quả.
   */
  private async runSyncWithLog(
    groupId: string,
    source: 'JIRA' | 'GITHUB',
    fn: () => Promise<number>,
  ): Promise<SourceResult> {
    const log = await this.prisma.syncLog.create({
      data: { groupId, source, status: 'ERROR' }, // mặc định ERROR, update sau
    });

    const startedAt = Date.now();
    try {
      const processed = await fn();
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          recordsProcessed: processed,
        },
      });
      this.logger.log(
        `[${source}] group=${groupId} OK processed=${processed} in ${Date.now() - startedAt}ms`,
      );
      return { ok: true, processed };
    } catch (err: any) {
      const message = err?.message ?? 'Lỗi không xác định';
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: 'ERROR',
          finishedAt: new Date(),
          errorMessage: message.slice(0, 2000),
        },
      });
      this.logger.error(`[${source}] group=${groupId} FAILED: ${message}`);
      return { ok: false, processed: 0, error: message };
    }
  }

  /**
   * Sync Jira issues + changelog cho 1 nhóm.
   * Trả về số issue đã xử lý.
   */
  async syncJira(groupId: string, options?: { incremental?: boolean }): Promise<number> {
    const group = await this.prisma.group.findUniqueOrThrow({
      where: { id: groupId },
    });

    if (!group.jiraProjectKey) {
      throw new Error('Nhóm chưa cấu hình Jira Project Key');
    }

    const baseUrl = group.jiraBaseUrl ?? process.env.JIRA_BASE_URL;
    if (!baseUrl) throw new Error('Thiếu JIRA_BASE_URL');

    // US-10: dùng watermark riêng, fallback về lastSyncAt chung nếu chưa có
    let since: Date | undefined;
    if (options?.incremental) {
      const watermark = group.jiraLastSyncAt ?? group.lastSyncAt;
      if (watermark) {
        since = new Date(watermark.getTime() - WATERMARK_OFFSET_MS); // lùi 5 phút
      }
    }

    const issues = await this.jira.fetchIssuesWithChangelog(
      group.jiraProjectKey,
      baseUrl,
      { since },
    );

    let processed = 0;

    for (const it of issues) {
      const f = it.fields ?? {};
this.logger.debug(
  `[SPRINT DEBUG] ${it.key}: ${JSON.stringify({
    sprint: f.sprint,
    customfield_10020: f.customfield_10020,
    sprintFields: Object.keys(f).filter((key) =>
      key.toLowerCase().includes('sprint'),
    ),
  })}`,
);
      const issueData = {
        groupId,
        issueKey: it.key,
        issueType: f.issuetype?.name ?? 'Unknown',
        summary: f.summary ?? '',
        status: f.status?.name ?? 'Unknown',
        sprint: this.extractSprintName(f),
        createdAt: new Date(f.created),
        updatedAt: new Date(f.updated),
        url: `${baseUrl.replace(/\/$/, '')}/browse/${it.key}`,
      };

      const savedIssue = await this.prisma.jiraIssue.upsert({
        where: { groupId_issueKey: { groupId, issueKey: it.key } },
        create: issueData,
        update: issueData,
      });

      // --- Changelog transitions ---
      const histories: any[] = it.changelog?.histories ?? [];
      for (const h of histories) {
        const changedAt = new Date(h.created);
        for (const item of h.items ?? []) {
          if (item.field !== 'status') continue;
          const fromStatus = item.fromString ?? null;
          const toStatus = item.toString ?? '';
          if (!toStatus) continue;

          // Idempotent check: (issueId, changedAt, toStatus, fromStatus)
          const exists = await this.prisma.jiraTransition.findFirst({
            where: {
              issueId: savedIssue.id,
              changedAt,
              toStatus,
              fromStatus: fromStatus ?? undefined,
            },
            select: { id: true },
          });

          if (!exists) {
            await this.prisma.jiraTransition.create({
              data: {
                issueId: savedIssue.id,
                fromStatus,
                toStatus,
                changedAt,
              },
            });
          }
        }
      }

      processed++;
    }

    return processed;
  }

  /**
   * Sync GitHub commits + PRs cho tất cả repo của 1 nhóm.
   */
  async syncGithub(groupId: string, options?: { incremental?: boolean }): Promise<number> {
    const group = await this.prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      include: { repositories: true },
    });

    if (!group.repositories.length) {
      throw new Error('Nhóm chưa cấu hình GitHub repository');
    }

    // US-10: watermark chung cho toàn bộ GitHub của nhóm
    let since: Date | undefined;
    if (options?.incremental) {
      const watermark = group.githubLastSyncAt ?? group.lastSyncAt;
      if (watermark) {
        since = new Date(watermark.getTime() - WATERMARK_OFFSET_MS);
      }
    }

    let processed = 0;
    const errors: string[] = [];

    for (const repo of group.repositories) {
      try {
        // --- Commits ---
        const commits = await this.github.fetchCommits(repo.repoOwner, repo.repoName, { since });
        for (const c of commits) {
          const sha = c.sha;
          if (!sha) continue;

          const committedAt =
            c.commit?.author?.date ?? c.commit?.committer?.date ?? null;
          if (!committedAt) continue;

          const data = {
            groupId,
            repositoryId: repo.id,
            sha,
            message: c.commit?.message ?? '',
            author:
              c.commit?.author?.name ??
              c.author?.login ??
              c.committer?.login ??
              null,
            committedAt: new Date(committedAt),
            url: c.html_url ?? `${repo.repoUrl}/commit/${sha}`,
          };

          await this.prisma.githubCommit.upsert({
            where: { groupId_sha: { groupId, sha } },
            create: data,
            update: {
              message: data.message,
              author: data.author,
            },
          });
          processed++;
        }

        // --- Pull Requests ---
        const prs = await this.github.fetchPullRequests(
  repo.repoOwner,
  repo.repoName,
  { since },
);
        for (const pr of prs) {
          if (!pr.number) continue;

          const data = {
            groupId,
            repositoryId: repo.id,
            number: pr.number,
            title: pr.title ?? '',
            state: pr.state ?? 'unknown',
            createdAt: new Date(pr.created_at),
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            url: pr.html_url ?? `${repo.repoUrl}/pull/${pr.number}`,
          };

          await this.prisma.githubPullRequest.upsert({
            where: {
              groupId_repositoryId_number: {
                groupId,
                repositoryId: repo.id,
                number: pr.number,
              },
            },
            create: data,
            update: {
              title: data.title,
              state: data.state,
              mergedAt: data.mergedAt,
            },
          });
          processed++;
        }
      } catch (repoErr: any) {
        const msg = `Repo ${repo.repoOwner}/${repo.repoName}: ${repoErr?.message || 'Lỗi sync'}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }
 
    if (errors.length > 0) {
      throw new Error(
        `Đồng bộ thất bại hoặc chưa hoàn tất ở ${errors.length}/${group.repositories.length} repo: ${errors.join('; ')}`,
      );
    }

    return processed;
  }

  /**
   * Lấy lịch sử sync của 1 nhóm.
   */
  async getSyncLogs(groupId: string, limit = 20, user?: { id: string; role: Role }) {
    await this.checkGroupAccess(groupId, user, false);
    return this.prisma.syncLog.findMany({
      where: { groupId },
      orderBy: { startedAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  private extractSprintName(fields: any): string | null {
    // Sprint có thể nằm ở fields.sprint hoặc customfield_10020
    const s =
      fields.sprint ??
      (Array.isArray(fields.customfield_10020)
        ? fields.customfield_10020[fields.customfield_10020.length - 1]
        : fields.customfield_10020);
    return s?.name ?? null;
  }

  /**
   * Tự động nhận diện thành viên dự án từ Jira và GitHub sau mỗi phiên Sync
   */
  async autoDiscoverMembers(groupId: string, group: any): Promise<number> {
    const discoveredNames = new Set<string>();

    // 1. Quét Jira Assignable Users
    if (group.jiraProjectKey) {
      try {
        const jiraUsers = await this.jira.getAssignableUsers(
          group.jiraProjectKey,
          group.jiraBaseUrl || undefined,
        );
        for (const u of jiraUsers) {
          if (u.displayName && u.displayName.trim().length > 1) {
            discoveredNames.add(u.displayName.trim());
          }
        }
      } catch (err: any) {
        // ignore Jira fetch error
      }
    }

    // 2. Quét Git Commit Authors
    const commitAuthors = await this.prisma.githubCommit.findMany({
      where: { groupId },
      select: { author: true },
      distinct: ['author'],
    });
    for (const c of commitAuthors) {
      if (
        c.author &&
        c.author.trim().length > 1 &&
        !c.author.includes('[bot]') &&
        !c.author.toLowerCase().includes('github-actions')
      ) {
        discoveredNames.add(c.author.trim());
      }
    }

    if (discoveredNames.size === 0) return 0;

    const currentMembers = await this.prisma.groupMember.findMany({ where: { groupId } });
    const existingNames = new Set(
      currentMembers.map((m) => (m.fullName || '').toLowerCase().trim()),
    );

    const defaultSampleNames = [
      'nguyễn văn an',
      'trần thị bích',
      'lê hoàng cường',
      'phạm minh đức',
      'hoàng thị giang',
      'đỗ quốc hùng',
      'vũ thuỳ linh',
      'bùi quang nam',
      'ngô hải phong',
      'đặng quỳnh trang',
    ];
    const isAllSample =
      currentMembers.length > 0 &&
      currentMembers.every(
        (m) =>
          (m.fullName || '').startsWith('Sinh viên mẫu') ||
          defaultSampleNames.includes((m.fullName || '').toLowerCase().trim()),
      );

    if (isAllSample) {
      await this.prisma.groupMember.deleteMany({ where: { groupId } });
      existingNames.clear();
    }

    const prefix = group.code ? group.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : 'GRP';
    let addedCount = 0;
    let nextIndex = isAllSample ? 1 : currentMembers.length + 1;

    for (const name of discoveredNames) {
      if (!existingNames.has(name.toLowerCase())) {
        const isLeader = nextIndex === 1;
        await this.prisma.groupMember.create({
          data: {
            groupId,
            memberCode: `${prefix}${String(nextIndex).padStart(2, '0')}`,
            fullName: name,
            role: isLeader ? 'Nhóm trưởng (Jira/Git)' : 'Lập trình viên (Jira/Git)',
          },
        });
        existingNames.add(name.toLowerCase());
        addedCount++;
        nextIndex++;
      }
    }

    if (addedCount > 0 || isAllSample) {
      const totalCount = await this.prisma.groupMember.count({ where: { groupId } });
      await this.prisma.group.update({
        where: { id: groupId },
        data: { memberCount: totalCount },
      });
      this.logger.log(
        `[AutoDiscover] Đã tự động tích hợp ${addedCount} thành viên từ Jira/Git cho nhóm ${group.code}`,
      );
    }

    return addedCount;
  }
}
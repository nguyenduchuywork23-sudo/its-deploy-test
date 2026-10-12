import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private jira: JiraService,
    private github: GithubService,
  ) {}

  /**
   * Sync cả 2 nguồn. Lỗi 1 nguồn không làm chết nguồn còn lại.
   * Hỗ trợ cờ incremental (US-10).
   */
  async syncGroup(groupId: string, options?: { incremental?: boolean }): Promise<SyncGroupResult> {
    // Verify group tồn tại
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new BadRequestException('Không tìm thấy nhóm');

    const [jiraRes, githubRes] = await Promise.all([
      this.syncGroupJira(groupId, options),
      this.syncGroupGithub(groupId, options),
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

    return { groupId, jira: jiraRes, github: githubRes, overallStatus };
  }

  /**
   * Sync riêng Jira kèm ghi nhận SyncLog và cập nhật lastSyncAt (US-10 hỗ trợ incremental)
   */
  async syncGroupJira(groupId: string, options?: { incremental?: boolean }): Promise<SourceResult> {
    const res = await this.runSyncWithLog(groupId, 'JIRA', () => this.syncJira(groupId, options));
    if (res.ok) {
      await this.prisma.group.update({
        where: { id: groupId },
        data: { lastSyncAt: new Date() },
      });
    }
    return res;
  }

  /**
   * Sync riêng GitHub kèm ghi nhận SyncLog và cập nhật lastSyncAt (US-10 hỗ trợ incremental)
   */
  async syncGroupGithub(groupId: string, options?: { incremental?: boolean }): Promise<SourceResult> {
    const res = await this.runSyncWithLog(groupId, 'GITHUB', () => this.syncGithub(groupId, options));
    if (res.ok) {
      await this.prisma.group.update({
        where: { id: groupId },
        data: { lastSyncAt: new Date() },
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

    let since: Date | undefined;
    if (options?.incremental) {
      const latest = await this.prisma.jiraIssue.findFirst({
        where: { groupId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });
      if (latest?.updatedAt) {
        since = new Date(latest.updatedAt.getTime() - 5 * 60 * 1000);
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

    let processed = 0;
    const errors: string[] = [];

    for (const repo of group.repositories) {
      try {
        let since: Date | undefined;
        if (options?.incremental) {
          const latest = await this.prisma.githubCommit.findFirst({
            where: { groupId, repositoryId: repo.id },
            orderBy: { committedAt: 'desc' },
            select: { committedAt: true },
          });
          if (latest?.committedAt) {
            since = new Date(latest.committedAt.getTime() - 5 * 60 * 1000);
          }
        }

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

    if (errors.length === group.repositories.length && group.repositories.length > 0) {
      throw new Error(`Đồng bộ thất bại cho tất cả repo: ${errors.join('; ')}`);
    }

    return processed;
  }

  /**
   * Lấy lịch sử sync của 1 nhóm.
   */
  async getSyncLogs(groupId: string, limit = 20) {
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
}
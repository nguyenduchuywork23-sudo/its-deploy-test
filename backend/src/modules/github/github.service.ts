// backend/src/modules/github/github.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncStatus, SyncSource } from '@prisma/client';

// ============================================================
// [MỚI] Constants + retry helper đặt cục bộ để file tự đủ, không cần
// github.constants.ts / retry.util.ts. Nếu đã có sẵn thì có thể xóa
// khối này và import lại.
// ============================================================
const GITHUB_API = {
  BASE: 'https://api.github.com',
  REPO: '/repos',
  RATE_LIMIT: '/rate_limit',
};

const GITHUB_PAGINATION = {
  PER_PAGE: 100,
  MAX_COMMITS: 500,
  MAX_PRS: 300,
  HARD_LIMIT_PAGES: 50,
};

const GITHUB_RATE_LIMIT_WARN_THRESHOLD = 100;
const GITHUB_TIMEOUT_MS = 30_000;

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: { retries: number; baseDelayMs: number },
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      // Chỉ retry lỗi tạm thời: network, 429, 5xx. Không retry 4xx.
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt >= opts.retries) throw err;
      await new Promise((r) => setTimeout(r, opts.baseDelayMs * 2 ** attempt));
      attempt++;
    }
  }
}

// ============================================================
// [MỚI] Types
// ============================================================
export interface GitHubTestResult {
  ok: boolean;
  fullName?: string;
  private?: boolean;
  defaultBranch?: string;
  error?: string;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  resetAt: Date;
  used: number;
}

export interface FetchCommitsOptions {
  /** Chỉ lấy commits sau mốc này */
  since?: Date;
  /** Số commits tối đa (mặc định 500) */
  maxCommits?: number;
}

export interface FetchPullRequestsOptions {
  /** Số PR tối đa (mặc định 300) */
  maxPRs?: number;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  // [CŨ - GIỮ NGUYÊN]
  private headers() {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
  }

  // [MỚI]
  private getToken(): string {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('Thiếu GITHUB_TOKEN trong ENV');
    return token;
  }

  // [MỚI]
  private buildClient(): AxiosInstance {
    return axios.create({
      baseURL: GITHUB_API.BASE,
      timeout: GITHUB_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'mentor-tracker',
      },
    });
  }

  // [MỚI]
  private mapErrorMessage(error: AxiosError): string {
    const status = error.response?.status;
    const remaining = error.response?.headers?.['x-ratelimit-remaining'];

    if (status === 401) return 'GitHub token không hợp lệ (401)';
    if (status === 403) {
      if (remaining === '0')
        return 'GitHub rate limit đã hết (403) — đợi reset hoặc đổi token';
      return 'Token thiếu quyền truy cập repo (403)';
    }
    if (status === 404) return 'Không tìm thấy repository (404)';
    if (status === 422) return 'Request không hợp lệ (422)';
    if (status === 451) return 'Repo bị block vì lý do pháp lý (451)';
    if (status && status >= 500) return `GitHub server error (${status})`;
    if (error.code === 'ECONNABORTED') return 'Timeout khi kết nối GitHub';
    if (error.code === 'ENOTFOUND') return 'Không phân giải được api.github.com';
    if (error.code === 'ECONNREFUSED') return 'Bị từ chối kết nối tới GitHub';
    return error.message ?? 'Lỗi không xác định';
  }

  /**
   * [MỚI - ĐÈ BẢN CŨ] Parse repo URL thành {owner, repo}.
   * Hỗ trợ cả HTTPS và SSH form. URL sai → throw Error (bản cũ trả null).
   */
  parseRepoUrl(url: string): { owner: string; repo: string } {
    const cleaned = url.trim().replace(/\/$/, ''); // bỏ dấu "/" cuối nếu có
    const m = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!m) throw new Error(`URL GitHub không hợp lệ: ${url}`);
    return { owner: m[1], repo: m[2] };
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * [MỚI - ĐÈ BẢN CŨ] Test kết nối 1 repo (dùng ở Day 1 — Groups Service).
   */
  async testRepository(owner: string, repo: string): Promise<GitHubTestResult> {
    if (!process.env.GITHUB_TOKEN) {
      return { ok: false, error: 'Thiếu GITHUB_TOKEN trong ENV' };
    }

    try {
      const client = this.buildClient();
      const res = await retryWithBackoff(
        () => client.get(`${GITHUB_API.REPO}/${owner}/${repo}`),
        { retries: 1, baseDelayMs: 500 },
      );

      return {
        ok: true,
        fullName: res.data.full_name,
        private: res.data.private,
        defaultBranch: res.data.default_branch,
      };
    } catch (err) {
      const message = this.mapErrorMessage(err as AxiosError);
      this.logger.warn(`GitHub test failed for ${owner}/${repo}: ${message}`);
      return { ok: false, error: message };
    }
  }

  /**
   * [MỚI] Lấy commits của 1 repo, phân trang 100/page.
   * Trả về mảng commits theo shape GitHub API.
   */
  async fetchCommits(
    owner: string,
    repo: string,
    options: FetchCommitsOptions = {},
  ): Promise<any[]> {
    const maxCommits = Math.min(
      options.maxCommits ?? GITHUB_PAGINATION.MAX_COMMITS,
      5000,
    );
    const perPage = GITHUB_PAGINATION.PER_PAGE;
    const maxPages = Math.min(
      Math.ceil(maxCommits / perPage),
      GITHUB_PAGINATION.HARD_LIMIT_PAGES,
    );

    const client = this.buildClient();
    const all: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const params: any = { per_page: perPage, page };
      if (options.since) params.since = options.since.toISOString();

      const res = await retryWithBackoff(
        () => client.get(`${GITHUB_API.REPO}/${owner}/${repo}/commits`, { params }),
        { retries: 3, baseDelayMs: 800 },
      );

      const batch: any[] = Array.isArray(res.data) ? res.data : [];
      all.push(...batch);

      this.logger.debug(
        `GitHub commits ${owner}/${repo} page=${page} got=${batch.length} acc=${all.length}`,
      );

      if (batch.length < perPage) break;
      if (all.length >= maxCommits) break;
    }

    // Cắt đúng maxCommits
    const trimmed = all.slice(0, maxCommits);
    this.logger.log(`Fetched ${trimmed.length} commits from ${owner}/${repo}`);
    return trimmed;
  }

  /**
   * [MỚI] Lấy PRs (state=all) của 1 repo, phân trang 100/page.
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    options: FetchPullRequestsOptions = {},
  ): Promise<any[]> {
    const maxPRs = Math.min(options.maxPRs ?? GITHUB_PAGINATION.MAX_PRS, 5000);
    const perPage = GITHUB_PAGINATION.PER_PAGE;
    const maxPages = Math.min(
      Math.ceil(maxPRs / perPage),
      GITHUB_PAGINATION.HARD_LIMIT_PAGES,
    );

    const client = this.buildClient();
    const all: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const res = await retryWithBackoff(
        () =>
          client.get(`${GITHUB_API.REPO}/${owner}/${repo}/pulls`, {
            params: {
              state: 'all',
              per_page: perPage,
              page,
              sort: 'updated',
              direction: 'desc',
            },
          }),
        { retries: 3, baseDelayMs: 800 },
      );

      const batch: any[] = Array.isArray(res.data) ? res.data : [];
      all.push(...batch);

      this.logger.debug(
        `GitHub PRs ${owner}/${repo} page=${page} got=${batch.length} acc=${all.length}`,
      );

      if (batch.length < perPage) break;
      if (all.length >= maxPRs) break;
    }

    const trimmed = all.slice(0, maxPRs);
    this.logger.log(`Fetched ${trimmed.length} PRs from ${owner}/${repo}`);
    return trimmed;
  }

  /**
   * [MỚI] Lấy rate limit hiện tại của token.
   */
  async getRateLimit(): Promise<GitHubRateLimit> {
    const client = this.buildClient();
    const res = await client.get(GITHUB_API.RATE_LIMIT);
    const core = res.data?.resources?.core ?? res.data?.rate;

    const result: GitHubRateLimit = {
      limit: core?.limit ?? 0,
      remaining: core?.remaining ?? 0,
      used: core?.used ?? 0,
      resetAt: new Date((core?.reset ?? 0) * 1000),
    };

    if (result.remaining < GITHUB_RATE_LIMIT_WARN_THRESHOLD) {
      this.logger.warn(
        `GitHub rate limit sắp hết: ${result.remaining}/${result.limit}, reset lúc ${result.resetAt.toISOString()}`,
      );
    }

    return result;
  }

  /**
   * [MỚI] Đảm bảo còn đủ rate limit trước khi sync nhiều repo.
   * Throw nếu không đủ.
   */
  async assertRateLimit(minRequired = 100): Promise<void> {
    try {
      const rl = await this.getRateLimit();
      if (rl.remaining < minRequired) {
        throw new Error(
          `GitHub rate limit không đủ: còn ${rl.remaining}, cần ít nhất ${minRequired}. Reset lúc ${rl.resetAt.toISOString()}`,
        );
      }
    } catch (err) {
      // Nếu không lấy được rate limit, chỉ warn chứ không block
      this.logger.warn(
        `Không kiểm tra được GitHub rate limit: ${(err as Error).message}`,
      );
    }
  }

  // ============================================================
  // [CŨ - GIỮ NGUYÊN] Sync trực tiếp vào DB
  // ============================================================

  /**
   * JIRA-204 (ITS-19): Đồng bộ Commits từ GitHub repository
   */
  async syncCommitsForRepo(
    groupId: string,
    repositoryId: string,
    owner: string,
    repo: string,
  ): Promise<number> {
    try {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
        headers: this.headers(),
        params: { per_page: 100 },
        timeout: 15_000,
      });

      let count = 0;
      for (const item of res.data) {
        if (!item.sha) continue;
        const author =
          item.commit?.author?.name || item.author?.login || item.commit?.committer?.name || 'Unknown';
        const committedAt = new Date(
          item.commit?.author?.date || item.commit?.committer?.date || Date.now(),
        );

        await this.prisma.githubCommit.upsert({
          where: {
            groupId_sha: {
              groupId,
              sha: item.sha,
            },
          },
          update: {
            message: item.commit?.message || '',
            author,
            committedAt,
            url: item.html_url || `https://github.com/${owner}/${repo}/commit/${item.sha}`,
          },
          create: {
            groupId,
            repositoryId,
            sha: item.sha,
            message: item.commit?.message || '',
            author,
            committedAt,
            url: item.html_url || `https://github.com/${owner}/${repo}/commit/${item.sha}`,
          },
        });
        count++;
      }
      return count;
    } catch (err: any) {
      this.logger.error(`Lỗi khi sync commits cho ${owner}/${repo}: ${err.message}`);
      throw err;
    }
  }

  /**
   * JIRA-205 (ITS-20): Đồng bộ Pull Requests từ GitHub repository
   */
  async syncPullRequestsForRepo(
    groupId: string,
    repositoryId: string,
    owner: string,
    repo: string,
  ): Promise<number> {
    try {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        headers: this.headers(),
        params: { state: 'all', per_page: 100 },
        timeout: 15_000,
      });

      let count = 0;
      for (const item of res.data) {
        if (!item.number) continue;

        await this.prisma.githubPullRequest.upsert({
          where: {
            groupId_repositoryId_number: {
              groupId,
              repositoryId,
              number: item.number,
            },
          },
          update: {
            title: item.title || '',
            state: item.state || 'open',
            mergedAt: item.merged_at ? new Date(item.merged_at) : null,
            url: item.html_url || '',
          },
          create: {
            groupId,
            repositoryId,
            number: item.number,
            title: item.title || '',
            state: item.state || 'open',
            createdAt: new Date(item.created_at || Date.now()),
            mergedAt: item.merged_at ? new Date(item.merged_at) : null,
            url: item.html_url || '',
          },
        });
        count++;
      }
      return count;
    } catch (err: any) {
      this.logger.error(`Lỗi khi sync PRs cho ${owner}/${repo}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Đồng bộ toàn bộ GitHub (Commits + PRs) cho một nhóm & ghi SyncLog (JIRA-206)
   */
  async syncGroupGithub(groupId: string): Promise<{
    success: boolean;
    commitsCount: number;
    prsCount: number;
    error?: string;
  }> {
    const startedAt = new Date();
    const syncLog = await this.prisma.syncLog.create({
      data: {
        groupId,
        source: SyncSource.GITHUB,
        status: SyncStatus.STALE,
        startedAt,
        recordsProcessed: 0,
      },
    });

    const repos = await this.prisma.githubRepository.findMany({
      where: { groupId, isActive: true },
    });

    if (repos.length === 0) {
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.SUCCESS,
          finishedAt: new Date(),
          recordsProcessed: 0,
        },
      });
      return { success: true, commitsCount: 0, prsCount: 0 };
    }

    let totalCommits = 0;
    let totalPrs = 0;
    let lastError: string | null = null;

    for (const r of repos) {
      // [SỬA] parseRepoUrl mới throw thay vì trả null → bắt lỗi để bỏ qua repo sai URL
      let parsed: { owner: string; repo: string };
      try {
        parsed = this.parseRepoUrl(r.repoUrl);
      } catch (err: any) {
        this.logger.warn(`Bỏ qua repo ${r.id}: ${err.message}`);
        continue;
      }

      try {
        const cCount = await this.syncCommitsForRepo(groupId, r.id, parsed.owner, parsed.repo);
        totalCommits += cCount;
      } catch (err: any) {
        lastError = err.message;
      }

      try {
        const pCount = await this.syncPullRequestsForRepo(groupId, r.id, parsed.owner, parsed.repo);
        totalPrs += pCount;
      } catch (err: any) {
        lastError = err.message;
      }
    }

    const totalRecords = totalCommits + totalPrs;
    const finalStatus = lastError && totalRecords === 0
      ? SyncStatus.ERROR
      : lastError && totalRecords > 0
      ? SyncStatus.PARTIAL
      : SyncStatus.SUCCESS;

    await this.prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
        recordsProcessed: totalRecords,
        errorMessage: lastError,
      },
    });

    // Cập nhật group syncStatus và lastSyncAt
    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        lastSyncAt: new Date(),
        syncStatus: finalStatus,
      },
    });

    return {
      success: finalStatus !== SyncStatus.ERROR,
      commitsCount: totalCommits,
      prsCount: totalPrs,
      error: lastError || undefined,
    };
  }
}
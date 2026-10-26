// backend/src/modules/jira/jira.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

// ============================================================
// [MỚI] Constants + retry helper đặt cục bộ để file tự đủ, không cần
// jira.constants.ts / retry.util.ts. Nếu đã có sẵn 2 file đó thì có thể
// xóa phần này và import lại.
// ============================================================
const JIRA_API = {
  PROJECT: '/rest/api/3/project',
  SEARCH_OLD: '/rest/api/3/search',
  SEARCH_NEW: '/rest/api/3/search/jql',
  SPRINT_FIELD_DEFAULT: 'customfield_10020',
};

const JIRA_PAGINATION = {
  MAX_RESULTS_PER_PAGE: 100,
  HARD_LIMIT_PAGES: 50,
};

const JIRA_TIMEOUT_MS = 30_000;

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
      // Chỉ retry lỗi tạm thời: network, 429, 5xx. Không retry 4xx (kể cả 410 để fallback nhanh).
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt >= opts.retries) throw err;
      const delay = opts.baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}

// ============================================================
// [MỚI] Types
// ============================================================
export interface JiraTestConnectionParams {
  baseUrl: string;
  projectKey: string;
  email?: string;
  apiToken?: string;
}

export interface JiraTestConnectionResult {
  ok: boolean;
  projectName?: string;
  projectId?: string; // [MỚI]
  error?: string;
}

export interface JiraFetchOptions {
  /** Nếu truyền vào, chỉ lấy issues updated sau mốc này */
  since?: Date;
  /** Field ID của Sprint (mặc định customfield_10020) */
  sprintFieldId?: string;
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  // ============================================================
  // [MỚI] PRIVATE HELPERS
  // ============================================================

  private buildAuthHeader(): string {
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;
    if (!email || !token) {
      throw new Error('Thiếu JIRA_EMAIL hoặc JIRA_API_TOKEN trong ENV');
    }
    return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  }

  private buildAxios(baseUrl: string): AxiosInstance {
    return axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      timeout: JIRA_TIMEOUT_MS,
      headers: {
        Authorization: this.buildAuthHeader(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  private mapErrorMessage(error: AxiosError): string {
    const status = error.response?.status;
    if (status === 400) {
      const data = error.response?.data as
        | { errorMessages?: string[]; errors?: Record<string, string> }
        | undefined;

      const details = [
        ...(data?.errorMessages ?? []),
        ...Object.values(data?.errors ?? {}),
      ].filter(Boolean);

      this.logger.error(
        `Jira HTTP 400: ${JSON.stringify(data ?? error.message)}`,
      );

      return details.length
        ? `Jira 400: ${details.join('; ')}`
        : 'Request không hợp lệ (400); xem log backend';
    }
    if (status === 401) return 'Sai email hoặc API token (401)';
    if (status === 403) return 'Token thiếu quyền truy cập project (403)';
    if (status === 404) return 'Không tìm thấy project key hoặc URL (404)';
    if (status === 410)
      return 'Endpoint /search cũ đã bị block, cần dùng /search/jql (410)';
    if (status === 429) return 'Bị rate limit bởi Jira (429)';
    if (status && status >= 500) return `Jira server error (${status})`;
    if (error.code === 'ECONNABORTED') return 'Timeout khi kết nối Jira';
    if (error.code === 'ENOTFOUND') return 'Không phân giải được tên miền Jira';
    if (error.code === 'ECONNREFUSED') return 'Bị từ chối kết nối tới Jira';
    return error.message ?? 'Lỗi không xác định';
  }

  /** Escape project key để nhúng vào JQL an toàn. */
  private escapeJqlValue(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  /** Extract Sprint name từ fields — hỗ trợ nhiều shape dữ liệu. */
  private extractSprintName(fields: any, sprintFieldId: string): string | null {
    const raw =
      fields?.sprint ??
      fields?.[sprintFieldId] ??
      fields?.customfield_10020 ??
      null;

    if (!raw) return null;

    // Jira có thể trả về 1 object hoặc mảng các sprint
    if (Array.isArray(raw)) {
      // Lấy sprint active cuối cùng, fallback sprint cuối
      const active = raw.filter((s: any) => s?.state === 'active');
      const target = active.length ? active[active.length - 1] : raw[raw.length - 1];
      return target?.name ?? null;
    }

    if (typeof raw === 'object') {
      return raw.name ?? null;
    }

    return null;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * [CODE CŨ - GIỮ NGUYÊN] Test kết nối Jira.
   * Chỉ thêm projectId vào kết quả trả về.
   */
  async testConnection(params: {
    baseUrl: string;
    projectKey: string;
    email?: string;
    apiToken?: string;
  }): Promise<{ ok: boolean; projectName?: string; projectId?: string; error?: string }> {
    const email = params.email ?? process.env.JIRA_EMAIL!;
    const apiToken = params.apiToken ?? process.env.JIRA_API_TOKEN!;

    if (!email || !apiToken) {
      return { ok: false, error: 'Thiếu JIRA_EMAIL hoặc JIRA_API_TOKEN trong ENV' };
    }

    try {
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      const url = `${params.baseUrl.replace(/\/$/, '')}/rest/api/3/project/${params.projectKey}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        timeout: 10_000,
      });

      return { ok: true, projectName: res.data.name, projectId: res.data?.id };
    } catch (err) {
      const error = err as AxiosError;
      const status = error.response?.status;
      let message = error.message;

      if (status === 401) message = 'Sai email hoặc API token';
      else if (status === 403) message = 'Token thiếu quyền truy cập project';
      else if (status === 404) message = 'Không tìm thấy project key hoặc URL';
      else if (error.code === 'ECONNABORTED') message = 'Timeout khi kết nối Jira';
      else if (error.code === 'ENOTFOUND') message = 'Không phân giải được tên miền Jira';

      this.logger.warn(`Jira test failed for project ${params.projectKey}: ${message}`);
      return { ok: false, error: message };
    }
  }

  /**
   * [MỚI] Lấy toàn bộ issues kèm changelog.
   * Tự động fallback sang /search/jql nếu /search cũ trả 410.
   */
  async fetchIssuesWithChangelog(
    projectKey: string,
    baseUrl: string,
    options: JiraFetchOptions = {},
  ): Promise<any[]> {
    const opts: JiraFetchOptions = {
      ...options,
      sprintFieldId: options.sprintFieldId ?? JIRA_API.SPRINT_FIELD_DEFAULT,
    };

    try {
      return await this.fetchViaOldEndpoint(projectKey, baseUrl, opts);
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 410) {
        this.logger.warn(
          `Jira /search endpoint returned 410 — falling back to /search/jql`,
        );
        return await this.fetchViaNewEndpointSafe(projectKey, baseUrl, opts);
      }
      throw this.toReadableError(err);
    }
  }

  /** [MỚI] Gọi endpoint mới và chuyển lỗi axios thành message dễ đọc. */
  private async fetchViaNewEndpointSafe(
    projectKey: string,
    baseUrl: string,
    options: JiraFetchOptions,
  ): Promise<any[]> {
    try {
      return await this.fetchViaNewEndpoint(projectKey, baseUrl, options);
    } catch (err) {
      throw this.toReadableError(err);
    }
  }

  /** [MỚI] Axios error → Error với message tiếng Việt (để lưu vào SyncLog). */
  private toReadableError(err: unknown): Error {
    if (axios.isAxiosError(err)) return new Error(this.mapErrorMessage(err));
    return err instanceof Error ? err : new Error('Lỗi không xác định');
  }

  /** [MỚI] Endpoint cũ GET /rest/api/3/search (startAt + maxResults). */
  private async fetchViaOldEndpoint(
    projectKey: string,
    baseUrl: string,
    options: JiraFetchOptions,
  ): Promise<any[]> {
    const client = this.buildAxios(baseUrl);
    const escapedKey = this.escapeJqlValue(projectKey);

    const jqlParts = [`project = "${escapedKey}"`];
    if (options.since) {
      // JQL datetime format: "yyyy/MM/dd HH:mm"
      const d = options.since;
      const pad = (n: number) => String(n).padStart(2, '0');
      const jqlDate = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(
        d.getUTCDate(),
      )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      jqlParts.push(`AND updated >= "${jqlDate}"`);
    }
    jqlParts.push('ORDER BY updated DESC');

    const allIssues: any[] = [];
    let startAt = 0;
    const maxResults = JIRA_PAGINATION.MAX_RESULTS_PER_PAGE;

    for (let page = 0; page < JIRA_PAGINATION.HARD_LIMIT_PAGES; page++) {
      const res = await retryWithBackoff(
        () =>
          client.get(JIRA_API.SEARCH_OLD, {
            params: {
              jql: jqlParts.join(' '),
              startAt,
              maxResults,
              expand: 'changelog',
              fields: [
                'summary',
                'status',
                'issuetype',
                'created',
                'updated',
                'sprint',
                options.sprintFieldId ?? JIRA_API.SPRINT_FIELD_DEFAULT,
              ].join(','),
            },
          }),
        { retries: 3, baseDelayMs: 800 },
      );

      const issues: any[] = res.data?.issues ?? [];
      const total: number = res.data?.total ?? 0;
      allIssues.push(...issues);

      this.logger.debug(
        `Jira fetch page=${page} got=${issues.length} total=${total} acc=${allIssues.length}`,
      );

      if (issues.length < maxResults) break;
      if (allIssues.length >= total) break;
      startAt += maxResults;
    }

    this.logger.log(
      `Fetched ${allIssues.length} Jira issues from project ${projectKey}`,
    );
    return allIssues;
  }

  /** [MỚI] Endpoint mới POST /rest/api/3/search/jql (nextPageToken). */
  private async fetchViaNewEndpoint(
    projectKey: string,
    baseUrl: string,
    options: JiraFetchOptions,
  ): Promise<any[]> {
    const client = this.buildAxios(baseUrl);
    const escapedKey = this.escapeJqlValue(projectKey);

    const jqlParts = [`project = "${escapedKey}"`];
    if (options.since) {
      const d = options.since;
      const pad = (n: number) => String(n).padStart(2, '0');
      const jqlDate = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(
        d.getUTCDate(),
      )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      jqlParts.push(`AND updated >= "${jqlDate}"`);
    }
    jqlParts.push('ORDER BY updated DESC');

    const allIssues: any[] = [];
    let nextPageToken: string | undefined = undefined;

    for (let page = 0; page < JIRA_PAGINATION.HARD_LIMIT_PAGES; page++) {
      const body: any = {
        jql: jqlParts.join(' '),
        maxResults: JIRA_PAGINATION.MAX_RESULTS_PER_PAGE,
        fields: [
          'summary',
          'status',
          'issuetype',
          'created',
          'updated',
          'sprint',
          options.sprintFieldId ?? JIRA_API.SPRINT_FIELD_DEFAULT,
        ],
        expand: 'changelog',
      };
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const res: any = await retryWithBackoff(
        () => client.post(JIRA_API.SEARCH_NEW, body),
        { retries: 3, baseDelayMs: 800 },
      );

      const issues: any[] = res.data?.issues ?? [];
      allIssues.push(...issues);
      nextPageToken = res.data?.nextPageToken;

      this.logger.debug(
        `Jira /search/jql page=${page} got=${issues.length} acc=${allIssues.length} token=${nextPageToken ?? 'none'}`,
      );

      if (!nextPageToken) break;
    }

    this.logger.log(
      `Fetched ${allIssues.length} Jira issues (new API) from project ${projectKey}`,
    );
    return allIssues;
  }

  /**
   * [MỚI] Helper public: lấy sprint name từ fields.
   * Dùng trong SyncService để không phải duplicate logic.
   */

async inspectSprintFields(
  projectKey: string,
  baseUrl: string,
): Promise<any> {
  const client = this.buildAxios(baseUrl);

  const res = await client.get('/rest/api/3/field');

  const fields: any[] = res.data ?? [];

  return fields
    .filter((field) =>
      /sprint/i.test(field.name ?? '') ||
      /sprint/i.test(field.id ?? ''),
    )
    .map((field) => ({
      id: field.id,
      name: field.name,
      custom: field.custom,
      schema: field.schema,
    }));
}





  getSprintName(
    fields: any,
    sprintFieldId = JIRA_API.SPRINT_FIELD_DEFAULT,
  ): string | null {
    return this.extractSprintName(fields, sprintFieldId);
  }

  /**
   * Lấy danh sách thành viên/users có thể được gán task trong project Jira
   */
  async getAssignableUsers(
    projectKey: string,
    baseUrl?: string,
  ): Promise<Array<{ displayName: string; email?: string; accountId: string }>> {
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;
    if (!email || !token) return [];
    const targetUrl = baseUrl || process.env.JIRA_BASE_URL || 'https://cg-ictu.atlassian.net';
    try {
      const client = this.buildAxios(targetUrl);
      const res = await client.get('/rest/api/3/user/assignable/search', {
        params: { project: projectKey, maxResults: 100 },
      });
      return (res.data || [])
        .filter(
          (u: any) =>
            u.accountType === 'atlassian' &&
            !u.displayName?.includes('addon_') &&
            !u.displayName?.includes('Bot'),
        )
        .map((u: any) => ({
          displayName: u.displayName || '',
          email: u.emailAddress || '',
          accountId: u.accountId,
        }));
    } catch (err: any) {
      this.logger.warn(`Failed to fetch assignable users for ${projectKey}: ${err.message}`);
      return [];
    }
  }
}
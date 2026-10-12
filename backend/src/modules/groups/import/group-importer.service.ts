import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../../prisma/prisma.service';

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; code: string; message: string }[];
}

@Injectable()
export class GroupImporterService {
  private readonly logger = new Logger(GroupImporterService.name);

  constructor(private prisma: PrismaService) {}

  async importFromBuffer(buffer: Buffer): Promise<ImportResult> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new BadRequestException('File không có sheet nào');

    const sheet = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (rows.length === 0) throw new BadRequestException('File rỗng');

    const result: ImportResult = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const row = rows[i];
      const code = String(row.GroupCode ?? '').trim();
      const name = String(row.GroupName ?? '').trim();

      try {
        if (!code) throw new Error('Thiếu GroupCode');
        if (!name) throw new Error('Thiếu GroupName');

        const repos = this.parseRepos(row.GitHubRepos);

        await this.prisma.$transaction(async (tx) => {
          const group = await tx.group.upsert({
            where: { code },
            create: {
              code,
              name,
              memberCount: Number(row.MemberCount) || 10,
              jiraProjectKey: row.JiraProjectKey?.toString().trim() || null,
              jiraBaseUrl: row.JiraBaseUrl?.toString().trim() || null,
            },
            update: {
              name,
              memberCount: Number(row.MemberCount) || 10,
              jiraProjectKey: row.JiraProjectKey?.toString().trim() || null,
              jiraBaseUrl: row.JiraBaseUrl?.toString().trim() || null,
            },
          });

          // Replace all repos (idempotent)
          await tx.githubRepository.deleteMany({ where: { groupId: group.id } });

          for (const repoUrl of repos) {
            const { owner, repo } = this.parseGitHubUrl(repoUrl);
            await tx.githubRepository.create({
              data: {
                groupId: group.id,
                repoUrl,
                repoOwner: owner,
                repoName: repo,
              },
            });
          }
        });

        result.success++;
      } catch (err: any) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          code: code || '(trống)',
          message: err.message ?? 'Lỗi không xác định',
        });
      }
    }

    this.logger.log(`Import done: ${result.success}/${result.total} success`);
    return result;
  }

  private parseRepos(input: any): string[] {
    if (!input) return [];
    return String(input)
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const m = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!m) throw new Error(`URL GitHub không hợp lệ: ${url}`);
    return { owner: m[1], repo: m[2] };
  }
}
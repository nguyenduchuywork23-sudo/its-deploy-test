import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupImporterService } from './import/group-importer.service';
import { JiraService } from '../jira/jira.service';
import { GithubService } from '../github/github.service';
import { SyncService } from '../sync/sync.service';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private importer: GroupImporterService,
    private jira: JiraService,
    private github: GithubService,
    private syncService: SyncService,
  ) {}

  async import(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    if (!/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
      throw new BadRequestException('Chỉ nhận .xlsx, .xls, .csv');
    }
    return this.importer.importFromBuffer(file.buffer);
  }

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    user?: { id: string; role: Role };
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Number(params.limit) || 50);
    const search = params.search?.trim();

    const roleConditions: any = {};
    if (params.user) {
      if (params.user.role === Role.MENTOR) {
        // Mentor chỉ xem nhóm được gán cho bản thân
        roleConditions.mentorId = params.user.id;
      } else if (params.user.role === Role.INTERN) {
        // Thực tập sinh chỉ xem nhóm mà mình là thành viên
        roleConditions.members = { some: { userId: params.user.id } };
      }
    }

    const where: any = {
      ...roleConditions,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include: {
          repositories: true,
          mentor: {
            select: { id: true, email: true, fullName: true, role: true },
          },
          _count: {
            select: {
              jiraIssues: true,
              commits: true,
              pullRequests: true,
            },
          },
        },
        orderBy: { code: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, user?: { id: string; role: Role }) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        repositories: true,
        members: true,
        mentor: {
          select: { id: true, email: true, fullName: true, role: true },
        },
        _count: {
          select: {
            jiraIssues: true,
            commits: true,
            pullRequests: true,
            syncLogs: true,
          },
        },
      },
    });
    if (!group) throw new NotFoundException('Không tìm thấy nhóm');

    if (user) {
      if (user.role === Role.MENTOR && group.mentorId !== user.id) {
        throw new ForbiddenException('Bạn chỉ có quyền xem nhóm được gắn với tài khoản của mình');
      }
      if (user.role === Role.INTERN && !group.members.some((m) => m.userId === user.id)) {
        throw new ForbiddenException('Bạn chỉ có quyền xem nhóm mà bạn là thành viên');
      }
    }

    return group;
  }

  async update(id: string, dto: UpdateGroupDto, user?: { id: string; role: Role }) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền chỉnh sửa cấu hình nhóm');
    }

    await this.findOne(id, user);

    return this.prisma.$transaction(async (tx) => {
      const data: any = {};

      if (dto.mentorId !== undefined) {
        data.mentorId = dto.mentorId ? dto.mentorId : null;
      }

      if (dto.jiraProjectKey !== undefined) {
        data.jiraProjectKey = dto.jiraProjectKey?.trim() || null;
        data.jiraConnectionStatus = 'NEVER_TESTED';
        data.jiraErrorMessage = null;
      }

      if (dto.jiraBaseUrl !== undefined) {
        data.jiraBaseUrl = dto.jiraBaseUrl?.trim() || null;
      }

      if (dto.githubRepos !== undefined) {
        const cleaned = dto.githubRepos.map((r) => r.trim()).filter(Boolean);

        await tx.githubRepository.deleteMany({ where: { groupId: id } });

        for (const url of cleaned) {
          const { owner, repo } = this.parseGitHubUrl(url);
          await tx.githubRepository.create({
            data: { groupId: id, repoUrl: url, repoOwner: owner, repoName: repo },
          });
        }

        data.githubConnectionStatus = 'NEVER_TESTED';
        data.githubErrorMessage = null;
      }

      return tx.group.update({
        where: { id },
        data,
        include: { repositories: true },
      });
    });
  }

  async testJira(id: string) {
    const group = await this.findOne(id);

    if (!group.jiraProjectKey) {
      throw new BadRequestException('Nhóm chưa cấu hình Jira Project Key');
    }

    const result = await this.jira.testConnection({
      baseUrl: group.jiraBaseUrl ?? process.env.JIRA_BASE_URL!,
      projectKey: group.jiraProjectKey,
    });

    await this.prisma.group.update({
      where: { id },
      data: {
        jiraConnectionStatus: result.ok ? 'SUCCESS' : 'ERROR',
        jiraLastTestedAt: new Date(),
        jiraErrorMessage: result.ok ? null : (result.error ?? 'Unknown error'),
      },
    });

    return result;
  }

  async testGithub(id: string) {
    const group = await this.findOne(id);

    if (!group.repositories.length) {
      throw new BadRequestException('Nhóm chưa cấu hình GitHub repository');
    }

    const results = await Promise.all(
      group.repositories.map(async (r) => ({
        repoUrl: r.repoUrl,
        ...(await this.github.testRepository(r.repoOwner, r.repoName)),
      })),
    );

    const allOk = results.every((r) => r.ok);

    await this.prisma.group.update({
      where: { id },
      data: {
        githubConnectionStatus: allOk ? 'SUCCESS' : 'ERROR',
        githubLastTestedAt: new Date(),
        githubErrorMessage: allOk
          ? null
          : results
              .filter((r) => !r.ok)
              .map((r) => `${r.repoUrl}: ${r.error}`)
              .join('; '),
      },
    });

    return { allOk, results };
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const m = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!m) throw new BadRequestException(`URL GitHub không hợp lệ: ${url}`);
    return { owner: m[1], repo: m[2] };
  }

  async sync(id: string) {
    return this.syncService.syncGroup(id);
  }

  async getSyncLogs(id: string) {
    return this.syncService.getSyncLogs(id, 50);
  }

  async getIssues(id: string) {
    await this.findOne(id);
    return this.prisma.jiraIssue.findMany({
      where: { groupId: id },
      include: {
        transitions: {
          orderBy: { changedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCommits(id: string) {
    await this.findOne(id);
    return this.prisma.githubCommit.findMany({
      where: { groupId: id },
      orderBy: { committedAt: 'desc' },
      take: 100,
    });
  }

  async getPullRequests(id: string) {
    await this.findOne(id);
    return this.prisma.githubPullRequest.findMany({
      where: { groupId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getMembers(id: string) {
    await this.findOne(id);
    return this.prisma.groupMember.findMany({
      where: { groupId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(
    groupId: string,
    data: { memberCode: string; fullName: string; role?: string },
    user?: { id: string; role: Role },
  ) {
    await this.findOne(groupId, user);
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền thêm thành viên');
    }
    const member = await this.prisma.groupMember.create({
      data: {
        groupId,
        memberCode: data.memberCode,
        fullName: data.fullName,
        role: data.role || 'Thành viên',
      },
    });
    const count = await this.prisma.groupMember.count({ where: { groupId } });
    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: count },
    });
    return member;
  }

  async updateMember(
    groupId: string,
    memberId: string,
    data: { memberCode?: string; fullName?: string; role?: string },
    user?: { id: string; role: Role },
  ) {
    await this.findOne(groupId, user);
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền sửa thành viên');
    }
    return this.prisma.groupMember.update({
      where: { id: memberId },
      data: {
        ...(data.memberCode ? { memberCode: data.memberCode } : {}),
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
      },
    });
  }

  async deleteMember(groupId: string, memberId: string, user?: { id: string; role: Role }) {
    await this.findOne(groupId, user);
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền xóa thành viên');
    }
    const res = await this.prisma.groupMember.delete({
      where: { id: memberId },
    });
    const count = await this.prisma.groupMember.count({ where: { groupId } });
    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: count },
    });
    return res;
  }

  async initSampleMembers(groupId: string, user?: { id: string; role: Role }) {
    const group = await this.findOne(groupId, user);
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền tạo danh sách thành viên mẫu');
    }
    const currentMembers = await this.prisma.groupMember.findMany({ where: { groupId } });
    if (currentMembers.length >= 10) {
      return currentMembers;
    }

    const needed = 10 - currentMembers.length;
    const startIndex = currentMembers.length + 1;
    const prefix = group.code ? group.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : 'GRP';

    const defaultNames = [
      'Nguyễn Văn An',
      'Trần Thị Bích',
      'Lê Hoàng Cường',
      'Phạm Minh Đức',
      'Hoàng Thị Giang',
      'Đỗ Quốc Hùng',
      'Vũ Thuỳ Linh',
      'Bùi Quang Nam',
      'Ngô Hải Phong',
      'Đặng Quỳnh Trang',
    ];

    const newMembersData = Array.from({ length: needed }).map((_, i) => {
      const idx = startIndex + i;
      const isLeader = currentMembers.length === 0 && i === 0;
      return {
        groupId,
        memberCode: `${prefix}${String(idx).padStart(2, '0')}`,
        fullName: defaultNames[(idx - 1) % defaultNames.length],
        role: isLeader ? 'Nhóm trưởng' : 'Thành viên',
      };
    });

    await this.prisma.groupMember.createMany({
      data: newMembersData,
    });

    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: 10 },
    });

    return this.prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
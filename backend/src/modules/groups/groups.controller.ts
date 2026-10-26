import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import 'multer';
import { GroupsService } from './groups.service';
import { UpdateGroupDto } from './dto/update-group.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(OptionalJwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (user && user.role !== Role.SYSADMIN && user.role !== Role.LEAD_MENTOR) {
      throw new ForbiddenException(
        'Chỉ Quản trị viên (SysAdmin) hoặc Lead Mentor mới có quyền nhập danh sách nhóm từ file',
      );
    }
    return this.groups.import(file);
  }

  @Get('mentors/list')
  getMentors() {
    return this.groups.getMentors();
  }

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.groups.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      user,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: any,
  ) {
    return this.groups.update(id, dto, user);
  }

  @Post(':id/jira/test')
  testJira(@Param('id') id: string, @CurrentUser() user: any) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền kiểm tra kết nối Jira');
    }
    return this.groups.testJira(id, user);
  }

  @Post(':id/github/test')
  testGithub(@Param('id') id: string, @CurrentUser() user: any) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền kiểm tra kết nối GitHub');
    }
    return this.groups.testGithub(id, user);
  }

  @Post(':id/sync')
  sync(@Param('id') id: string, @CurrentUser() user: any) {
    if (user && user.role === Role.INTERN) {
      throw new ForbiddenException('Thực tập sinh không có quyền kích hoạt đồng bộ');
    }
    return this.groups.sync(id, user);
  }

  @Get(':id/sync-logs')
  getSyncLogs(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.getSyncLogs(id, user);
  }

  @Get(':id/issues')
  getIssues(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.getIssues(id, user);
  }

  @Get(':id/commits')
  getCommits(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.getCommits(id, user);
  }

  @Get(':id/pull-requests')
  getPullRequests(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.getPullRequests(id, user);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.getMembers(id, user);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: { memberCode: string; fullName: string; role?: string },
    @CurrentUser() user: any,
  ) {
    return this.groups.addMember(id, dto, user);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: { memberCode?: string; fullName?: string; role?: string },
    @CurrentUser() user: any,
  ) {
    return this.groups.updateMember(id, memberId, dto, user);
  }

  @Delete(':id/members/:memberId')
  deleteMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.groups.deleteMember(id, memberId, user);
  }

  @Post(':id/members/init-sample')
  initSampleMembers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.initSampleMembers(id, user);
  }

  @Post(':id/members/sync-sources')
  syncMembersFromSources(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groups.syncMembersFromSources(id, user);
  }
}
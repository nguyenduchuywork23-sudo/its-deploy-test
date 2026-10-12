import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupImporterService } from './import/group-importer.service';
import { JiraModule } from '../jira/jira.module';
import { GithubModule } from '../github/github.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [JiraModule, GithubModule, SyncModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupImporterService],
  exports: [GroupsService],
})
export class GroupsModule {}
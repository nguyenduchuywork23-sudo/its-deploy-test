import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncSchedulerService } from './sync-scheduler.service';
import { JiraModule } from '../jira/jira.module';
import { GithubModule } from '../github/github.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [JiraModule, GithubModule, MetricsModule],
  controllers: [SyncController],
  providers: [SyncService, SyncSchedulerService],
  exports: [SyncService, SyncSchedulerService],
})
export class SyncModule {}

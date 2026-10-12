import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { GroupsModule } from './modules/groups/groups.module';
import { JiraModule } from './modules/jira/jira.module';
import { GithubModule } from './modules/github/github.module';
import { SyncModule } from './modules/sync/sync.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    GroupsModule,
    JiraModule,
    GithubModule,
    SyncModule,
    MetricsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
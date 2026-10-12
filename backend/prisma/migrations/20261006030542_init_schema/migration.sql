-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('NEVER_TESTED', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('NEVER_SYNCED', 'SUCCESS', 'ERROR', 'PARTIAL', 'STALE');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('JIRA', 'GITHUB');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MENTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 10,
    "jiraProjectKey" TEXT,
    "jiraBaseUrl" TEXT,
    "jiraConnectionStatus" "ConnectionStatus" NOT NULL DEFAULT 'NEVER_TESTED',
    "jiraLastTestedAt" TIMESTAMP(3),
    "jiraErrorMessage" TEXT,
    "githubConnectionStatus" "ConnectionStatus" NOT NULL DEFAULT 'NEVER_TESTED',
    "githubLastTestedAt" TIMESTAMP(3),
    "githubErrorMessage" TEXT,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'NEVER_SYNCED',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_repositories" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "repoOwner" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberCode" TEXT,
    "fullName" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_group_metrics" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "taskDone" INTEGER NOT NULL DEFAULT 0,
    "subtaskDone" INTEGER NOT NULL DEFAULT 0,
    "commitCount" INTEGER NOT NULL DEFAULT 0,
    "prCreated" INTEGER NOT NULL DEFAULT 0,
    "prMerged" INTEGER NOT NULL DEFAULT 0,
    "blocked" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_group_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_issues" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "jira_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_transitions" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_commits" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "github_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_pull_requests" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "url" TEXT NOT NULL,

    CONSTRAINT "github_pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "groups_code_key" ON "groups"("code");

-- CreateIndex
CREATE INDEX "groups_syncStatus_idx" ON "groups"("syncStatus");

-- CreateIndex
CREATE INDEX "groups_code_idx" ON "groups"("code");

-- CreateIndex
CREATE INDEX "github_repositories_groupId_idx" ON "github_repositories"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "github_repositories_groupId_repoUrl_key" ON "github_repositories"("groupId", "repoUrl");

-- CreateIndex
CREATE INDEX "group_members_groupId_idx" ON "group_members"("groupId");

-- CreateIndex
CREATE INDEX "sync_logs_groupId_source_startedAt_idx" ON "sync_logs"("groupId", "source", "startedAt");

-- CreateIndex
CREATE INDEX "daily_group_metrics_date_idx" ON "daily_group_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_group_metrics_groupId_date_key" ON "daily_group_metrics"("groupId", "date");

-- CreateIndex
CREATE INDEX "jira_issues_groupId_issueType_status_idx" ON "jira_issues"("groupId", "issueType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issues_groupId_issueKey_key" ON "jira_issues"("groupId", "issueKey");

-- CreateIndex
CREATE INDEX "jira_transitions_issueId_changedAt_idx" ON "jira_transitions"("issueId", "changedAt");

-- CreateIndex
CREATE INDEX "github_commits_groupId_committedAt_idx" ON "github_commits"("groupId", "committedAt");

-- CreateIndex
CREATE UNIQUE INDEX "github_commits_groupId_sha_key" ON "github_commits"("groupId", "sha");

-- CreateIndex
CREATE INDEX "github_pull_requests_groupId_createdAt_idx" ON "github_pull_requests"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "github_pull_requests_groupId_mergedAt_idx" ON "github_pull_requests"("groupId", "mergedAt");

-- CreateIndex
CREATE UNIQUE INDEX "github_pull_requests_groupId_repositoryId_number_key" ON "github_pull_requests"("groupId", "repositoryId", "number");

-- AddForeignKey
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_group_metrics" ADD CONSTRAINT "daily_group_metrics_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_issues" ADD CONSTRAINT "jira_issues_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_transitions" ADD CONSTRAINT "jira_transitions_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "jira_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_commits" ADD CONSTRAINT "github_commits_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

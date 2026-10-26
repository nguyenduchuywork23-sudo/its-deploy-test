export const Role = {
  SYSADMIN: 'SYSADMIN',
  LEAD_MENTOR: 'LEAD_MENTOR',
  MENTOR: 'MENTOR',
  INTERN: 'INTERN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  createdAt?: string;
  assignedGroups?: { id: string; code: string; name: string }[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export type ConnectionStatus = 'NEVER_TESTED' | 'SUCCESS' | 'ERROR';

export type SyncStatus = 'NEVER_SYNCED' | 'SUCCESS' | 'ERROR' | 'PARTIAL' | 'STALE';

export interface GithubRepository {
  id: string;
  groupId: string;
  repoUrl: string;
  repoName: string;
  repoOwner: string;
  isActive: boolean;
  createdAt: string;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  jiraProjectKey: string | null;
  jiraBaseUrl: string | null;
  jiraConnectionStatus: ConnectionStatus;
  jiraLastTestedAt: string | null;
  jiraErrorMessage: string | null;
  githubConnectionStatus: ConnectionStatus;
  githubLastTestedAt: string | null;
  githubErrorMessage: string | null;
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  jiraLastSyncAt: string | null;
  githubLastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  repositories: GithubRepository[];
  members?: GroupMember[];
  mentorId?: string | null;
  mentor?: {
    id: string;
    email: string;
    fullName: string | null;
    role: Role;
  } | null;
  _count?: {
    jiraIssues?: number;
    commits?: number;
    pullRequests?: number;
    syncLogs?: number;
  };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId?: string | null;
  memberCode?: string | null;
  fullName?: string | null;
  role?: string | null;
  createdAt: string;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; code: string; message: string }[];
}

export interface SyncLog {
  id: string;
  groupId: string;
  source: 'JIRA' | 'GITHUB';
  status: SyncStatus;
  startedAt: string;
  finishedAt: string | null;
  recordsProcessed: number;
  errorMessage: string | null;
}

export interface JiraTransition {
  id: string;
  issueId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
}

export interface JiraIssue {
  id: string;
  groupId: string;
  issueKey: string;
  issueType: string;
  summary: string;
  status: string;
  sprint: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  transitions?: JiraTransition[];
}

export interface GithubCommit {
  id: string;
  groupId: string;
  repositoryId: string;
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
  url: string;
}

export interface GithubPullRequest {
  id: string;
  groupId: string;
  repositoryId: string;
  number: number;
  title: string;
  state: string;
  createdAt: string;
  mergedAt: string | null;
  url: string;
}

export interface SourceSyncResult {
  ok: boolean;
  processed: number;
  error?: string;
}

export interface SyncGroupResult {
  groupId: string;
  jira?: SourceSyncResult;
  github?: SourceSyncResult;
  overallStatus?: 'SUCCESS' | 'ERROR' | 'PARTIAL';
}

// ============================================================
// DAY 3 — METRICS & DASHBOARD TYPES (JIRA-306)
// ============================================================

export type DataStatus = 'VALID' | 'NO_SYNC' | 'SYNC_ERROR';

export interface DashboardRow {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  jiraProjectKey: string | null;
  repoCount: number;

  // Metric fields (null nếu chưa tính metric)
  taskDone: number | null;
  subtaskDone: number | null;
  commitCount: number | null;
  prCreated: number | null;
  prMerged: number | null;
  blocked: number | null;

  // Trạng thái dữ liệu
  dataStatus: DataStatus;
  syncStatus: 'SUCCESS' | 'ERROR' | 'PARTIAL' | 'NEVER_SYNCED';
  lastSyncAt: string | null;
  metricCalculatedAt: string | null;
  syncError: { source: string; message: string } | null;
}

export interface DashboardSummary {
  total: number;
  valid: number;
  noSync: number;
  syncError: number;
  totalTaskDone: number;
  totalSubtaskDone: number;
  totalCommit: number;
  totalPrCreated: number;
  totalPrMerged: number;
  totalBlocked: number;
}

export interface DashboardResult {
  date: string;
  summary: DashboardSummary;
  items: DashboardRow[];
}

export interface ComputeResult {
  date: string;
  total: number;
  computed: number;
  failed: number;
  errors: { groupId: string; error: string }[];
  durationMs: number;
}

export interface DailyGroupMetric {
  id: string;
  groupId: string;
  date: string;
  taskDone: number;
  subtaskDone: number;
  commitCount: number;
  prCreated: number;
  prMerged: number;
  blocked: number;
  calculatedAt: string;
}

export interface GroupActivity {
  date: string;
  group: {
    id: string;
    code: string;
    name: string;
    syncStatus: string;
    lastSyncAt: string | null;
  };
  metric: {
    taskDone: number;
    subtaskDone: number;
    commitCount: number;
    prCreated: number;
    prMerged: number;
    blocked: number;
    calculatedAt: string;
  } | null;
  jiraDone: Array<{
    issueKey: string;
    issueType: string;
    summary: string;
    fromStatus: string | null;
    toStatus: string;
    completedAt: string;
    url: string;
  }>;
  commits: Array<{
    sha: string;
    shortSha: string;
    message: string;
    author: string | null;
    committedAt: string;
    url: string;
  }>;
  prsCreated: Array<{
    number: number;
    title: string;
    state: string;
    createdAt: string;
    mergedAt: string | null;
    url: string;
  }>;
  prsMerged: Array<{
    number: number;
    title: string;
    mergedAt: string | null;
    url: string;
  }>;
}

// ============================================================
// US-17: Sprint Overview (JIRA-517)
// ============================================================

export interface SprintBreakdown {
  total: number;
  done: number;
  inProgress: number;
  toDo: number;
  blocked: number;
}

export interface SprintOverview {
  groupId: string;
  groupCode: string;
  groupName: string;
  sprint: string | null;
  breakdown: SprintBreakdown;
  completionRate: number;
  lastUpdatedAt: string | null;
}

// ============================================================
// US-18: Alerts (JIRA-509)
// ============================================================

export type AlertType = 'SYNC_ERROR' | 'BLOCKED' | 'STALE_ISSUE' | 'NO_ACTIVITY';

export interface AlertItem {
  groupId: string;
  groupCode: string;
  groupName: string;
  types: AlertType[];
  details: {
    syncError?: { source: string; message: string };
    blockedCount?: number;
    staleCount?: number;
    noActivitySince?: string;
  };
}

export interface AlertsSummary {
  total: number;
  syncError: number;
  blocked: number;
  staleIssue: number;
  noActivity: number;
}

export interface AlertsResult {
  date: string;
  summary: AlertsSummary;
  items: AlertItem[];
}



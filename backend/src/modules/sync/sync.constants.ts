export const SYNC_SOURCE = {
  JIRA: 'JIRA',
  GITHUB: 'GITHUB',
} as const;

export type SyncSourceType = keyof typeof SYNC_SOURCE;

export const SYNC_STATUS = {
  NEVER_SYNCED: 'NEVER_SYNCED',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  PARTIAL: 'PARTIAL',
  STALE: 'STALE',
} as const;

// Jira status groups — có thể chuyển thành bảng mapping sau
export const JIRA_DONE_STATUSES = ['Done', 'Closed', 'Resolved', 'Complete'];
export const JIRA_BLOCKED_STATUSES = ['Blocked', 'Impeded'];
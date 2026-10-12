// backend/src/modules/jira/jira.constants.ts

/**
 * Jira REST API endpoints
 * Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
 */
export const JIRA_API = {
  /** Endpoint cũ — vẫn hoạt động nhưng có thể bị 410 ở một số instance mới */
  SEARCH_OLD: '/rest/api/3/search',

  /** Endpoint mới (Atlassian khuyến nghị từ 2024) — dùng nextPageToken */
  SEARCH_NEW: '/rest/api/3/search/jql',

  /** Lấy thông tin project (dùng cho test connection) */
  PROJECT: '/rest/api/3/project',

  /** Field ID mặc định của Sprint trong Jira Software Cloud */
  SPRINT_FIELD_DEFAULT: 'customfield_10020',
} as const;

/**
 * Jira issue type names được tính là Task trong metric
 */
export const JIRA_TASK_TYPES = ['Task', 'Story'] as const;

/**
 * Jira issue type names được tính là Subtask
 */
export const JIRA_SUBTASK_TYPES = ['Subtask', 'Sub-task', 'Sub-Task'] as const;

/**
 * Sprint state
 */
export const JIRA_SPRINT_STATE = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  FUTURE: 'future',
} as const;

/**
 * Giới hạn an toàn khi phân trang
 */
export const JIRA_PAGINATION = {
  MAX_RESULTS_PER_PAGE: 100,
  HARD_LIMIT_PAGES: 50, // tối đa 5000 issues / project / lần sync
} as const;

/**
 * Timeout cho request (ms)
 */
export const JIRA_TIMEOUT_MS = 30_000;
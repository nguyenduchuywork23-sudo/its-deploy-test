// backend/src/modules/metrics/metrics.constants.ts

/**
 * Jira status name được coi là "Done" — dùng để tính Task/Subtask Done.
 * MVP hardcode; sau này có thể chuyển sang bảng status_mappings theo project.
 */
export const DONE_STATUSES = [
  'Done',
  'Closed',
  'Resolved',
  'Complete',
  'Completed',
] as const;

/**
 * Jira status name được coi là "Blocked".
 */
export const BLOCKED_STATUSES = ['Blocked', 'Impeded'] as const;

/**
 * Issue type names được coi là Task (không phải Subtask).
 */
export const TASK_TYPE_PATTERN = ['task', 'story', 'bug']; // lowercase, dùng contains

/**
 * Issue type names được coi là Subtask.
 */
export const SUBTASK_TYPE_PATTERN = ['subtask', 'sub-task', 'sub task']; // lowercase

/**
 * Số nhóm tối đa chạy compute song song để tránh nghẽn DB.
 */
export const METRICS_COMPUTE_CONCURRENCY = 5;

/**
 * Timeout cho 1 lần compute toàn bộ (ms).
 */
export const METRICS_COMPUTE_TIMEOUT_MS = 5 * 60 * 1000;
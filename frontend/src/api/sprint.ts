// frontend/src/api/sprint.ts
import { api } from './client';

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

/**
 * Lấy Sprint Overview của 1 nhóm.
 * GET /api/sprint/group/:id
 */
export async function getSprintOverview(groupId: string): Promise<SprintOverview> {
  const { data } = await api.get(`/sprint/group/${groupId}`);
  return data;
}

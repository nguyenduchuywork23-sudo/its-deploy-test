import { api } from './client';
import type {
  DashboardResult,
  ComputeResult,
  DailyGroupMetric,
  GroupActivity,
} from '../types';

/**
 * Lấy dashboard tổng hợp của 1 ngày (mặc định hôm nay).
 * GET /api/dashboard?date=YYYY-MM-DD
 */
export async function getDashboard(date?: string): Promise<DashboardResult> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<DashboardResult>('/dashboard', { params });
  return res.data;
}

/**
 * Tính toán metric cho tất cả nhóm (hoặc danh sách nhóm chỉ định).
 * POST /api/metrics/compute?date=YYYY-MM-DD
 */
export async function computeAllMetrics(
  date?: string,
  groupIds?: string[],
): Promise<ComputeResult> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const body = groupIds && groupIds.length > 0 ? { groupIds } : {};
  const res = await api.post<ComputeResult>('/metrics/compute', body, { params });
  return res.data;
}

/**
 * Tính toán metric cho 1 nhóm cụ thể.
 * POST /api/metrics/compute/group/:id?date=YYYY-MM-DD
 */
export async function computeGroupMetric(
  groupId: string,
  date?: string,
): Promise<DailyGroupMetric> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.post<DailyGroupMetric>(
    `/metrics/compute/group/${groupId}`,
    {},
    { params },
  );
  return res.data;
}

/**
 * Lấy thông tin metric đã tính của 1 nhóm.
 * GET /api/metrics/group/:id?date=YYYY-MM-DD
 */
export async function getGroupMetric(
  groupId: string,
  date?: string,
): Promise<DailyGroupMetric | null> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<DailyGroupMetric | null>(
    `/metrics/group/${groupId}`,
    { params },
  );
  return res.data;
}

/**
 * Lấy chi tiết hoạt động các task, commit, PR của 1 nhóm trong ngày.
 * GET /api/dashboard/group/:id?date=YYYY-MM-DD
 */
export async function getGroupActivity(
  groupId: string,
  date?: string,
): Promise<GroupActivity> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<GroupActivity>(`/dashboard/group/${groupId}`, {
    params,
  });
  return res.data;
}

// frontend/src/api/alerts.ts
import { api } from './client';
import type { AlertsResult } from '../types';

/**
 * Lấy danh sách nhóm cần chú ý cho 1 ngày.
 * GET /api/alerts?date=YYYY-MM-DD
 */
export async function getAlerts(date?: string): Promise<AlertsResult> {
  const { data } = await api.get('/alerts', {
    params: date ? { date } : {},
  });
  return data;
}

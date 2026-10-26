import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDashboard, computeAllMetrics, computeGroupMetric } from '../api/dashboard';
import { MetricCard } from '../components/dashboard/MetricCard';
import { DatePicker, getTodayDateString } from '../components/dashboard/DatePicker';
import { DashboardFilter } from '../components/dashboard/DashboardFilter';
import type { DashboardFilterType } from '../components/dashboard/DashboardFilter';
import { DashboardTable } from '../components/dashboard/DashboardTable';
import type { ComputeResult } from '../types';
import { useAuth } from '../context/AuthContext';

export function MentorDashboardPage() {
  const { isIntern, isMentor, isLeadMentor } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activeFilter, setActiveFilter] = useState<DashboardFilterType>('ALL');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
    details?: string;
  } | null>(null);
  const [syncingGroupId, setSyncingGroupId] = useState<string | null>(null);

  // Auto-hide toast sau 5 giây (AC10)
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Query: Lấy dữ liệu dashboard theo ngày
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', selectedDate],
    queryFn: () => getDashboard(selectedDate),
  });

  // Mutation: Tính toán lại toàn bộ metric trong ngày (AC3)
  const computeAllMutation = useMutation({
    mutationFn: () => computeAllMetrics(selectedDate),
    onSuccess: (result: ComputeResult) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', selectedDate] });
      setToast({
        type: 'success',
        message: `Đã tính toán thành công metric cho ${result.computed}/${result.total} nhóm!`,
        details: `Thời gian thực thi: ${result.durationMs}ms${
          result.failed > 0 ? ` • ${result.failed} nhóm thất bại` : ''
        }`,
      });
    },
    onError: (err: any) => {
      setToast({
        type: 'error',
        message: 'Tính toán metric gặp lỗi!',
        details: err?.response?.data?.message || err?.message || 'Lỗi không xác định',
      });
    },
  });

  // Mutation: Tính metric riêng cho 1 nhóm
  const computeGroupMutation = useMutation({
    mutationFn: (groupId: string) => computeGroupMetric(groupId, selectedDate),
    onMutate: (groupId) => setSyncingGroupId(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', selectedDate] });
      setToast({
        type: 'success',
        message: 'Cập nhật metric nhóm thành công!',
      });
    },
    onError: (err: any) => {
      setToast({
        type: 'error',
        message: 'Lỗi khi tính metric nhóm!',
        details: err?.message,
      });
    },
    onSettled: () => setSyncingGroupId(null),
  });

  // Tính số lượng bản ghi cho từng filter (JIRA-309.4)
  const filterCounts = useMemo(() => {
    const items = data?.items || [];
    return {
      ALL: items.length,
      SYNC_ERROR: items.filter((it) => it.dataStatus === 'SYNC_ERROR').length,
      NO_SYNC: items.filter((it) => it.dataStatus === 'NO_SYNC').length,
      NO_ACTIVITY: items.filter(
        (it) =>
          it.dataStatus === 'VALID' &&
          (it.taskDone ?? 0) === 0 &&
          (it.subtaskDone ?? 0) === 0 &&
          (it.commitCount ?? 0) === 0 &&
          (it.prCreated ?? 0) === 0,
      ).length,
      HAS_BLOCKED: items.filter((it) => (it.blocked ?? 0) > 0).length,
    };
  }, [data?.items]);

  // Lọc và tìm kiếm phía client (JIRA-309.3)
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let list = data.items;

    // Filter theo tab
    if (activeFilter === 'SYNC_ERROR') {
      list = list.filter((it) => it.dataStatus === 'SYNC_ERROR');
    } else if (activeFilter === 'NO_SYNC') {
      list = list.filter((it) => it.dataStatus === 'NO_SYNC');
    } else if (activeFilter === 'NO_ACTIVITY') {
      list = list.filter(
        (it) =>
          it.dataStatus === 'VALID' &&
          (it.taskDone ?? 0) === 0 &&
          (it.subtaskDone ?? 0) === 0 &&
          (it.commitCount ?? 0) === 0 &&
          (it.prCreated ?? 0) === 0,
      );
    } else if (activeFilter === 'HAS_BLOCKED') {
      list = list.filter((it) => (it.blocked ?? 0) > 0);
    }

    // Filter theo ô tìm kiếm
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.code.toLowerCase().includes(q) ||
          it.name.toLowerCase().includes(q) ||
          (it.jiraProjectKey && it.jiraProjectKey.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [data?.items, activeFilter, search]);

  const summary = data?.summary || {
    total: 0,
    valid: 0,
    noSync: 0,
    syncError: 0,
    totalTaskDone: 0,
    totalSubtaskDone: 0,
    totalCommit: 0,
    totalPrCreated: 0,
    totalPrMerged: 0,
    totalBlocked: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert Notification (AC4, AC10) */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-start gap-3 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-900/95 text-white border-emerald-700/80 shadow-emerald-950/20'
              : 'bg-rose-900/95 text-white border-rose-700/80 shadow-rose-950/20'
          }`}
        >
          <div className="p-1 rounded-lg bg-white/10 shrink-0">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold leading-tight">{toast.message}</h4>
            {toast.details && (
              <p className="text-[11px] text-white/80 mt-0.5 leading-snug">{toast.details}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header Bar with DatePicker and Compute Button (AC1, AC3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isIntern
                ? 'Tiến độ dự án nhóm hôm nay'
                : isMentor
                ? 'Tiến độ nhóm phụ trách hôm nay'
                : isLeadMentor
                ? 'Báo cáo tiến độ toàn Học viện'
                : 'Bảng điều khiển tiến độ hệ thống'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 font-mono border border-slate-200">
              {isIntern ? 'Nhóm của bạn' : isMentor ? `${summary.total} nhóm phụ trách` : `${summary.total} nhóm`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isIntern
              ? 'Theo dõi các nhiệm vụ Jira đã hoàn thành và hoạt động commits GitHub trong ngày của nhóm bạn'
              : isMentor
              ? 'Theo dõi chỉ số năng suất (Jira Task & Git Commit/PR) của các nhóm bạn trực tiếp hướng dẫn'
              : isLeadMentor
              ? 'Tổng hợp chỉ số năng suất và rủi ro triển khai dự án thực tập trên toàn bộ các lớp học'
              : 'Theo dõi toàn bộ chỉ số năng suất (Jira Task & Git Commit/PR) và trạng thái tích hợp của các nhóm thực tập'}
          </p>
        </div>

        {/* Controls: DatePicker + Nút Tính lại metric */}
        <div className="flex items-center gap-3 flex-wrap">
          <DatePicker
            value={selectedDate}
            onChange={(d) => setSelectedDate(d)}
            disabled={computeAllMutation.isPending}
          />

          {!isIntern && (
            <button
              type="button"
              onClick={() => computeAllMutation.mutate()}
              disabled={computeAllMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition active:scale-95 disabled:opacity-50"
              title="Tính toán và tổng hợp lại metric từ các issue/commits trong ngày"
            >
              <svg
                className={`w-3.5 h-3.5 ${computeAllMutation.isPending ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{computeAllMutation.isPending ? 'Đang tính toán...' : 'Tính lại metric'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 7 Summary Cards Row (AC2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Card 1: Nhóm hợp lệ */}
        <MetricCard
          title="Nhóm hợp lệ"
          value={summary.valid}
          subValue={`/${summary.total}`}
          tone="success"
          onClick={() => setActiveFilter('ALL')}
          isActive={activeFilter === 'ALL'}
          tooltip="Số nhóm đã đồng bộ thành công và có metric hợp lệ"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />

        {/* Card 2: Lỗi Sync */}
        <MetricCard
          title="Sync Lỗi"
          value={summary.syncError}
          subValue="nhóm"
          tone="danger"
          onClick={() => setActiveFilter('SYNC_ERROR')}
          isActive={activeFilter === 'SYNC_ERROR'}
          tooltip="Số nhóm gặp lỗi trong phiên đồng bộ gần nhất"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Card 3: Chưa Sync */}
        <MetricCard
          title="Chưa Sync"
          value={summary.noSync}
          subValue="nhóm"
          tone="default"
          onClick={() => setActiveFilter('NO_SYNC')}
          isActive={activeFilter === 'NO_SYNC'}
          tooltip="Số nhóm chưa từng đồng bộ hoặc chưa cấu hình"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Card 4: Task Done */}
        <MetricCard
          title="Task Done"
          value={summary.totalTaskDone}
          subValue="task"
          tone="info"
          tooltip="Tổng số Jira Tasks đã chuyển sang trạng thái Done trong ngày"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />

        {/* Card 5: Subtask Done */}
        <MetricCard
          title="Subtask Done"
          value={summary.totalSubtaskDone}
          subValue="subtask"
          tone="info"
          tooltip="Tổng số Jira Subtasks đã hoàn thành trong ngày"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Card 6: Commits */}
        <MetricCard
          title="Git Commits"
          value={summary.totalCommit}
          subValue="commit"
          tone="success"
          tooltip="Tổng số commits được sinh viên đẩy lên trong ngày"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          }
        />

        {/* Card 7: PR Merged */}
        <MetricCard
          title="PR Merged"
          value={summary.totalPrMerged}
          subValue="pull request"
          tone="success"
          tooltip="Tổng số Pull Requests đã được merge thành công"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
        />
      </div>

      {/* Search & Filter Bar (AC5, AC6) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Filter Chips (AC6) */}
          <DashboardFilter
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={filterCounts}
          />

          {/* Search Input (AC5) */}
          <div className="relative w-full sm:w-72">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Tìm theo mã nhóm, tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Count Helper Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
          <span>
            Đang hiển thị <strong>{filteredItems.length}</strong> / {summary.total} nhóm thực tập
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hợp lệ ({summary.valid})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Lỗi Sync ({summary.syncError})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Chưa Sync ({summary.noSync})
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Lỗi tải dữ liệu dashboard: {(error as any)?.message || 'Vui lòng thử lại'}</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-800 font-bold hover:bg-rose-100"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Main Dashboard Table (JIRA-308) */}
      <DashboardTable
        items={filteredItems}
        isLoading={isLoading}
        onRefreshGroup={isIntern ? undefined : (id) => computeGroupMutation.mutate(id)}
        syncingGroupId={syncingGroupId}
        selectedDate={selectedDate}
      />

      {/* Footer Status Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 py-2.5 px-4 bg-white border border-slate-200/80 rounded-xl">
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <span className="font-semibold text-slate-600">Trạng thái dữ liệu:</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Hợp lệ (VALID)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Lỗi đồng bộ (SYNC_ERROR)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Chưa cấu hình / Chưa sync (NO_SYNC)</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import type { DashboardRow, DataStatus } from '../../types';
import { DataStatusBadge } from './DataStatusBadge';

export interface DashboardTableProps {
  items: DashboardRow[];
  isLoading?: boolean;
  onRefreshGroup?: (groupId: string) => void;
  syncingGroupId?: string | null;
  selectedDate?: string;
}

const MetricCell: React.FC<{
  value: number | null;
  status: DataStatus;
  highlightAlert?: boolean;
}> = ({ value, status, highlightAlert = false }) => {
  if (status === 'SYNC_ERROR') {
    return (
      <span
        className="text-rose-400 font-mono text-sm font-semibold select-none"
        title="Lỗi trong quá trình đồng bộ dữ liệu"
      >
        —
      </span>
    );
  }
  if (status === 'NO_SYNC') {
    return (
      <span
        className="text-slate-400 font-mono text-sm font-semibold select-none"
        title="Nhóm chưa từng đồng bộ"
      >
        ?
      </span>
    );
  }

  const num = value ?? 0;
  return (
    <span
      className={`font-mono text-xs ${
        highlightAlert && num > 0
          ? 'text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-full font-bold border border-rose-200'
          : num > 0
          ? 'text-slate-900 font-bold'
          : 'text-slate-400 font-medium'
      }`}
    >
      {num}
    </span>
  );
};

export const DashboardTable: React.FC<DashboardTableProps> = ({
  items,
  isLoading = false,
  onRefreshGroup,
  syncingGroupId,
  selectedDate,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs space-y-4">
        <div className="h-6 bg-slate-100 rounded w-1/4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">Không tìm thấy nhóm phù hợp</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Không có nhóm thực tập nào khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại. Hãy thử chọn bộ lọc khác.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 w-24">Mã nhóm</th>
              <th className="py-3 px-4 min-w-[180px]">Tên nhóm</th>
              <th className="py-3 px-3 text-center" title="Số Jira Tasks đã hoàn thành trong ngày">
                Task Done
              </th>
              <th className="py-3 px-3 text-center" title="Số Jira Subtasks đã hoàn thành trong ngày">
                Subtask
              </th>
              <th className="py-3 px-3 text-center" title="Số commits GitHub được đẩy lên trong ngày">
                Commit
              </th>
              <th className="py-3 px-3 text-center" title="Số Pull Requests mở mới trong ngày">
                PR Tạo
              </th>
              <th className="py-3 px-3 text-center" title="Số Pull Requests được merge trong ngày">
                PR Merge
              </th>
              <th className="py-3 px-3 text-center" title="Số task đang ở trạng thái Blocked">
                Blocked
              </th>
              <th className="py-3 px-4 text-center">Dữ liệu</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row) => {
              const isSyncError = row.dataStatus === 'SYNC_ERROR';
              const isNoSync = row.dataStatus === 'NO_SYNC';

              const rowBg = isSyncError
                ? 'bg-rose-50/30 hover:bg-rose-50/60'
                : isNoSync
                ? 'bg-slate-50/40 hover:bg-slate-100/60'
                : 'hover:bg-blue-50/20';

              const isSyncing = syncingGroupId === row.id;

              return (
                <tr key={row.id} className={`transition-colors ${rowBg}`}>
                  {/* Mã nhóm */}
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <Link
                      to={`/groups/${row.id}${selectedDate ? `?date=${selectedDate}` : ''}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {row.code}
                    </Link>
                  </td>

                  {/* Tên nhóm */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 truncate max-w-[220px]" title={row.name}>
                      {row.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{row.memberCount} sinh viên</span>
                      {row.jiraProjectKey && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-500">Jira: {row.jiraProjectKey}</span>
                        </>
                      )}
                      {row.syncError && (
                        <>
                          <span>•</span>
                          <span className="text-rose-600 font-semibold" title={row.syncError.message}>
                            [{row.syncError.source}] {row.syncError.message}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Task Done */}
                  <td className="py-3 px-3 text-center">
                    <MetricCell value={row.taskDone} status={row.dataStatus} />
                  </td>

                  {/* Subtask Done */}
                  <td className="py-3 px-3 text-center">
                    <MetricCell value={row.subtaskDone} status={row.dataStatus} />
                  </td>

                  {/* Commit */}
                  <td className="py-3 px-3 text-center">
                    <MetricCell value={row.commitCount} status={row.dataStatus} />
                  </td>

                  {/* PR Tạo */}
                  <td className="py-3 px-3 text-center">
                    <MetricCell value={row.prCreated} status={row.dataStatus} />
                  </td>

                  {/* PR Merge */}
                  <td className="py-3 px-3 text-center">
                    <MetricCell value={row.prMerged} status={row.dataStatus} />
                  </td>

                  {/* Blocked (Highlight nếu > 0) */}
                  <td className="py-3 px-3 text-center">
                    <MetricCell
                      value={row.blocked}
                      status={row.dataStatus}
                      highlightAlert
                    />
                  </td>

                  {/* Data Status Badge */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <DataStatusBadge status={row.dataStatus} />
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2 justify-end">
                      {onRefreshGroup && (
                        <button
                          type="button"
                          onClick={() => onRefreshGroup(row.id)}
                          disabled={isSyncing}
                          title="Tính lại metric cho nhóm này"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition active:scale-95 disabled:opacity-40"
                        >
                          <svg
                            className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`}
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
                        </button>
                      )}
                      <Link
                        to={`/groups/${row.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 rounded-lg transition"
                      >
                        <span>Chi tiết</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

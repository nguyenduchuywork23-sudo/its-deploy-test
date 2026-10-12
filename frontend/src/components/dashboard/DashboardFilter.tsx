import React from 'react';

export type DashboardFilterType =
  | 'ALL'
  | 'SYNC_ERROR'
  | 'NO_SYNC'
  | 'NO_ACTIVITY'
  | 'HAS_BLOCKED';

export interface DashboardFilterProps {
  activeFilter: DashboardFilterType;
  onFilterChange: (filter: DashboardFilterType) => void;
  counts: Record<DashboardFilterType, number>;
}

const filters: Array<{
  id: DashboardFilterType;
  label: string;
  isAlert?: boolean;
}> = [
  { id: 'ALL', label: 'Tất cả nhóm' },
  { id: 'SYNC_ERROR', label: 'Lỗi Sync', isAlert: true },
  { id: 'NO_SYNC', label: 'Chưa Sync' },
  { id: 'NO_ACTIVITY', label: 'Không có hoạt động' },
  { id: 'HAS_BLOCKED', label: 'Có Task Blocked', isAlert: true },
];

export const DashboardFilter: React.FC<DashboardFilterProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {filters.map((f) => {
        const active = activeFilter === f.id;
        const count = counts[f.id] ?? 0;

        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
              active
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : f.isAlert && count > 0
                ? 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100/70'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                active
                  ? 'bg-blue-700/80 text-white'
                  : f.isAlert && count > 0
                  ? 'bg-rose-200 text-rose-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

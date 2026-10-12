import React from 'react';
import type { DataStatus } from '../../types';

export interface DataStatusBadgeProps {
  status: DataStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  DataStatus,
  {
    label: string;
    container: string;
    dot: string;
    tooltip: string;
  }
> = {
  VALID: {
    label: 'Hợp lệ',
    container: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
    tooltip: 'Đã đồng bộ đầy đủ và có dữ liệu metric hợp lệ cho ngày này',
  },
  SYNC_ERROR: {
    label: 'Lỗi Sync',
    container: 'bg-rose-50 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
    tooltip: 'Đã xảy ra lỗi trong phiên đồng bộ Jira hoặc GitHub',
  },
  NO_SYNC: {
    label: 'Chưa Sync',
    container: 'bg-slate-100 text-slate-600 border-slate-200/80',
    dot: 'bg-slate-400',
    tooltip: 'Nhóm chưa từng kích hoạt đồng bộ hoặc chưa cấu hình dự án',
  },
};

export const DataStatusBadge: React.FC<DataStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const config = statusConfig[status] || statusConfig.NO_SYNC;

  return (
    <span
      title={config.tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide select-none ${config.container} ${className}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
      <span>{config.label}</span>
    </span>
  );
};

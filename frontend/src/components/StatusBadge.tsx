import React from 'react';
import type { ConnectionStatus, SyncStatus } from '../types';

export interface StatusBadgeProps {
  type: 'connection' | 'sync';
  status: ConnectionStatus | SyncStatus;
  className?: string;
  showDot?: boolean;
  customLabel?: string;
}

const connectionConfig: Record<
  ConnectionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  NEVER_TESTED: {
    label: 'Chưa kiểm tra',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  SUCCESS: {
    label: 'Kết nối tốt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  ERROR: {
    label: 'Lỗi kết nối',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

const syncConfig: Record<
  SyncStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  NEVER_SYNCED: {
    label: 'Chưa đồng bộ',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  SUCCESS: {
    label: 'Đồng bộ tốt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  ERROR: {
    label: 'Lỗi đồng bộ',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  PARTIAL: {
    label: 'Một phần',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  STALE: {
    label: 'Dữ liệu cũ',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  status,
  className = '',
  showDot = true,
  customLabel,
}) => {
  const config =
    type === 'connection'
      ? connectionConfig[status as ConnectionStatus] || connectionConfig.NEVER_TESTED
      : syncConfig[status as SyncStatus] || syncConfig.NEVER_SYNCED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badgeClass} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`}
          aria-hidden="true"
        />
      )}
      <span>{customLabel || config.label}</span>
    </span>
  );
};

export const ConnectionBadge: React.FC<{
  status: ConnectionStatus;
  className?: string;
  showDot?: boolean;
  customLabel?: string;
}> = (props) => <StatusBadge type="connection" {...props} />;

export const SyncBadge: React.FC<{
  status: SyncStatus;
  className?: string;
  showDot?: boolean;
  customLabel?: string;
}> = (props) => <StatusBadge type="sync" {...props} />;

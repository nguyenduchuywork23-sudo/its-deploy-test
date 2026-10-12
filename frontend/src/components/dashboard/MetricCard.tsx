import React from 'react';

export type MetricTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface MetricCardProps {
  title: string;
  value: number | string;
  subValue?: string;
  tone?: MetricTone;
  icon?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  tooltip?: string;
}

const toneStyles: Record<
  MetricTone,
  {
    card: string;
    activeCard: string;
    iconWrapper: string;
    valueText: string;
    subText: string;
  }
> = {
  default: {
    card: 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm',
    activeCard: 'bg-white border-slate-700 ring-2 ring-slate-400 shadow-md',
    iconWrapper: 'bg-slate-100 text-slate-600',
    valueText: 'text-slate-900',
    subText: 'text-slate-400',
  },
  success: {
    card: 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 hover:shadow-sm',
    activeCard: 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md',
    iconWrapper: 'bg-emerald-100/80 text-emerald-700',
    valueText: 'text-emerald-700',
    subText: 'text-emerald-600/70',
  },
  warning: {
    card: 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20 hover:shadow-sm',
    activeCard: 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-500/20 shadow-md',
    iconWrapper: 'bg-amber-100/80 text-amber-700',
    valueText: 'text-amber-700',
    subText: 'text-amber-600/70',
  },
  danger: {
    card: 'bg-white border-slate-200/80 hover:border-rose-300 hover:bg-rose-50/20 hover:shadow-sm',
    activeCard: 'bg-rose-50/60 border-rose-500 ring-2 ring-rose-500/20 shadow-md',
    iconWrapper: 'bg-rose-100/80 text-rose-700',
    valueText: 'text-rose-700',
    subText: 'text-rose-600/70',
  },
  info: {
    card: 'bg-white border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/20 hover:shadow-sm',
    activeCard: 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-md',
    iconWrapper: 'bg-blue-100/80 text-blue-700',
    valueText: 'text-blue-700',
    subText: 'text-blue-600/70',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subValue,
  tone = 'default',
  icon,
  onClick,
  isActive = false,
  tooltip,
}) => {
  const styles = toneStyles[tone];
  const isClickable = !!onClick;

  return (
    <div
      role={isClickable ? 'button' : undefined}
      onClick={onClick}
      title={tooltip}
      className={`rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between ${
        isActive ? styles.activeCard : styles.card
      } ${isClickable ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 tracking-tight leading-snug line-clamp-2">
          {title}
        </span>
        {icon && (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${styles.iconWrapper}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-2xl font-black font-mono tracking-tight ${styles.valueText}`}>
          {value}
        </span>
        {subValue && (
          <span className={`text-xs font-medium ${styles.subText}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};

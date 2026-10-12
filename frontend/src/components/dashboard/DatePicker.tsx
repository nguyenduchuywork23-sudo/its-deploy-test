import React from 'react';

export interface DatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (date: string) => void;
  disabled?: boolean;
}

/**
 * Trả về chuỗi ngày hôm nay theo giờ địa phương dạng YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const todayStr = getTodayDateString();
  const isToday = value === todayStr;

  const handleQuickToday = () => {
    if (!disabled && !isToday) {
      onChange(todayStr);
    }
  };

  const handlePrevDay = () => {
    if (disabled) return;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    onChange(prevStr);
  };

  const handleNextDay = () => {
    if (disabled || isToday) return;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    if (nextStr <= todayStr) {
      onChange(nextStr);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl p-1 shadow-xs">
      <button
        type="button"
        onClick={handlePrevDay}
        disabled={disabled}
        title="Ngày trước đó"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="relative flex items-center">
        <input
          type="date"
          value={value}
          max={todayStr}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="button"
        onClick={handleNextDay}
        disabled={disabled || isToday}
        title="Ngày tiếp theo"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="h-4 w-px bg-slate-200 mx-0.5" />

      <button
        type="button"
        onClick={handleQuickToday}
        disabled={disabled || isToday}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
          isToday
            ? 'bg-blue-50 text-blue-700 border border-blue-200/80 cursor-default'
            : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
        }`}
      >
        Hôm nay
      </button>
    </div>
  );
};

// frontend/src/pages/AlertsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAlerts } from '../api/alerts';
import { useAuth } from '../context/AuthContext';
import type { AlertType } from '../types';

function todayVnStr(): string {
  const t = new Date();
  const vn = new Date(t.getTime() - t.getTimezoneOffset() * 60_000);
  return vn.toISOString().slice(0, 10);
}

const ALERT_META: Record<
  AlertType,
  { label: string; badgeClass: string; cardTone: 'danger' | 'warning' | 'default' }
> = {
  SYNC_ERROR: {
    label: 'Sync lỗi',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    cardTone: 'danger',
  },
  BLOCKED: {
    label: 'Blocked',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
    cardTone: 'warning',
  },
  STALE_ISSUE: {
    label: 'Issue cũ (>2 ngày)',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    cardTone: 'warning',
  },
  NO_ACTIVITY: {
    label: 'Không hoạt động',
    badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
    cardTone: 'default',
  },
};

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'danger' | 'warning' | 'info';
}) {
  const tones: Record<string, string> = {
    default: 'bg-white border-slate-200 text-slate-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={`border rounded-xl p-4 shadow-xs transition-all ${tones[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="text-2xl font-black mt-1 tracking-tight">{value}</div>
    </div>
  );
}

export function AlertsPage() {
  const { isIntern, isMentor, isLeadMentor } = useAuth();
  const [date, setDate] = useState<string>(todayVnStr());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['alerts', date],
    queryFn: () => getAlerts(date),
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    enabled: !isIntern,
  });

  if (isIntern) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs space-y-4 my-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Khu vực cảnh báo & xử lý rủi ro</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Mục cảnh báo kỹ thuật và giám sát rủi ro tiến độ được quản lý bởi Giảng viên hướng dẫn (Mentor) và Ban Đào tạo.
          Để xem nhiệm vụ và tiến độ dự án của bạn, vui lòng truy cập không gian làm việc của nhóm.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/groups"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Nhóm thực tập của tôi
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Xem tiến độ dự án
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = isMentor
    ? 'Vấn đề & Cảnh báo nhóm phụ trách'
    : isLeadMentor
    ? 'Giám sát Rủi ro Toàn Học viện'
    : 'Cảnh báo Kỹ thuật & Tích hợp Hệ thống';

  const badgeText = isMentor ? 'Nhóm phụ trách' : isLeadMentor ? 'Toàn học viện' : 'Hệ thống';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
              {badgeText}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {data
              ? `${data.summary.total} nhóm có ít nhất 1 cảnh báo cần xử lý`
              : 'Đang tải dữ liệu...'}
            {isFetching && data && ' • đang cập nhật...'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <label className="text-xs font-semibold text-slate-600 pl-2">Ngày:</label>
          <input
            type="date"
            value={date}
            max={todayVnStr()}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            type="button"
            onClick={() => setDate(todayVnStr())}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <SummaryCard label="Tổng cảnh báo" value={data.summary.total} tone="info" />
          <SummaryCard
            label="Sync lỗi"
            value={data.summary.syncError}
            tone={data.summary.syncError > 0 ? 'danger' : 'default'}
          />
          <SummaryCard
            label="Blocked"
            value={data.summary.blocked}
            tone={data.summary.blocked > 0 ? 'warning' : 'default'}
          />
          <SummaryCard
            label="Issue cũ (>2 ngày)"
            value={data.summary.staleIssue}
            tone={data.summary.staleIssue > 0 ? 'warning' : 'default'}
          />
          <SummaryCard
            label="Không hoạt động"
            value={data.summary.noActivity}
            tone="default"
          />
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
          <p className="text-sm font-medium">Đang tải danh sách cảnh báo...</p>
        </div>
      ) : !data?.items.length ? (
        <div className="text-center py-16 text-slate-600 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-slate-800">Không có cảnh báo phát sinh</div>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Tất cả các nhóm đều đồng bộ dữ liệu ổn định và không ghi nhận vấn đề tắc nghẽn trong ngày đã chọn.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Mã nhóm</th>
                  <th className="px-4 py-3.5">Tên nhóm</th>
                  <th className="px-4 py-3.5">Loại cảnh báo</th>
                  <th className="px-4 py-3.5">Chi tiết</th>
                  <th className="px-4 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((a) => (
                  <tr
                    key={a.groupId}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                      {a.groupCode}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {a.groupName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {a.types.map((t) => (
                          <span
                            key={t}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${ALERT_META[t].badgeClass}`}
                          >
                            {ALERT_META[t].label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {a.details.syncError && (
                        <div className="mb-1 text-red-700 bg-red-50/80 px-2 py-1 rounded border border-red-200/60">
                          <b className="font-semibold">{a.details.syncError.source}:</b> {a.details.syncError.message}
                        </div>
                      )}
                      {a.details.blockedCount != null && (
                        <div className="mb-1 flex items-center gap-1.5 text-orange-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          <span><strong>{a.details.blockedCount}</strong> issue đang Blocked</span>
                        </div>
                      )}
                      {a.details.staleCount != null && (
                        <div className="mb-1 flex items-center gap-1.5 text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span><strong>{a.details.staleCount}</strong> issue không cập nhật &gt; 2 ngày</span>
                        </div>
                      )}
                      {a.types.includes('NO_ACTIVITY') && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Không có hoạt động commit/issue trong ngày</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Link
                        to={`/groups/${a.groupId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50/60 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200/60 transition"
                      >
                        <span>Chi tiết</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 py-2.5 px-4 bg-white border border-slate-200/80 rounded-xl">
        <span className="font-semibold text-slate-600">Loại cảnh báo:</span>
        <span className="text-red-700 font-medium">● Sync lỗi</span>
        <span className="text-orange-700 font-medium">● Blocked</span>
        <span className="text-amber-700 font-medium">● Issue cũ (&gt;2 ngày)</span>
        <span className="text-slate-600 font-medium">● Không hoạt động</span>
      </div>
    </div>
  );
}

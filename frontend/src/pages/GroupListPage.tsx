import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getGroups } from '../api/groups';
import { ConnectionBadge, SyncBadge } from '../components/StatusBadge';
import { ImportModal } from '../components/ImportModal';
import { useAuth } from '../context/AuthContext';

type FilterType = 'all' | 'jira_ok' | 'has_github' | 'sync_ok' | 'has_error';

export function GroupListPage() {
  const { user, isIntern, isMentor } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['groups', { page, limit, search }],
    queryFn: () => getGroups({ page, limit, search: search.trim() || undefined }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;
  const rawGroups = data?.items || [];

  // Lọc theo Quick Filter Chips
  const filteredGroups = useMemo(() => {
    if (activeFilter === 'all') return rawGroups;
    if (activeFilter === 'jira_ok') return rawGroups.filter((g) => !!g.jiraProjectKey);
    if (activeFilter === 'has_github') return rawGroups.filter((g) => g.repositories && g.repositories.length > 0);
    if (activeFilter === 'sync_ok') return rawGroups.filter((g) => g.syncStatus === 'SUCCESS');
    if (activeFilter === 'has_error')
      return rawGroups.filter(
        (g) => g.jiraConnectionStatus === 'ERROR' || g.githubConnectionStatus === 'ERROR' || g.syncStatus === 'ERROR',
      );
    return rawGroups;
  }, [rawGroups, activeFilter]);

  // Thống kê nhanh từ dữ liệu hiện tại
  const kpiStats = useMemo(() => {
    const totalStudents = rawGroups.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const jiraConfigured = rawGroups.filter((g) => !!g.jiraProjectKey).length;
    const githubConfigured = rawGroups.filter((g) => g.repositories && g.repositories.length > 0).length;
    const syncSuccess = rawGroups.filter((g) => g.syncStatus === 'SUCCESS').length;
    const errorCount = rawGroups.filter(
      (g) => g.jiraConnectionStatus === 'ERROR' || g.githubConnectionStatus === 'ERROR' || g.syncStatus === 'ERROR',
    ).length;
    return {
      totalGroups: totalItems,
      totalStudents: totalItems > 0 ? (totalItems * 10) : totalStudents,
      jiraConfigured: totalItems > 0 ? Math.round((jiraConfigured / (rawGroups.length || 1)) * totalItems) : 0,
      githubConfigured: totalItems > 0 ? Math.round((githubConfigured / (rawGroups.length || 1)) * totalItems) : 0,
      syncSuccess: totalItems > 0 ? Math.round((syncSuccess / (rawGroups.length || 1)) * totalItems) : 0,
      errorCount,
    };
  }, [rawGroups, totalItems]);


  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Quản lý nhóm thực tập
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              {totalItems} nhóm
            </span>
            {isIntern && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Thực tập sinh (Chỉ xem)
              </span>
            )}
            {isMentor && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Nhóm bạn phụ trách
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isIntern
              ? 'Danh sách các nhóm bạn tham gia và tiến độ sprint, commits'
              : isMentor
              ? `Hiển thị danh sách nhóm được phân công cho mentor ${user?.fullName || user?.email}`
              : 'Giám sát thời gian thực tiến độ sprint Jira và hoạt động commits/PRs GitHub của từng nhóm'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <svg
              className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`}
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
            <span>Làm mới</span>
          </button>

          {!isIntern && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span>Import Excel / CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Dashboard Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Groups */}
        <div
          role="button"
          onClick={() => setActiveFilter('all')}
          className={`bg-white rounded-xl p-4 border transition-all relative overflow-hidden group cursor-pointer text-left active:scale-[0.99] ${
            activeFilter === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md'
          }`}
          title="Nhấn để xem toàn bộ danh sách nhóm"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-100/60 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng số nhóm</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {kpiStats.totalGroups}
            </span>
            <span className="text-xs text-slate-400 font-medium">nhóm thực tập</span>
          </div>
        </div>

        {/* Card 2: Total Students */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-indigo-100/60 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng sinh viên</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ~{kpiStats.totalStudents.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">thành viên</span>
          </div>
        </div>

        {/* Card 3: Jira Configured */}
        <div
          role="button"
          onClick={() => setActiveFilter('jira_ok')}
          className={`bg-white rounded-xl p-4 border transition-all relative overflow-hidden group cursor-pointer text-left active:scale-[0.99] ${
            activeFilter === 'jira_ok'
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md'
          }`}
          title="Nhấn để lọc các nhóm đã kết nối Jira"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-100/60 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã nối Jira</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zM2.82 10.7c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.82z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-700 tracking-tight">
              {kpiStats.jiraConfigured}
            </span>
            <span className="text-xs text-slate-400 font-medium">nhóm kết nối</span>
          </div>
        </div>

        {/* Card 4: GitHub Configured */}
        <div
          role="button"
          onClick={() => setActiveFilter('has_github')}
          className={`bg-white rounded-xl p-4 border transition-all relative overflow-hidden group cursor-pointer text-left active:scale-[0.99] ${
            activeFilter === 'has_github'
              ? 'border-slate-800 ring-2 ring-slate-800/20 shadow-md'
              : 'border-slate-200/80 shadow-sm hover:border-slate-400 hover:shadow-md'
          }`}
          title="Nhấn để lọc các nhóm đã gắn kho lưu trữ GitHub"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100/60 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-slate-200/60 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã nối GitHub</span>
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {kpiStats.githubConfigured}
            </span>
            <span className="text-xs text-slate-400 font-medium">kho lưu trữ</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm theo mã nhóm (GRP001) hoặc tên nhóm..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="flex items-center gap-2 self-end md:self-auto text-xs text-slate-500">
            <span>Dòng/trang:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Bộ lọc:</span>
          {[
            { id: 'all', label: 'Tất cả', count: kpiStats.totalGroups },
            { id: 'jira_ok', label: 'Đã có Jira', count: kpiStats.jiraConfigured },
            { id: 'has_github', label: 'Có GitHub', count: kpiStats.githubConfigured },
            { id: 'sync_ok', label: 'Sync thành công', count: kpiStats.syncSuccess },
            { id: 'has_error', label: 'Cần chú ý / Lỗi', count: kpiStats.errorCount, isAlert: kpiStats.errorCount > 0 },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveFilter(chip.id as FilterType)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === chip.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : chip.isAlert
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeFilter === chip.id
                    ? 'bg-blue-700 text-white'
                    : chip.isAlert
                    ? 'bg-rose-200 text-rose-900 font-bold'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>


      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/4 animate-pulse"></div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-50/80 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">Không thể tải dữ liệu</h3>
            <p className="text-xs text-slate-500 mt-1">
              {error instanceof Error ? error.message : 'Vui lòng kiểm tra lại kết nối backend.'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Thử lại
            </button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa có nhóm nào khớp bộ lọc</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search
                ? `Không tìm thấy nhóm nào khớp với từ khóa "${search}".`
                : 'Thử chuyển sang bộ lọc "Tất cả" hoặc Import danh sách mới.'}
            </p>
            <div className="mt-4">
              {search ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Xóa từ khóa tìm kiếm
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Hiển thị tất cả nhóm
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/80 text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Mã & Tên nhóm</th>
                  <th className="px-4 py-3.5 text-center">Thành viên</th>
                  <th className="px-5 py-3.5">Dự án Jira</th>
                  <th className="px-5 py-3.5">GitHub Repositories</th>
                  <th className="px-5 py-3.5">Đồng bộ (Sync)</th>
                  <th className="px-5 py-3.5">Lần sync cuối</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredGroups.map((group) => (
                  <tr
                    key={group.id}
                    className="hover:bg-blue-50/30 transition-colors duration-150 group"
                  >
                    {/* Code & Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 flex items-center justify-center font-mono font-bold text-blue-700 text-xs shrink-0 shadow-xs">
                          {group.code.substring(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {group.name}
                          </div>
                          <div className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">
                            {group.code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Member Count */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {group.memberCount} SV
                      </span>
                    </td>

                    {/* Jira */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {group.jiraProjectKey ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {group.jiraProjectKey}
                            </span>
                            <a
                              href={`${group.jiraBaseUrl || 'https://cg-ictu.atlassian.net'}/jira/software/projects/${group.jiraProjectKey}/boards`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600 transition"
                              title="Mở bảng Jira trong tab mới"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Chưa cấu hình</span>
                        )}
                        <ConnectionBadge status={group.jiraConnectionStatus} />
                      </div>
                    </td>

                    {/* GitHub */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {group.repositories?.length || 0} repositories
                        </span>
                        <ConnectionBadge status={group.githubConnectionStatus} />
                      </div>
                    </td>

                    {/* Sync Status */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <SyncBadge status={group.syncStatus} />
                        {group._count && (group._count.jiraIssues || group._count.commits) ? (
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {!!group._count.jiraIssues && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">
                                {group._count.jiraIssues} tasks
                              </span>
                            )}
                            {!!group._count.commits && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                {group._count.commits} commits
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Last Sync */}
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDate(group.lastSyncAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/groups/${group.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-800 rounded-lg transition active:scale-95"
                      >
                        <span>Chi tiết</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && !isError && filteredGroups.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Hiển thị <span className="font-bold text-slate-800">{(page - 1) * limit + 1}</span> -{' '}
              <span className="font-bold text-slate-800">
                {Math.min(page * limit, totalItems)}
              </span>{' '}
              trong tổng số <span className="font-bold text-slate-800">{totalItems}</span> nhóm
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
              >
                Trước
              </button>

              <span className="px-3 py-1.5 font-bold text-slate-800">
                Trang {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}

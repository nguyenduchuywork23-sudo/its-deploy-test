import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';

function getRoleBadge(role?: Role) {
  switch (role) {
    case 'SYSADMIN':
      return {
        label: 'SysAdmin',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    case 'LEAD_MENTOR':
      return {
        label: 'Lead Mentor',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      };
    case 'MENTOR':
      return {
        label: 'Mentor',
        className: 'bg-teal-100 text-teal-800 border-teal-200',
      };
    case 'INTERN':
      return {
        label: 'Thực tập sinh',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    default:
      return {
        label: 'Người dùng',
        className: 'bg-slate-100 text-slate-800 border-slate-200',
      };
  }
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout, isIntern, isMentor, isLeadMentor } = useAuth();

  const nav = isIntern
    ? [
        { to: '/groups', label: 'Nhóm thực tập của tôi' },
        { to: '/dashboard', label: 'Tiến độ dự án' },
      ]
    : isMentor
    ? [
        { to: '/dashboard', label: 'Tiến độ nhóm phụ trách' },
        { to: '/alerts', label: 'Cần chú ý' },
        { to: '/groups', label: 'Nhóm phụ trách' },
      ]
    : isLeadMentor
    ? [
        { to: '/dashboard', label: 'Báo cáo Học viện' },
        { to: '/alerts', label: 'Cần chú ý & Rủi ro' },
        { to: '/groups', label: 'Giám sát Nhóm' },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard Hệ thống' },
        { to: '/alerts', label: 'Cảnh báo Lỗi' },
        { to: '/groups', label: 'Quản lý Nhóm' },
      ];

  const roleBadge = getRoleBadge(user?.role);
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Sticky Glassmorphism Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="CodeGym Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-sm ring-1 ring-slate-200/80 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight group-hover:text-blue-600 transition-colors">
                  CodeGym ITS
                </span>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Theo dõi tiến độ thực tập
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Backend Status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Đang kết nối</span>
            </div>

            {/* User Profile Pill & Logout */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-semibold text-xs flex items-center justify-center ring-1 ring-slate-700 shadow-xs shrink-0">
                  {initials}
                </div>

                <div className="hidden md:flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[150px]">
                      {user.fullName || user.email}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${roleBadge.className}`}
                    >
                      {roleBadge.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                    {user.email}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
                  title="Đăng xuất"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Intern Workspace Top Greeting Banner */}
      {isIntern && (
        <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 border-b border-slate-800 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Không gian thực tập • Theo dõi tiến độ Sprint & hoạt động dự án của nhóm bạn</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CodeGym ITS</span>
            <span>•</span>
            <span>Hệ thống giám sát tiến độ thực tập</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Jira: <span className="text-slate-600 font-mono">cg-ictu.atlassian.net</span></span>
            <span>•</span>
            <span>GitHub: <span className="text-slate-600 font-mono">GrowthZ</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface DemoAccount {
  role: Role;
  label: string;
  badge: string;
  email: string;
  desc: string;
  gradient: string;
  iconBg: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'SYSADMIN',
    label: 'Quản Trị Viên (SysAdmin)',
    badge: 'Toàn quyền',
    email: 'sysadmin@cg.edu.vn',
    desc: 'Quản lý nhóm, phân quyền mentor',
    gradient: 'from-purple-500/10 to-indigo-500/10 border-purple-500/30 hover:border-purple-500/60',
    iconBg: 'from-purple-600 to-indigo-700 text-white',
  },
  {
    role: 'LEAD_MENTOR',
    label: 'Mentor Trưởng (Lead)',
    badge: '100 nhóm',
    email: 'leadmentor@cg.edu.vn',
    desc: 'Theo dõi toàn bộ 100 nhóm thực tập',
    gradient: 'from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/60',
    iconBg: 'from-blue-600 to-cyan-600 text-white',
  },
  {
    role: 'MENTOR',
    label: 'Mentor Phụ Trách',
    badge: 'Phụ trách',
    email: 'mentor@cg.edu.vn',
    desc: 'Xem & cấu hình nhóm trực tiếp',
    gradient: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 hover:border-emerald-500/60',
    iconBg: 'from-emerald-600 to-teal-700 text-white',
  },
  {
    role: 'INTERN',
    label: 'Thực Tập Sinh (Intern)',
    badge: 'Chỉ xem',
    email: 'intern@cg.edu.vn',
    desc: 'Xem tiến độ nhóm tham gia',
    gradient: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/60',
    iconBg: 'from-amber-500 to-orange-600 text-white',
  },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đăng nhập không thành công, vui lòng kiểm tra lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword('Password@123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans select-none">
      {/* Background Ambient Glows & Dot Matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-cyan-600/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Pane: Enterprise Brand Showcase (Hidden on small mobile if needed, or compact) */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between space-y-8 p-4 sm:p-6">
          {/* Header Brand */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Hệ Thống ITS v2.4 • CodeGym Enterprise</span>
            </div>

            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="CodeGym ITS"
                className="w-16 h-16 rounded-2xl object-cover shadow-2xl shadow-blue-500/30 border border-white/20 ring-4 ring-blue-500/20"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  Internship <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">Tracking System</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Cổng Thông Tin Quản Trị & Giám Sát Tiến Độ Thực Tập Sinh
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Nền tảng tích hợp tự động dữ liệu công việc từ <strong className="text-white">Jira Software</strong> và hoạt động mã nguồn <strong className="text-white">GitHub</strong> cho 100 nhóm thực tập tại CodeGym, chuẩn hóa theo múi giờ Việt Nam (UTC+7).
            </p>
          </div>

          {/* Key Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2.5 font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Đồng Bộ Hai Chiều</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Tự động thu thập Issue, Subtask, Commit và PR với cơ chế idempotency bảo vệ dữ liệu.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2.5 font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Mentor Dashboard 3 Trạng Thái</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Phân biệt minh bạch nhóm hợp lệ (VALID), chưa cấu hình (NO_SYNC) và lỗi (SYNC_ERROR).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5 font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Bảo Mật RBAC 4 Cấp Độ</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Phân chia quyền truy cập chặt chẽ giữa SysAdmin, Lead Mentor, Mentor và Intern.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2.5 font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Múi Giờ UTC+7 Chuẩn Hóa</h3>
              <p className="text-[11px] text-slate-400 leading-normal">
                Xử lý chính xác ranh giới ngày từ 00:00:00 đến 23:59:59 không sai lệch múi giờ quốc tế.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-6 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <span className="block text-base sm:text-lg font-black text-white">100+</span>
              <span className="text-slate-400 text-[11px]">Nhóm thực tập</span>
            </div>
            <div className="w-px h-7 bg-slate-800" />
            <div>
              <span className="block text-base sm:text-lg font-black text-white">4 Vai trò</span>
              <span className="text-slate-400 text-[11px]">RBAC chặt chẽ</span>
            </div>
            <div className="w-px h-7 bg-slate-800" />
            <div>
              <span className="block text-base sm:text-lg font-black text-white">15m / 7d</span>
              <span className="text-slate-400 text-[11px]">Token xoay vòng</span>
            </div>
          </div>
        </div>

        {/* Right Pane: Modern Auth Form Card */}
        <div className="lg:col-span-6 xl:col-span-5">
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden ring-1 ring-white/10">
            {/* Top Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                className="py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Đăng nhập</span>
              </button>
              <Link
                to="/register"
                className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Đăng ký mới</span>
              </Link>
            </div>

            <div className="mb-5">
              <h2 className="text-lg font-bold text-white">Đăng nhập tài khoản</h2>
              <p className="text-xs text-slate-400 mt-1">
                Sử dụng email CodeGym hoặc tài khoản demo được phân quyền
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">{errorMsg}</div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email tài khoản
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten.nguoidung@codegym.vn"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Mật khẩu bảo mật
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Đang xác thực hệ thống...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập vào hệ thống</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Role Picker Section */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Chọn nhanh vai trò thử nghiệm:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                  4 Cấp RBAC
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = email === acc.email;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleSelectDemo(acc)}
                      className={`p-2.5 rounded-xl border text-left transition relative flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500 shadow-sm'
                          : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${acc.iconBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                        {acc.role[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-[11px] font-bold text-slate-200 truncate">{acc.label.split(' ')[0]} {acc.label.split(' ')[1]}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{acc.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Assurance */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Bảo vệ với JWT Token Rotation (15m Access / 7d Refresh)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

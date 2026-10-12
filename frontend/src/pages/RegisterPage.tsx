import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'INTERN' | 'MENTOR'>('INTERN');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Tiêu chuẩn validate Email: Phải có đuôi @codegym.vn
  const isEmailValid = useMemo(() => {
    const clean = email.trim().toLowerCase();
    return /^[a-zA-Z0-9._%+-]+@codegym\.vn$/i.test(clean);
  }, [email]);

  // Gợi ý tự động thêm đuôi @codegym.vn
  const handleAutoAppendDomain = () => {
    const clean = email.trim().split('@')[0];
    if (clean) {
      setEmail(`${clean}@codegym.vn`);
    }
  };

  // Tiêu chuẩn validate Mật khẩu bảo mật chuẩn:
  // 1. Tối thiểu 8 ký tự
  // 2. Có chữ hoa
  // 3. Có chữ thường
  // 4. Có số
  // 5. Có ký tự đặc biệt
  const passwordRules = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };
  }, [password]);

  const satisfiedCount = useMemo(() => {
    let count = 0;
    if (passwordRules.minLength) count++;
    if (passwordRules.hasUpper) count++;
    if (passwordRules.hasLower) count++;
    if (passwordRules.hasNumber) count++;
    if (passwordRules.hasSpecial) count++;
    return count;
  }, [passwordRules]);

  const strengthMeta = useMemo(() => {
    if (password.length === 0) return { label: 'Chưa nhập', color: 'bg-slate-700', text: 'text-slate-500' };
    if (satisfiedCount <= 2) return { label: 'Rất yếu', color: 'bg-rose-500', text: 'text-rose-400' };
    if (satisfiedCount === 3) return { label: 'Trung bình', color: 'bg-amber-500', text: 'text-amber-400' };
    if (satisfiedCount === 4) return { label: 'Khá mạnh', color: 'bg-blue-500', text: 'text-blue-400' };
    return { label: 'Rất mạnh (Chuẩn)', color: 'bg-emerald-500', text: 'text-emerald-400' };
  }, [satisfiedCount, password.length]);

  const isPasswordValid = satisfiedCount === 5;

  const isConfirmPasswordMatch = useMemo(() => {
    return password.length > 0 && password === confirmPassword;
  }, [password, confirmPassword]);

  const isFormValid =
    fullName.trim().length >= 2 &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmPasswordMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn');
      return;
    }

    if (!isEmailValid) {
      setErrorMsg('Email tài khoản bắt buộc phải có đuôi tên miền @codegym.vn');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg(
        'Mật khẩu chưa đáp ứng đủ 5 tiêu chuẩn bảo mật (8+ ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt)',
      );
      return;
    }

    if (!isConfirmPasswordMatch) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        password,
        role,
      });
      navigate('/dashboard');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Đăng ký tài khoản không thành công, vui lòng thử lại';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans select-none">
      {/* Background Ambient Glows & Dot Matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-150px] left-[-150px] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Pane: Enterprise Benefits & System Info */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between space-y-8 p-4 sm:p-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Đăng Ký Tài Khoản Hệ Thống • CodeGym ITS</span>
            </div>

            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="CodeGym ITS"
                className="w-16 h-16 rounded-2xl object-cover shadow-2xl shadow-blue-500/30 border border-white/20 ring-4 ring-blue-500/20"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  Tạo Tài Khoản <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">CodeGym ITS</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Tham gia theo dõi tiến độ thực tập hoặc quản lý nhóm dự án
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Tài khoản CodeGym cho phép bạn tra cứu dữ liệu Jira, commit GitHub, pull request hàng ngày và trạng thái công việc với độ trễ tối thiểu theo chuẩn múi giờ Việt Nam (UTC+7).
            </p>
          </div>

          {/* Role Capabilities Comparison */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Phân quyền theo vai trò đăng ký:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    I
                  </div>
                  <span className="text-xs font-bold text-white">Thực Tập Sinh (Intern)</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1">
                  <li>• Xem Dashboard nhóm mình tham gia</li>
                  <li>• Kiểm tra Task/Subtask hoàn thành</li>
                  <li>• Theo dõi commit và PR đã đóng góp</li>
                  <li>• Giao diện Read-only an toàn số liệu</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    M
                  </div>
                  <span className="text-xs font-bold text-white">Mentor Hướng Dẫn</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1">
                  <li>• Giám sát nhóm được phân công trực tiếp</li>
                  <li>• Kích hoạt đồng bộ Jira & GitHub</li>
                  <li>• Chạy tính toán lại metric tức thời</li>
                  <li>• Nhận diện nhóm rủi ro (Blocked / Lỗi)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Policy & Security Checklist */}
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Quy định định danh tài khoản CodeGym</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Chỉ các tài khoản có đuôi tên miền hợp lệ <strong className="text-white font-semibold">@codegym.vn</strong> mới được cấp quyền truy cập hệ thống. Mật khẩu được mã hóa an toàn bằng thuật toán băm Bcrypt 10 rounds.
            </p>
          </div>
        </div>

        {/* Right Pane: Registration Form Card */}
        <div className="lg:col-span-6 xl:col-span-5">
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden ring-1 ring-white/10">
            {/* Top Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
              <Link
                to="/login"
                className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Đăng nhập</span>
              </Link>
              <button
                type="button"
                className="py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Đăng ký mới</span>
              </button>
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">Đăng ký tài khoản mới</h2>
              <p className="text-xs text-slate-400 mt-1">
                Yêu cầu bắt buộc địa chỉ email có đuôi @codegym.vn
              </p>
            </div>

            {/* Error Callout */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Họ và tên <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn Thực Tập"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Email with @codegym.vn Validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Email CodeGym <span className="text-rose-400">*</span>
                  </label>
                  {email.length > 0 && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                        isEmailValid
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isEmailValid ? '✓ Đuôi @codegym.vn hợp lệ' : '✕ Bắt buộc @codegym.vn'}
                    </span>
                  )}
                </div>
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
                    className={`w-full pl-10 pr-24 py-2 bg-slate-950/70 border rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 outline-none transition ${
                      email.length > 0 && !isEmailValid
                        ? 'border-rose-500 focus:ring-rose-500/40'
                        : 'border-slate-700/80 focus:ring-blue-500/40 focus:border-blue-500'
                    }`}
                  />
                  {/* Domain hint badge */}
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-mono font-semibold">
                      @codegym.vn
                    </span>
                  </div>
                </div>

                {/* Quick Auto-Append Chip */}
                {email.length > 0 && !email.includes('@') && (
                  <button
                    type="button"
                    onClick={handleAutoAppendDomain}
                    className="mt-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
                  >
                    <span>👉 Nhấp để tự động thêm: <strong>{email.trim()}@codegym.vn</strong></span>
                  </button>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chọn vai trò của bạn <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('INTERN')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      role === 'INTERN'
                        ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500 shadow-sm'
                        : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      I
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">Thực Tập Sinh</div>
                      <div className="text-[10px] text-slate-400 truncate">Quyền xem nhóm</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('MENTOR')}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      role === 'MENTOR'
                        ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500 shadow-sm'
                        : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      M
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">Mentor</div>
                      <div className="text-[10px] text-slate-400 truncate">Quản lý nhóm</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Mật khẩu bảo mật <span className="text-rose-400">*</span>
                  </label>
                  {password.length > 0 && (
                    <span className={`text-[10px] font-bold ${strengthMeta.text}`}>
                      {strengthMeta.label} ({satisfiedCount}/5)
                    </span>
                  )}
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
                    placeholder="Mật khẩu chuẩn bảo mật"
                    className="w-full pl-10 pr-10 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
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

                {/* Password Strength Progress Bar */}
                <div className="grid grid-cols-5 gap-1 mt-1.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-1 rounded-full transition-all ${
                        satisfiedCount >= lvl ? strengthMeta.color : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>

                {/* 5-Rule Checklist */}
                <div className="grid grid-cols-2 gap-1.5 mt-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[10px]">
                  <div className={`flex items-center gap-1.5 ${passwordRules.minLength ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span>{passwordRules.minLength ? '✓' : '○'}</span>
                    <span>Tối thiểu 8 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRules.hasUpper ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span>{passwordRules.hasUpper ? '✓' : '○'}</span>
                    <span>Ít nhất 1 chữ hoa (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRules.hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span>{passwordRules.hasLower ? '✓' : '○'}</span>
                    <span>Ít nhất 1 chữ thường (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRules.hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span>{passwordRules.hasNumber ? '✓' : '○'}</span>
                    <span>Ít nhất 1 chữ số (0-9)</span>
                  </div>
                  <div className={`col-span-2 flex items-center gap-1.5 ${passwordRules.hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    <span>{passwordRules.hasSpecial ? '✓' : '○'}</span>
                    <span>Ký tự đặc biệt (!@#$%^&*...)</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Xác nhận mật khẩu <span className="text-rose-400">*</span>
                  </label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`text-[10px] font-semibold ${
                        isConfirmPasswordMatch ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isConfirmPasswordMatch ? '✓ Khớp mật khẩu' : '✕ Chưa khớp'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu để xác nhận"
                    className="w-full pl-10 pr-10 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showConfirmPassword ? (
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Đang khởi tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Hoàn tất đăng ký & Vào hệ thống</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-400">
                Đã có tài khoản CodeGym?{' '}
                <Link to="/login" className="font-bold text-blue-400 hover:text-blue-300 hover:underline">
                  Đăng nhập tại đây
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  const isEmailValid = useMemo(() => {
    const clean = email.trim().toLowerCase();
    return /^[a-zA-Z0-9._%+-]+@codegym\.vn$/i.test(clean);
  }, [email]);

  const passwordRules = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const isConfirmMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = fullName.trim().length >= 2 && isEmailValid && isPasswordValid && isConfirmMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên.');
      return;
    }

    if (!isEmailValid) {
      setErrorMsg('Email đăng ký bắt buộc phải thuộc tên miền @codegym.vn');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
      return;
    }

    if (!isConfirmMatch) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
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
        'Đăng ký không thành công, vui lòng thử lại.';
      setErrorMsg(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Minimalist Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="CodeGym"
              className="w-12 h-12 rounded-xl object-cover mx-auto mb-3 border border-white/10 shadow-md"
            />
            <h1 className="text-lg font-bold text-white tracking-tight">CodeGym ITS</h1>
            <p className="text-xs text-slate-400 mt-0.5">Tạo tài khoản người dùng</p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Họ và tên</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email (@codegym.vn)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@codegym.vn"
                className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Vai trò</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('INTERN')}
                  className={`py-2 px-3 rounded-xl border text-center transition ${
                    role === 'INTERN'
                      ? 'border-blue-500 bg-blue-500/15 text-white font-medium'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                  } text-xs`}
                >
                  Thực tập sinh
                </button>
                <button
                  type="button"
                  onClick={() => setRole('MENTOR')}
                  className={`py-2 px-3 rounded-xl border text-center transition ${
                    role === 'MENTOR'
                      ? 'border-emerald-500 bg-emerald-500/15 text-white font-medium'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                  } text-xs`}
                >
                  Mentor
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full pl-3.5 pr-10 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
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

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full pl-3.5 pr-10 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
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

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? 'Đang khởi tạo...' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-500">Đã có tài khoản? </span>
            <Link to="/login" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

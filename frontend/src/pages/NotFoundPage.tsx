import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 max-w-md w-full text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center mx-auto mb-4 font-mono font-bold text-lg">
          404
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-1">
          Không tìm thấy trang yêu cầu
        </h1>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Đường dẫn bạn truy cập có thể đã thay đổi hoặc không tồn tại trong hệ thống.
        </p>
        <div className="flex items-center justify-center gap-2.5">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            Về Dashboard
          </Link>
          <Link
            to="/groups"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            Quản lý nhóm
          </Link>
        </div>
      </div>
    </div>
  );
}

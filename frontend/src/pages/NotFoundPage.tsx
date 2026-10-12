import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">404</h1>
      <p className="text-slate-500 mb-4">Trang không tồn tại</p>
      <Link to="/groups" className="text-blue-600 hover:underline">
        Về danh sách nhóm
      </Link>
    </div>
  );
}

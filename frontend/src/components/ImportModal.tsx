import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { importGroups } from '../api/groups';
import type { ImportResult } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [copiedError, setCopiedError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (uploadFile: File) => importGroups(uploadFile),
    onSuccess: (data) => {
      setResult(data);
      if (data.success > 0) {
        onSuccess();
      }
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setCopiedError(false);
    importMutation.reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    importMutation.mutate(file);
  };

  const handleCopyErrors = () => {
    if (!result?.errors || result.errors.length === 0) return;
    const text = result.errors
      .map((err) => `Dòng ${err.row}: [${err.code}] ${err.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Import danh sách nhóm thực tập
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập nhanh danh sách nhóm, dự án Jira và repository từ tệp bảng tính
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 rounded-lg p-2 hover:bg-slate-100 transition"
            title="Đóng modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Template download prompt */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Chưa có tệp dữ liệu chuẩn? Tải mẫu Excel để nhập liệu chính xác.</span>
                </div>
                <a
                  href="/import-template.xlsx"
                  download="mau-import-nhom-thuc-tap.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition shrink-0 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Tải file mẫu Excel</span>
                </a>
              </div>

              {/* Drop area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3.5 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/60 ring-4 ring-blue-500/10'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/40 ring-4 ring-emerald-500/10'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60 hover:shadow-xs'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition shadow-xs ${
                    file
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white group-hover:scale-105'
                  }`}
                >
                  {file ? (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>

                {file ? (
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
                      <span>{file.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {formatFileSize(file.size)}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Tệp đã sẵn sàng. Nhấn vào đây nếu muốn chọn tệp khác.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Kéo và thả tệp vào đây, hoặc{' '}
                      <span className="text-blue-600 hover:text-blue-700 underline font-bold">
                        duyệt tìm tệp
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Hỗ trợ định dạng Excel (.xlsx, .xls) hoặc CSV (.csv) lên đến 10MB
                    </p>
                  </div>
                )}

                {/* Expected columns pill badges */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <span className="text-slate-400 font-medium mr-1">Các cột hợp lệ:</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono">Mã nhóm *</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono">Tên nhóm *</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono">Số lượng SV</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono">Dự án Jira</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono">Repositories</span>
                </div>
              </div>

              {/* Error notice */}
              {importMutation.isError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-semibold block mb-0.5">Không thể xử lý tệp:</span>
                    <span>
                      {importMutation.error instanceof Error
                        ? importMutation.error.message
                        : 'Đã xảy ra lỗi không xác định khi upload và đọc tệp dữ liệu.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!file || importMutation.isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm hover:shadow transition active:scale-95 flex items-center gap-2"
                >
                  {importMutation.isPending && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  <span>{importMutation.isPending ? 'Đang đọc và import dữ liệu...' : 'Bắt đầu Import dữ liệu'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Result Screen */
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng số dòng</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{result.total}</p>
                </div>
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-center shadow-xs">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Thành công</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{result.success}</p>
                </div>
                <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-center shadow-xs">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Thất bại</span>
                  <p className="text-2xl font-black text-rose-700 mt-1">{result.failed}</p>
                </div>
              </div>

              {/* Status Message */}
              {result.failed === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Tuyệt vời! Toàn bộ dữ liệu đã được import hợp lệ</h4>
                    <p className="text-emerald-700 mt-0.5">
                      Đã lưu thành công {result.success} nhóm thực tập vào hệ thống.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Phát hiện {result.failed} dòng dữ liệu không hợp lệ</h4>
                    <p className="text-amber-700 mt-0.5">
                      Các dòng lỗi đã bị bỏ qua, các dòng hợp lệ ({result.success} nhóm) vẫn được lưu thành công.
                    </p>
                  </div>
                </div>
              )}

              {/* Errors Breakdown */}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      Chi tiết lỗi ({result.errors.length} dòng):
                    </h4>
                    <button
                      type="button"
                      onClick={handleCopyErrors}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 transition"
                    >
                      {copiedError ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-emerald-700">Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Sao chép danh sách lỗi</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-rose-200/80 rounded-xl shadow-xs">
                    <table className="min-w-full divide-y divide-rose-200 text-xs text-left">
                      <thead className="bg-rose-50 text-rose-900 sticky top-0 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-3.5 py-2.5 w-16">Dòng</th>
                          <th className="px-3.5 py-2.5 w-36">Mã lỗi</th>
                          <th className="px-3.5 py-2.5">Mô tả nguyên nhân</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white">
                        {result.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/50 transition">
                            <td className="px-3.5 py-2 font-mono font-bold text-slate-800">{err.row}</td>
                            <td className="px-3.5 py-2 font-mono text-rose-700 font-semibold">{err.code}</td>
                            <td className="px-3.5 py-2 text-slate-600">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    importMutation.reset();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Import tệp khác
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition active:scale-95"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

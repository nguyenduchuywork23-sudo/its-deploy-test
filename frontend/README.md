# Internship Tracking System (ITS) — Frontend

Giao diện quản lý và theo dõi tiến độ các nhóm thực tập tích hợp Jira Cloud và GitHub.

---

## 🛠 Công nghệ sử dụng

* **Core:** React 19, TypeScript
* **Build Tool:** Vite
* **Styling:** TailwindCSS
* **Routing:** React Router v7
* **Data Fetching & State:** TanStack React Query v5
* **HTTP Client:** Axios

---

## 🚀 Cài đặt & Chạy ứng dụng

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình biến môi trường (`.env`)
Tạo file `.env` (hoặc sao chép từ `.env.example`):
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Khởi chạy môi trường phát triển (Dev server)
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: `http://localhost:5173`

### 4. Build production
```bash
npm run build
```

---

## 📁 Cấu trúc thư mục

```text
src/
├── api/             # Cấu hình Axios client và API functions (groups, import, test)
│   ├── client.ts    # Axios instance với baseURL từ VITE_API_URL
│   └── groups.ts    # API calls: getGroups, getGroup, importGroups, testJira, testGithub
├── components/      # UI Components tái sử dụng
│   ├── layout/      # AppLayout, Header, Navigation, Footer
│   ├── StatusBadge.tsx # Component hiển thị trạng thái ConnectionStatus & SyncStatus
│   └── ImportModal.tsx # Modal kéo thả file Excel/CSV & hiển thị bảng kết quả
├── pages/           # Các trang chính của ứng dụng
│   ├── GroupListPage.tsx   # Danh sách nhóm, tìm kiếm, phân trang & nút Import
│   ├── GroupDetailPage.tsx # Trang chi tiết, form cấu hình Jira/GitHub & nút Test kết nối
│   └── NotFoundPage.tsx    # Trang 404
├── types/           # Định nghĩa TypeScript interface & enum types
│   └── index.ts
├── App.tsx          # Router cấu hình định tuyến và React Query Provider
├── main.tsx         # Entry point React
└── index.css        # Tailwind directive styles
```

---

## 📋 Tính năng chính

1. **Danh sách nhóm (`/groups`)**:
   - Hiển thị bảng nhóm dự án, số lượng thành viên.
   - Hiển thị trạng thái kết nối Jira, GitHub và trạng thái đồng bộ dữ liệu (`StatusBadge`).
   - Tìm kiếm nhanh theo mã nhóm hoặc tên nhóm.
   - Phân trang linh hoạt (10, 20, 50 dòng/trang).
2. **Import danh sách nhóm (`/groups/import`)**:
   - Modal kéo thả file Excel (`.xlsx`, `.xls`) hoặc `.csv`.
   - Báo cáo tổng số bản ghi, số bản ghi thành công và thất bại kèm bảng chi tiết từng dòng lỗi.
   - Tự động cập nhật danh sách ngay sau khi import thành công.
3. **Cấu hình & Kiểm thử nhóm (`/groups/:id`)**:
   - Cập nhật Jira Base URL và Jira Project Key.
   - Nút kiểm tra kết nối Jira trực tiếp (`POST /groups/:id/jira/test`).
   - Thêm/xóa danh sách GitHub repositories.
   - Nút kiểm tra kết nối GitHub trực tiếp (`POST /groups/:id/github/test`).
   - Lưu cấu hình cập nhật vào cơ sở dữ liệu (`PATCH /groups/:id`).

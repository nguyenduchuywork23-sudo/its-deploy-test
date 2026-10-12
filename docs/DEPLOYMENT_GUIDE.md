# Hướng Dẫn Deploy Hệ Thống Lên Render & Vercel
**Dự án:** Internship Tracking System (ITS)

Tài liệu này hướng dẫn chi tiết từng bước deploy toàn bộ hệ thống lên môi trường đám mây:
- **Backend (NestJS + PostgreSQL):** Triển khai lên **Render.com** (hỗ trợ Blueprint 1-click tự động khởi tạo Database & Backend).
- **Frontend (React + Vite + TailwindCSS):** Triển khai lên **Vercel.com**.

---

## 1. Kiến Trúc Triển Khai (Architecture)

```text
┌─────────────────────────┐          API Requests (REST)          ┌───────────────────────────────┐
│     Vercel (Frontend)   │ ────────────────────────────────────► │      Render (Backend)         │
│  React + Vite SPA       │                                       │   NestJS Web Service (Node)   │
│  *.vercel.app           │ ◄──────────────────────────────────── │   Port 10000 /api             │
└─────────────────────────┘          CORS Configured              └───────────────┬───────────────┘
                                                                                  │ Prisma ORM
                                                                                  ▼
                                                                  ┌───────────────────────────────┐
                                                                  │     Render PostgreSQL DB      │
                                                                  │   internship-tracking-db      │
                                                                  └───────────────────────────────┘
```

---

## 2. Chuẩn Bị & Push Code Lên GitHub

Đảm bảo tất cả các file cấu hình đã được commit và push lên nhánh GitHub của bạn (ví dụ nhánh `huydev` hoặc `main`):

```bash
git add .
git commit -m "chore(deploy): add vercel.json, render.yaml blueprint and health check endpoint"
git push origin <tên-nhánh-của-bạn>
```

---

## 3. Triển Khai Backend & Database Lên Render

### Cách 1: Sử dụng Render Blueprint (Khuyên dùng - 1-Click tự động)
Hệ thống đã được cấu hình sẵn file [render.yaml](file:///c:/Users/Nguye/Downloads/for_cg/Internship-Tracking-System/render.yaml) ở thư mục gốc.

1. Truy cập [dashboard.render.com](https://dashboard.render.com) và đăng nhập (bằng GitHub).
2. Nhấn nút **New +** ở góc trên cùng bên phải -> chọn **Blueprint**.
3. Chọn Repository `GrowthZ/Internship-Tracking-System` (hoặc repo fork của bạn).
4. Chọn Branch (ví dụ `huydev` hoặc `main`).
5. Render sẽ tự động đọc file `render.yaml` và phát hiện:
   - **PostgreSQL Database:** `internship-tracking-db` (Free tier, Singapore region).
   - **Web Service:** `internship-tracking-backend` (Node.js runtime, build script migrate & generate tự động).
6. Nhấn **Apply**.
7. Chờ 2 - 4 phút để Render tạo cơ sở dữ liệu và build ứng dụng.
8. Sau khi deploy thành công, bạn sẽ nhận được URL Backend, ví dụ:
   `https://internship-tracking-backend.onrender.com`

---

### Cách 2: Tạo Thủ Công Trên Render Dashboard (Nếu không dùng Blueprint)

#### Bước A: Tạo PostgreSQL Database
1. Nhấn **New +** -> **PostgreSQL**.
2. **Name:** `internship-tracking-db`
3. **Database:** `mentor_tracker`
4. **User:** `tracker_user`
5. **Region:** `Singapore` (tốc độ cao nhất từ Việt Nam).
6. **Plan:** `Free`.
7. Nhấn **Create Database**.
8. Sau khi tạo xong, cuộn xuống mục **Connections**, sao chép giá trị **Internal Database URL** (dạng `postgresql://...`).

#### Bước B: Tạo Web Service cho Backend
1. Nhấn **New +** -> **Web Service**.
2. Chọn Repository của dự án.
3. Thiết lập các thông số:
   - **Name:** `internship-tracking-backend`
   - **Region:** `Singapore`
   - **Branch:** nhánh chứa code của bạn (`huydev` hoặc `main`)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npx prisma generate && npx prisma migrate deploy && npm run build
     ```
   - **Start Command:**
     ```bash
     npm run start:prod
     ```
   - **Health Check Path:** `/api/health`
4. Thêm các biến môi trường (**Environment Variables**):
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: Dán Internal Database URL vừa copy ở Bước A.
   - `JWT_SECRET`: Nhập một chuỗi bảo mật ngẫu nhiên (hoặc click nút Generate).
   - `JWT_EXPIRES_IN`: `7d`
   - `CORS_ORIGIN`: `*` (hoặc URL Vercel của bạn sau khi deploy frontend).
   - *(Tùy chọn nếu cần đồng bộ Jira/GitHub)*: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `GITHUB_TOKEN`.
5. Nhấn **Create Web Service**.

---

## 4. Khởi Tạo Dữ Liệu Ban Đầu (Seed Demo Accounts)

Sau khi Backend trên Render đã Active:
1. Bạn có thể test đường dẫn:
   `https://<tên-backend>.onrender.com/api/health`
   Kết quả trả về: `{"status":"ok","uptime":...,"timestamp":"..."}`
2. Gọi endpoint Seed tài khoản mẫu:
   Chạy lệnh sau trên terminal (hoặc Postman / trình duyệt):
   ```bash
   curl -X POST https://<tên-backend>.onrender.com/api/auth/seed
   ```
   Hoặc trên PowerShell:
   ```powershell
   Invoke-RestMethod -Method Post -Uri "https://<tên-backend>.onrender.com/api/auth/seed"
   ```
3. Hệ thống sẽ tạo sẵn 4 tài khoản mặc định:
   | Email | Mật khẩu mặc định | Vai trò (Role) | Họ và Tên |
   | :--- | :--- | :--- | :--- |
   | `sysadmin@cg.edu.vn` | `Password@123` | **SYSADMIN** | Quản Trị Viên Hệ Thống |
   | `leadmentor@cg.edu.vn` | `Password@123` | **LEAD_MENTOR** | Nguyễn Văn Mentor Trưởng |
   | `mentor@cg.edu.vn` | `Password@123` | **MENTOR** | Trần Thị Mentor Phụ Trách |
   | `intern@cg.edu.vn` | `Password@123` | **INTERN** | Lê Văn Thực Tập Sinh |

---

## 5. Triển Khai Frontend Lên Vercel

Dự án đã có sẵn file [frontend/vercel.json](file:///c:/Users/Nguye/Downloads/for_cg/Internship-Tracking-System/frontend/vercel.json) để xử lý định tuyến Single Page Application (tránh lỗi 404 khi F5 trang).

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
2. Nhấn nút **Add New...** -> chọn **Project**.
3. Tìm và nhấn **Import** cạnh repository `GrowthZ/Internship-Tracking-System`.
4. Cấu hình dự án (**Project Configuration**):
   - **Framework Preset:** `Vite` (Vercel thường tự nhận diện).
   - **Root Directory:** Nhấn **Edit** và chọn thư mục `frontend` (⚠️ **Bắt buộc** vì frontend nằm trong subfolder).
   - **Build and Output Settings:** Giữ mặc định:
     - *Build Command:* `npm run build`
     - *Output Directory:* `dist`
     - *Install Command:* `npm install`
5. Thiết lập biến môi trường (**Environment Variables**):
   - Thêm biến sau:
     - **Key:** `VITE_API_URL`
     - **Value:** `https://<tên-backend-trên-render>.onrender.com/api`
     *(Lưu ý: Có đuôi `/api` ở cuối)*.
6. Nhấn **Deploy**.
7. Chờ khoảng 1 - 2 phút, Vercel sẽ cấp cho bạn một domain, ví dụ:
   `https://internship-tracking-system.vercel.app`

---

## 6. Kiểm Tra Hoạt Động (Post-Deployment Verification)

1. Mở URL frontend trên Vercel: `https://internship-tracking-system.vercel.app`.
2. Đăng nhập bằng tài khoản:
   - Email: `mentor@cg.edu.vn`
   - Mật khẩu: `Password@123`
3. Kiểm tra các chức năng:
   - Xem tổng quan Mentor Dashboard (KPIs, Active Groups, Cảnh báo).
   - Xem danh sách nhóm thực tập (`/groups`).
   - Vào chi tiết nhóm (`/groups/:id`).
   - Thử F5 (Reload) trang ở bất kỳ màn hình nào để xác nhận cấu hình `vercel.json` SPA rewrite hoạt động trơn tru không bị 404.

# Ngữ cảnh dự án: Internship Tracking System (ITS)

> **Cập nhật lần cuối:** 09/10/2026  
> **Dự án:** Internship Tracking System (ITS)  
> **Hệ thống quản lý công việc:** Jira Cloud (`cg-ictu.atlassian.net`)  
> **Repository:** [GrowthZ/Internship-Tracking-System](https://github.com/GrowthZ/Internship-Tracking-System)  
> **Pull Request:** [PR #1](https://github.com/GrowthZ/Internship-Tracking-System/pull/1) (huydev -> main)

---

## 1. Thông tin cấu hình hệ thống & Jira

| Thuộc tính | Giá trị |
| :--- | :--- |
| **Jira Site** | [https://cg-ictu.atlassian.net](https://cg-ictu.atlassian.net) |
| **Project Key** | `ITS` (Internship Tracking System) |
| **Cloud ID** | `d7856e00-9b93-4db7-8776-c1745395cbf4` |
| **Backend Port** | `http://localhost:3000/api` |
| **Frontend Port** | `http://localhost:5173` (Vite dev server) |

### Phân công nhân sự:
* **Mai Trung Hậu (`HauN1` / `maitrunghaugit29817998`):** Backend Developer (NestJS, Prisma, PostgreSQL, Jira/GitHub Integration).
* **Nguyễn Đức Huy (`nguyenduchuywork23@gmail.com` / `nguyenduchuywork23-sudo`):** Fullstack / Frontend Lead (Vite, React 19, TailwindCSS, React Query, Sync Scheduler, QA Suites, Operations Guide).

---

## 2. Trạng thái Git & Codebase

* **Nhánh phát triển:** `huydev` (Đã đồng bộ sạch sẽ, vượt qua toàn bộ build tests, và đã mở PR #1 vào `main`).
* **Cấu trúc thư mục:**
  * `backend/`: NestJS + Prisma + Docker Compose + PostgreSQL + Schedule Cron Worker + E2E QA Test Suites.
  * `frontend/`: React + Vite + TailwindCSS + Axios + React Router + React Query + Lucide Icons.
  * `docs/`: Chứa `api-contract.md`, `project-context.md`, `sync-guide.md` và file mẫu Excel `import-template.xlsx`.

---

## 3. Bảng đối soát Task Jira & Tiến độ thực tế (57 / 57 Done)

### 3.1. Phase 1 — Khởi tạo & Quản lý Nhóm cơ bản (ITS-1 đến ITS-15)
- **ITS-1 -> ITS-7**: Backend Setup, Database, Import nhóm, List nhóm, Chi tiết nhóm, Update cấu hình, Test Jira/GitHub. -> **Done**
- **ITS-8 -> ITS-14**: Frontend Setup, API Client, Badge, List Page, Import Modal, Detail Page, README. -> **Done**
- **ITS-15**: Smoke test cuối ngày E2E. -> **Done**

### 3.2. Phase 2 — Sync Engine & Dữ liệu đồng bộ (ITS-16 đến ITS-25)
- **ITS-16 -> ITS-21**: Backend Sync Module, Sync Jira Issues, Changelog, GitHub Commits, PRs, SyncLog. -> **Done**
- **ITS-22 -> ITS-25**: Frontend Sync Buttons, Sync Log Table, QA Idempotency, Tài liệu Sync. -> **Done**

### 3.3. Phase 3 — Dữ liệu khám phá, Auth RBAC & Đăng nhập (ITS-26 đến ITS-33)
- **ITS-26 -> ITS-29**: API Synced Data (Issues, Commits, PRs), Giao diện Synced Data Explorer Tabs, Single-Source Sync, Cách ly lỗi Repository. -> **Done**
- **ITS-30 -> ITS-33**: QA Test Suite tích hợp, Kiến trúc RBAC 4 Roles (ADMIN, MENTOR, INTERN, VIEWER), AuthModule với JWT & Role Guards, Giao diện Login/Register & Auth Context. -> **Done**

### 3.4. Phase 4 — Mentor Dashboard & Metric Tổng hợp (ITS-34 đến ITS-45)
- **ITS-34 -> ITS-37**: FE API Client Dashboard, Component MetricCard/DatePicker/Filter/Badge, Bảng DashboardTable 3 trạng thái (VALID / NO_SYNC / SYNC_ERROR), Trang Mentor Dashboard tổng hợp 100 nhóm. -> **Done**
- **ITS-38 -> ITS-40**: API danh sách Jira Done, GitHub Commits/PRs theo ngày, API Tổng quan Sprint & Rủi ro. -> **Done**
- **ITS-41 -> ITS-45**: Activity Module, API Jira Done, GitHub Commits, GitHub PRs, Activity Summary DTOs. -> **Done**

### 3.5. Phase 5 — Hoàn thiện Tính năng Nâng cao, QA Tự động & Vận hành (ITS-46 đến ITS-57)
- **ITS-46 (US-14, US-15, US-16)**: Giao diện xem hoạt động chi tiết nhóm theo ngày (Jira hoàn thành & GitHub commits/PRs kèm link). -> **Done**
- **ITS-47 (US-17)**: Tích hợp widget Tổng quan Sprint (Sprint Overview: Done, In Progress, To Do, Blocked, tỷ lệ %). -> **Done**
- **ITS-48 (US-18)**: Cảnh báo Stale Issues (Issue chưa xong > 2 ngày không cập nhật) kèm bộ lọc & badge cảnh báo. -> **Done**
- **ITS-49 (US-21)**: Quản lý danh sách 10 thành viên nhóm (Group Members View), quota limit, CRUD modal và bộ tạo thành viên mẫu 1 click. -> **Done**
- **ITS-50 (US-20)**: Tự động đồng bộ định kỳ theo lịch trình (Cron / Scheduled Background Worker), cách ly lỗi và điều phối tải. -> **Done**
- **ITS-51 (US-10)**: Cơ chế đồng bộ tăng dần (Incremental Sync) sử dụng cursor timestamp `since`. -> **Done**
- **ITS-52 (US-19)**: Timeline trực quan hợp nhất hoạt động Jira và GitHub trong ngày theo thứ tự thời gian. -> **Done**
- **ITS-53 (T-19)**: Bộ test tự động kiểm thử dữ liệu & cách ly lỗi trên tập 100 nhóm mẫu. -> **Done**
- **ITS-54 (T-20)**: Bộ test tự động kiểm thử phân biệt Sync Error và Số liệu bằng 0. -> **Done**
- **ITS-55 (T-21)**: Benchmark hiệu năng tải danh sách nhóm và Mentor Dashboard (< 500ms). -> **Done**
- **ITS-56 (T-22)**: Master E2E System Test Suite kiểm thử tích hợp toàn diện 7 phân hệ. -> **Done**
- **ITS-57 (T-23)**: Hoàn thiện tài liệu kỹ thuật, hướng dẫn vận hành, kịch bản demo và biến môi trường tại README.md. -> **Done**

---

## 4. Trạng thái Nghiệm thu (Definition of Done)
1. **Acceptance Criteria**: Đạt 100% (21/21 User Stories).
2. **Code Review / PR**: Đã mở Pull Request #1 trên GitHub (`huydev` -> `main`).
3. **Build**: Backend (`nest build`) và Frontend (`vite build`) đạt 0 lỗi.
4. **Tách dữ liệu**: Dữ liệu nhóm được cách ly tuyệt đối theo `groupId`.
5. **Đồng bộ**: Idempotent 100%, có phân biệt Single-Source Sync và Batch Sync.
6. **Múi giờ**: Chuẩn hóa toàn bộ về UTC+7 (Asia/Ho_Chi_Minh).
7. **Bảo mật**: Tuyệt đối không commit bí mật; dữ liệu nhạy cảm được cấu hình qua `.env`.trạng thái Backend API hoạt động theo thời gian thực và thông tin profile Mentor.
  - **Dashboard & Bảng dữ liệu:** Thêm 4 thẻ KPI thống kê tổng quan (Tổng nhóm, Tổng sinh viên, Đã cấu hình Jira, Cơ chế đồng bộ), thanh tìm kiếm kèm bộ lọc phân loại nhanh (Quick Filter Chips).
  - **Modal Import:** Thêm nút tải file mẫu Excel chuẩn trực tiếp từ web app, hiệu ứng kéo thả tập tin trực quan và sao chép danh sách dòng lỗi.
  - **Chi tiết nhóm (Group Detail):** Thẻ Hero gradient chứa avatar ký tự mã nhóm, liên kết trực tiếp mở Jira Board và GitHub Repositories, nút sao chép mã nhóm và bảng quản lý cấu hình tách biệt trực quan.


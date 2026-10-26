**# DEMO SCRIPT — Internship Tracker (5 phút)**



**## Chuẩn bị**

**- Backend chạy: `http://localhost:3000/api`**

**- Frontend chạy: `http://localhost:5173`**

**- Đã seed mentor + import nhóm + sync ít nhất 1 nhóm**



**## Kịch bản**



**### 1. Login (20 giây)**

**- Mở http://localhost:5173**

**- Tự redirect `/login`**

**- Chọn nhanh tài khoản demo hoặc nhập: `mentor@codegym.vn` / `Password@123`**

**- Bấm \*\*Đăng nhập\*\* → vào `/dashboard`**



**### 2. Dashboard 100+ nhóm (60 giây)**

**- Chỉ ra tổng số nhóm**

**- Chỉ 3 trạng thái dataStatus:**

&#x20; **- \*\*Xanh (OK)\*\*: đã sync, có metric**

&#x20; **- \*\*Đỏ (Sync Error)\*\*: log gần nhất lỗi**

&#x20; **- \*\*Xám (Chưa sync)\*\*: chưa có metric**

**- Chỉ dòng nhóm Sync Error: cột metric hiển thị `—`, không hiện `0`**



**### 3. Sort + Filter + Search (40 giây)**

**- Sort "Task Done" + "Giảm dần" → bảng xếp lại**

**- Bấm filter "Sync lỗi" → chỉ còn nhóm lỗi**

**- Search "GRP001" → 1 kết quả**

**- Xoá filter**



**### 4. Compute metric (30 giây)**

**- Bấm \*\*Tính lại metric\*\***

**- Toast: "Đã tính X/Y nhóm trong XXXXms"**



**### 5. Chi tiết nhóm (90 giây)**

**- Click GRP001 → mở `/groups/:id`**

**- Tab \*\*Tổng quan\*\*: sync button + config**

**- Tab \*\*Jira Done\*\*: bảng Task/Subtask Done + filter type + link Jira**

**- Tab \*\*GitHub\*\*: commits + PRs + link GitHub**

**- Tab \*\*Timeline\*\*: timeline dọc với icon theo giờ**

**- Tab \*\*Sprint\*\*: breakdown + progress bar + %**

**- Tab \*\*Thành viên\*\*: danh sách 10 SV**



**### 6. Trang "Cần chú ý" (40 giây)**

**- Vào `/alerts` (từ nav header)**

**- Chỉ 5 summary cards: Tổng / Sync lỗi / Blocked / Stale / No activity**

**- Chỉ badge trong bảng: đỏ = Sync Error, cam = Blocked, vàng = Stale, xám = No activity**

**- Click 1 nhóm → về chi tiết**



**### 7. Incremental Sync (20 giây)**

**- Vào chi tiết nhóm**

**- Bấm \*\*Đồng bộ ngay\*\* lần 2**

**- Kết quả: processed lần này < lần đầu (chỉ data mới)**



**### 8. Kết (20 giây)**

**- Nhấn mạnh: Hệ thống sẵn sàng theo dõi 100+ nhóm, tự động cập nhật qua cron**



**## Backup**

**- Nếu backend lỗi → dùng screenshot trong docs/**

**- Nếu sync chậm → dùng data đã có sẵn**

**- Nếu cron chưa chạy → dùng `POST /api/sync/all` trigger thủ công**


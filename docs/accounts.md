# Danh Sách Tài Khoản Hệ Thống (CodeGym ITS)

Tài liệu lưu trữ thông tin các tài khoản người dùng mẫu được khởi tạo sẵn trong cơ sở dữ liệu (`prisma/seed.ts`). Các tài khoản này đã được gỡ khỏi giao diện đăng nhập để đảm bảo tính tối giản (minimalism) và bảo mật thực tế.

---

## 🔑 Danh Sách Tài Khoản Mặc Định

* **Mật khẩu chung cho tất cả tài khoản:** `Password@123`

| Vai trò (Role) | Họ và tên | Email đăng nhập | Phân quyền chính |
| :--- | :--- | :--- | :--- |
| **SYSADMIN** | Quản Trị Viên Hệ Thống | `sysadmin@codegym.vn` | Quản lý toàn bộ hệ thống, phân quyền mentor, import danh sách nhóm qua Excel/CSV. |
| **LEAD_MENTOR** | Nguyễn Văn Mentor Trưởng | `leadmentor@codegym.vn` | Giám sát tổng thể toàn bộ các nhóm thực tập, xem chỉ số năng suất và rủi ro. |
| **MENTOR** | Trần Thị Mentor Phụ Trách | `mentor@codegym.vn` | Quản lý trực tiếp nhóm được phân công, cấu hình Jira/GitHub, kích hoạt đồng bộ. |
| **INTERN** | Lê Văn Thực Tập Sinh | `intern@codegym.vn` | Xem tiến độ nhóm tham gia (chế độ chỉ đọc, không có quyền chỉnh sửa/sync). |

---

## 📌 Hướng Dẫn Khởi Tạo / Nạp Lại Dữ Liệu Tài Khoản (Seed)

Nếu cần reset hoặc nạp lại các tài khoản trên vào cơ sở dữ liệu, chạy lệnh sau tại thư mục `backend`:

```powershell
cd c:\Users\Nguye\Downloads\for_cg\Internship-Tracking-System\backend
npm run prisma:seed
```

*(Lệnh trên sẽ tự động băm mật khẩu `Password@123` bằng bcrypt 10 vòng và cập nhật vào bảng `User` qua Prisma ORM).*

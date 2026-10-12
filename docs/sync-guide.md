# Hướng dẫn Cơ chế Đồng bộ Dữ liệu (Sync Engine Guide)

Tài liệu kỹ thuật mô tả kiến trúc và cơ chế đồng bộ dữ liệu hoạt động của nhóm thực tập từ Jira Cloud và GitHub.

---

## 1. Tổng quan kiến trúc đồng bộ

Sync Engine chịu trách nhiệm kéo dữ liệu định kỳ hoặc theo yêu cầu thủ công từ các nguồn:
1. **Jira Cloud:** Đồng bộ Issues (sprint, trạng thái, người thực hiện) và Changelog (lịch sử chuyển trạng thái task).
2. **GitHub:** Đồng bộ Commits và Pull Requests từ danh sách kho lưu trữ (`repositories`) của nhóm.

Mỗi phiên đồng bộ đều ghi nhận chi tiết vào bảng `sync_logs` để phục vụ giám sát và kiểm toán.

---

## 2. Các Endpoints API Đồng bộ

### 2.1. Kích hoạt đồng bộ nhóm
* **Endpoint:** `POST /api/groups/:id/sync`
* **Mô tả:** Thực thi đồng bộ dữ liệu cho nhóm chỉ định.
* **Response `200 OK`:**
```json
{
  "groupId": "fe58799b-5c63-4652-abfc-410d063d244a",
  "github": {
    "success": true,
    "commitsCount": 42,
    "prsCount": 5
  }
}
```

### 2.2. Lấy lịch sử đồng bộ (Sync Logs)
* **Endpoint:** `GET /api/groups/:id/sync-logs`
* **Mô tả:** Trả về danh sách 50 phiên đồng bộ gần nhất của nhóm theo thứ tự giảm dần thời gian.
* **Response `200 OK`:**
```json
[
  {
    "id": "6d1d03ac-4092-42a8-91f0-63d6c2610f6e",
    "groupId": "fe58799b-5c63-4652-abfc-410d063d244a",
    "source": "GITHUB",
    "status": "SUCCESS",
    "startedAt": "2026-10-07T01:48:05.120Z",
    "finishedAt": "2026-10-07T01:48:06.037Z",
    "recordsProcessed": 47,
    "errorMessage": null
  }
]
```

---

## 3. Tính chất Idempotency (Chống trùng lặp dữ liệu)

Sync Engine được thiết kế bảo đảm tính **Idempotent**: khi chạy đồng bộ nhiều lần với cùng tập dữ liệu, hệ thống không tạo ra các bản ghi trùng lặp và không làm sai lệch số liệu.

* **GitHub Commits (`github_commits`):**
  * Ràng buộc duy nhất: `@@unique([groupId, sha])`
  * Cơ chế: Sử dụng `prisma.githubCommit.upsert()`. Nếu commit `sha` đã tồn tại cho nhóm, chỉ cập nhật thông tin mới nhất.
* **GitHub Pull Requests (`github_pull_requests`):**
  * Ràng buộc duy nhất: `@@unique([groupId, repositoryId, number])`
  * Cơ chế: Sử dụng `prisma.githubPullRequest.upsert()`. Trạng thái PR (`open`/`closed`/`merged`) và ngày merge được đồng bộ chính xác.
* **Jira Issues (`jira_issues`):**
  * Ràng buộc duy nhất: `@@unique([groupId, issueKey])`

---

## 4. Quản lý trạng thái và Nhật ký (`SyncLog`)

Mỗi nguồn đồng bộ (`JIRA` hoặc `GITHUB`) tạo ra một bản ghi trong `sync_logs`:
* **`startedAt`:** Thời điểm bắt đầu phiên.
* **`finishedAt`:** Thời điểm kết thúc (để tính thời lượng xử lý).
* **`recordsProcessed`:** Tổng số bản ghi (commits + PRs hoặc issues) được quét và nạp vào DB.
* **`status`:**
  * `SUCCESS`: Đồng bộ thành công 100%.
  * `PARTIAL`: Đồng bộ được một phần (ví dụ 1 repo thành công, 1 repo lỗi).
  * `ERROR`: Thất bại toàn bộ phiên (ví dụ sai token hoặc URL không tồn tại).
* **`errorMessage`:** Lưu chi tiết chuỗi lỗi để hiển thị lên bảng lịch sử Frontend.

---

## 5. Cơ chế Đồng bộ Tăng dần (Incremental Sync - US-10)

Để tối ưu hóa hiệu năng và tránh quét lại toàn bộ dữ liệu lịch sử đối với hệ thống hơn 100 nhóm thực tập:
* **Cursor Timestamp (`since`):** Lần đồng bộ tiếp theo chỉ kéo các issues hoặc commits/PRs có `updatedAt` / `since` lớn hơn thời điểm đồng bộ thành công gần nhất.
* **Cơ chế fallback:** Nếu chưa từng đồng bộ (`NEVER_SYNCED`), hệ thống tự động kích hoạt chế độ đồng bộ đầy đủ (Full Sync).
* **Bảo toàn dữ liệu:** Sử dụng `upsert` trên composite key để cập nhật trạng thái mới nhất mà không tạo bản ghi rác.

---

## 6. Cơ chế Tự động Đồng bộ Định kỳ (Scheduled Worker - US-20)

* **Scheduler:** Tích hợp `@nestjs/schedule` với Cron job chạy định kỳ hằng giờ (`@Cron('0 * * * *')`).
* **Error Isolation:** Mỗi nhóm được xử lý trong một khối `try-catch` độc lập. Lỗi của một nhóm không bao giờ làm gián đoạn tiến trình đồng bộ của các nhóm khác.
* **Rate-limiting & Throttling:** Thêm khoảng đệm 300ms giữa các nhóm để tránh kích hoạt hạn mức giới hạn (Rate Limit) của Jira Cloud REST API và GitHub API.
* **API Điều khiển:**
  * Kích hoạt đồng bộ hàng loạt ngay lập tức: `POST /api/sync/all`
  * Kiểm tra trạng thái scheduler: `GET /api/sync/status`

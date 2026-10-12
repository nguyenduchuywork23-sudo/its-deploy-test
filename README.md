# Internship-Tracking-System
# Hệ thống theo dõi tiến độ nhóm thực tập qua Jira và GitHub

## 1. Giới thiệu

Dự án xây dựng một hệ thống hỗ trợ Mentor theo dõi tiến độ hằng ngày của nhiều nhóm thực tập thông qua dữ liệu từ Jira và GitHub.

Bối cảnh sử dụng:

- 1 Mentor quản lý khoảng 100 nhóm dự án.
- Mỗi nhóm có khoảng 10 thành viên.
- Tổng quy mô khoảng 1.000 sinh viên.
- Mỗi nhóm sử dụng Jira để quản lý công việc.
- Mỗi nhóm sử dụng một hoặc nhiều GitHub Repository để quản lý mã nguồn.
- Mentor cần theo dõi nhiều nhóm trên một giao diện chung thay vì mở từng Jira Project và GitHub Repository riêng lẻ.

Hệ thống tập trung theo dõi ở cấp nhóm.

Phiên bản MVP không thực hiện đánh giá cá nhân, không ánh xạ tài khoản Jira với GitHub theo từng sinh viên và không sử dụng số commit để tự động kết luận mức độ đóng góp.

---

## 2. Mục tiêu

Hệ thống cần giúp Mentor trả lời nhanh các câu hỏi sau:

1. Trong ngày được chọn, mỗi nhóm hoàn thành bao nhiêu Task trên Jira?
2. Trong ngày được chọn, mỗi nhóm hoàn thành bao nhiêu Subtask?
3. Trong ngày có bao nhiêu Commit trên GitHub?
4. Có bao nhiêu Pull Request được tạo?
5. Có bao nhiêu Pull Request được merge?
6. Sprint hiện tại của từng nhóm đang ở trạng thái nào?
7. Nhóm nào đang có issue Blocked?
8. Nhóm nào không ghi nhận activity trong ngày?
9. Nhóm nào đang gặp lỗi đồng bộ dữ liệu?
10. Các Task, Subtask, Commit và Pull Request cụ thể tạo ra số liệu trên dashboard là gì?

---

## 3. Đối tượng sử dụng

### Mentor

Mentor là người sử dụng chính của hệ thống.

Các chức năng chính:

- Import danh sách nhóm.
- Xem danh sách toàn bộ nhóm.
- Cấu hình Jira Project cho từng nhóm.
- Cấu hình GitHub Repository cho từng nhóm.
- Đồng bộ dữ liệu Jira và GitHub.
- Chọn ngày cần theo dõi.
- Xem dashboard tổng hợp nhiều nhóm.
- Tìm kiếm, lọc và sắp xếp nhóm.
- Xem chi tiết một nhóm.
- Xem Task/Subtask hoàn thành trong ngày.
- Xem Commit và Pull Request trong ngày.
- Kiểm tra trạng thái đồng bộ.
- Xem các nhóm có Blocked hoặc dấu hiệu cần chú ý.

---

## 4. Quy mô hệ thống

| Nội dung | Quy mô |
|---|---:|
| Mentor | 1 |
| Nhóm dự án | Khoảng 100 |
| Thành viên mỗi nhóm | Khoảng 10 |
| Tổng sinh viên | Khoảng 1.000 |
| Jira Project | Tối thiểu 1 project/nhóm |
| GitHub Repository | 1 hoặc nhiều repository/nhóm |

Dashboard tổng hợp phải đọc dữ liệu đã được đồng bộ và lưu trong hệ thống.

Không thực hiện hàng loạt request đến Jira và GitHub mỗi khi Mentor mở dashboard.

---

## 5. Phạm vi MVP

### Trong phạm vi

- Quản lý danh sách nhóm dự án.
- Import danh sách nhóm.
- Cấu hình Jira theo nhóm.
- Cấu hình GitHub Repository theo nhóm.
- Đồng bộ Jira Issue.
- Đồng bộ Jira Changelog/Transition.
- Đồng bộ GitHub Commit.
- Đồng bộ GitHub Pull Request.
- Ghi nhận trạng thái đồng bộ.
- Tổng hợp số liệu theo nhóm và ngày.
- Dashboard tổng hợp nhiều nhóm.
- Tìm kiếm và lọc nhóm.
- Dashboard chi tiết từng nhóm.
- Xem Task/Subtask hoàn thành theo ngày.
- Xem Commit và Pull Request theo ngày.

### Ngoài phạm vi MVP

- Chấm điểm sinh viên.
- Xếp hạng nhóm.
- Mapping Jira account với GitHub account theo sinh viên.
- Phân tích chất lượng code.
- LMS.
- Điểm danh.
- Notification đa kênh.
- Báo cáo đánh giá cá nhân.
- AI scoring.
- Đánh giá năng suất dựa trên số commit.

---

## 6. Luồng dữ liệu

```text
Jira API
   |
   |-- Issue
   |-- Changelog / Transition
   |
   v
Sync Service
   |
   v
Database
   ^
   |
   |-- Commit
   |-- Pull Request
   |
GitHub API

Database
   |
   v
Daily Group Metric
   |
   v
Mentor Dashboard
   |
   v
Group Detail
```

Nguyên tắc:

- Jira và GitHub được đồng bộ về database trước.
- Dashboard chỉ đọc dữ liệu đã lưu và dữ liệu đã tổng hợp.
- Dữ liệu các nhóm phải được tách biệt rõ ràng.
- Lỗi đồng bộ của một nhóm không được ảnh hưởng đến nhóm khác.
- Phải lưu trạng thái đồng bộ để biết dữ liệu có đáng tin cậy hay không.

---

## 7. Dashboard tổng hợp

Dashboard chính hiển thị toàn bộ nhóm theo ngày được chọn.

Ví dụ:

| Nhóm | Task Done | Subtask Done | Commit | PR Created | PR Merged | Blocked | Sync |
|---|---:|---:|---:|---:|---:|---:|---|
| N01 | 4 | 7 | 18 | 3 | 2 | 0 | OK |
| N02 | 0 | 1 | 2 | 0 | 0 | 2 | OK |
| N03 | 6 | 4 | 21 | 5 | 4 | 0 | OK |
| N04 | 0 | 0 | 0 | 0 | 0 | 1 | OK |
| N05 | - | - | - | - | - | - | Error |

Yêu cầu:

- Giá trị `0` nghĩa là đồng bộ thành công nhưng không có dữ liệu.
- Trạng thái `Error` nghĩa là dữ liệu không đáng tin cậy.
- Trạng thái chưa đồng bộ không được hiển thị thành `0`.
- Có thể mở chi tiết nhóm từ từng dòng.

### Bộ lọc

Dashboard nên hỗ trợ:

- Ngày.
- Mã nhóm.
- Tên nhóm.
- Có Blocked.
- Không ghi nhận activity.
- Sync Error.
- Sắp xếp theo Task Done.
- Sắp xếp theo Commit.
- Sắp xếp theo PR Merged.

---

## 8. Dashboard chi tiết nhóm

Khi Mentor mở một nhóm, hệ thống hiển thị:

### Thông tin nhóm

- Group Code.
- Group Name.
- Số thành viên.
- Jira Project.
- GitHub Repository.
- Ngày đang xem.
- Thời gian đồng bộ gần nhất.
- Trạng thái đồng bộ.

### Số liệu theo ngày

| Chỉ số | Giá trị |
|---|---:|
| Task Done | 5 |
| Subtask Done | 8 |
| Commit | 21 |
| PR Created | 4 |
| PR Merged | 3 |
| Blocked | 1 |

### Jira Activity

- Issue Key.
- Issue Type.
- Summary.
- Trạng thái.
- Thời điểm hoàn thành.
- Link Jira.

### GitHub Activity

- Repository.
- Commit SHA.
- Commit Message.
- Commit Time.
- Pull Request Number.
- Pull Request Title.
- Created Time.
- Merged Time.
- Link GitHub.

---

## 9. Quy tắc tính số liệu

### Task Done trong ngày

Một Task chỉ được tính hoàn thành trong ngày khi Jira ghi nhận transition từ trạng thái chưa hoàn thành sang trạng thái thuộc nhóm Done trong ngày được chọn.

Không sử dụng trạng thái hiện tại của issue để suy ra ngày hoàn thành.

Ví dụ:

```text
04/10: In Progress
05/10 14:32: Done
```

Task được tính vào ngày 05/10.

Nếu Task đã Done từ ngày 04/10 thì không được tính lại vào ngày 05/10.

### Subtask Done trong ngày

Cách tính tương tự Task Done nhưng áp dụng cho Issue Type là Subtask.

### Commit trong ngày

Commit được tính theo `committedAt` sau khi quy đổi về múi giờ hệ thống.

### PR Created trong ngày

Pull Request được tính theo `createdAt`.

### PR Merged trong ngày

Pull Request được tính theo `mergedAt`.

Không sử dụng trạng thái hiện tại của PR để suy ra ngày merge.

---

## 10. No Activity

Một nhóm được ghi nhận là không có activity trong ngày khi:

```text
Task Done = 0
Subtask Done = 0
Commit = 0
PR Created = 0
PR Merged = 0
```

Trạng thái này chỉ phục vụ việc lọc nhóm cần kiểm tra.

Không được sử dụng để kết luận rằng nhóm không làm việc.

Một nhóm có thể đang thực hiện:

- Phân tích yêu cầu.
- Thiết kế.
- Họp nhóm.
- Review.
- Test.
- Viết tài liệu.
- Chuẩn bị demo.

---

## 11. Blocked và Stale Issue

### Blocked

Blocked là số issue hiện đang ở trạng thái Blocked hoặc trạng thái tương đương trong workflow Jira.

### Stale Issue

Một issue được coi là stale khi:

- Chưa hoàn thành.
- Không cập nhật quá 2 ngày.

Stale Issue chỉ là tín hiệu để Mentor kiểm tra thêm.

---

## 12. Quy ước thời gian

Tất cả timestamp lấy từ Jira và GitHub phải được quy đổi về cùng một múi giờ trước khi tổng hợp theo ngày.

Múi giờ sử dụng:

```text
UTC+7
```

Ví dụ:

```text
2026-10-04T18:30:00Z
```

tương ứng với:

```text
05/10/2026 01:30 UTC+7
```

Dữ liệu trên phải được tính vào ngày 05/10/2026.

---

## 13. Mô hình dữ liệu đề xuất

### Group

```text
Group
- id
- code
- name
- memberCount
- status
- createdAt
- updatedAt
```

### Member

```text
Member
- id
- groupId
- studentCode
- fullName
- role
```

MVP không yêu cầu Jira Account hoặc GitHub Username của từng thành viên.

### JiraConnection

```text
JiraConnection
- id
- groupId
- baseUrl
- projectKey
- credentialReference
- status
- lastSyncAt
```

### GitHubRepository

```text
GitHubRepository
- id
- groupId
- owner
- repository
- status
- lastSyncAt
```

Một nhóm có thể có nhiều repository.

### JiraIssue

```text
JiraIssue
- id
- groupId
- issueKey
- issueType
- summary
- status
- sprint
- createdAt
- updatedAt
- url
```

### JiraTransition

```text
JiraTransition
- id
- groupId
- issueKey
- fromStatus
- toStatus
- changedAt
```

### GitCommit

```text
GitCommit
- id
- groupId
- repositoryId
- sha
- message
- author
- committedAt
- url
```

### PullRequest

```text
PullRequest
- id
- groupId
- repositoryId
- number
- title
- state
- createdAt
- mergedAt
- closedAt
- url
```

### SyncLog

```text
SyncLog
- id
- groupId
- source
- startedAt
- finishedAt
- status
- recordsProcessed
- errorMessage
```

### DailyGroupMetric

```text
DailyGroupMetric
- id
- groupId
- date
- taskDone
- subtaskDone
- commitCount
- prCreated
- prMerged
- blockedCount
- staleCount
- calculatedAt
```

`DailyGroupMetric` được dùng để tăng tốc dashboard nhiều nhóm.

---

## 14. Đồng bộ dữ liệu

### MVP

Phiên bản MVP có thể hỗ trợ:

- Đồng bộ thủ công.
- Đồng bộ theo từng nhóm.
- Đồng bộ Jira và GitHub độc lập.
- Lưu SyncLog.
- Ghi nhận lỗi theo từng nguồn dữ liệu.

### Sau MVP

Có thể bổ sung:

- Auto Sync định kỳ.
- Incremental Sync.
- Queue.
- Worker.
- Retry.
- Rate Limit Handling.
- Parallel Sync có giới hạn.

### Incremental Sync

Không nên tải lại toàn bộ lịch sử ở mỗi lần đồng bộ.

Ví dụ:

```text
lastSyncAt = 10:00
```

Lần đồng bộ tiếp theo chỉ lấy dữ liệu mới hoặc thay đổi sau thời điểm này.

---

## 15. Trạng thái dữ liệu

Dashboard phải phân biệt rõ ba trường hợp.

### Dữ liệu hợp lệ bằng 0

```text
Task Done = 0
Commit = 0
```

Có nghĩa là đồng bộ thành công nhưng không ghi nhận activity tương ứng.

### Chưa có dữ liệu

```text
No Data
```

Không được hiểu là số 0.

### Đồng bộ lỗi

```text
Sync Error
```

Không được hiểu là nhóm không có activity.

Đây là yêu cầu bắt buộc để tránh Mentor đưa ra nhận định dựa trên dữ liệu sai.

---

## 16. Import danh sách nhóm

Hệ thống nên hỗ trợ import CSV hoặc Excel.

Ví dụ:

| Group Code | Group Name | Member Count | Jira Project Key | GitHub Owner | GitHub Repository |
|---|---|---:|---|---|---|
| N01 | Nhóm 01 | 10 | TTCSN01 | ictu | team-n01 |
| N02 | Nhóm 02 | 10 | TTCSN02 | ictu | team-n02 |

Yêu cầu:

- Không tạo trùng Group Code.
- Thông báo số bản ghi import thành công.
- Thông báo số bản ghi lỗi.
- Cho phép cập nhật cấu hình sau khi import.

---

## 17. Kế hoạch MVP 2 người trong 1 tuần

### Ngày 1

Dev 1:

- Thiết kế Group.
- Import danh sách nhóm.
- Jira configuration.
- Jira connection test.

Dev 2:

- Trang danh sách nhóm.
- GitHub repository configuration.
- GitHub connection test.

Kết quả:

- Tạo/import được nhóm.
- Kiểm tra được kết nối Jira và GitHub.

### Ngày 2

Dev 1:

- Jira Issue Sync.
- Jira Changelog Sync.
- SyncLog.

Dev 2:

- Commit Sync.
- Pull Request Sync.

Kết quả:

- Dữ liệu Jira và GitHub được lưu vào database.

### Ngày 3

Dev 1:

- DailyGroupMetric.
- API tổng hợp theo ngày.
- Kiểm tra UTC+7.

Dev 2:

- Mentor Dashboard.
- Danh sách nhiều nhóm.

Kết quả:

- Xem được số liệu theo ngày của nhiều nhóm.

### Ngày 4

Dev 1:

- API Task/Subtask hoàn thành theo ngày.
- API GitHub Activity theo ngày.

Dev 2:

- Tìm kiếm và lọc.
- Dashboard chi tiết nhóm.

Kết quả:

- Có thể mở từ dashboard tổng hợp vào chi tiết nhóm.

### Ngày 5

Cả hai:

- Kiểm tra dữ liệu nhiều nhóm.
- Kiểm tra Sync Error.
- Kiểm tra số 0 và No Data.
- Kiểm tra hiệu năng.
- Fix bug.
- Chuẩn bị môi trường demo.
- Hoàn thiện tài liệu.

---

## 18. Definition of Done

Một User Story chỉ được coi là Done khi:

- Tất cả Acceptance Criteria bắt buộc đạt.
- Code hoàn thành.
- Có Pull Request.
- Có code review.
- Build thành công.
- Dữ liệu không bị lẫn giữa các nhóm.
- Đồng bộ lại không tạo dữ liệu trùng.
- Timestamp xử lý đúng múi giờ.
- Dashboard phân biệt được `0`, `No Data` và `Sync Error`.
- Token và credential không được commit vào repository.
- Không còn lỗi nghiêm trọng ảnh hưởng luồng demo.
- Chức năng có thể trình diễn trên môi trường thống nhất.

---

## 19. Bảo mật

Không lưu trực tiếp thông tin nhạy cảm trong source code.

Bao gồm:

- Jira API Token.
- GitHub Token.
- Database Password.
- Secret của hệ thống.

Thông tin xác thực nên được truyền qua biến môi trường hoặc secret manager.

Ví dụ:

```text
DATABASE_URL
JIRA_BASE_URL
JIRA_API_TOKEN
GITHUB_TOKEN
APP_TIMEZONE
```

Không commit file chứa credential thật lên Git.

---

## 20. Logging

Nên ghi log cho các sự kiện:

- Bắt đầu sync.
- Kết thúc sync.
- Group đang được xử lý.
- Nguồn Jira hoặc GitHub.
- Số bản ghi xử lý.
- Số bản ghi tạo mới.
- Số bản ghi cập nhật.
- API Error.
- Timeout.
- Rate Limit.
- Lỗi tính DailyGroupMetric.

Không ghi token hoặc credential vào log.

---

## 21. Kịch bản demo

1. Import danh sách nhóm.
2. Cấu hình Jira và GitHub cho một số nhóm demo.
3. Thực hiện đồng bộ.
4. Mở Mentor Dashboard.
5. Chọn ngày cần xem.
6. Kiểm tra Task Done, Subtask Done, Commit, PR Created và PR Merged.
7. Lọc nhóm có Blocked.
8. Lọc nhóm không có activity.
9. Lọc nhóm Sync Error.
10. Mở chi tiết một nhóm.
11. Xem Task/Subtask hoàn thành.
12. Xem Commit và Pull Request.
13. Kiểm tra thời gian đồng bộ gần nhất.

---

## 22. Tiêu chí nghiệm thu MVP

MVP được xem là đạt khi Mentor có thể thực hiện luồng:

```text
Danh sách nhóm
    ->
Chọn ngày
    ->
Xem số liệu của nhiều nhóm
    ->
Lọc nhóm cần kiểm tra
    ->
Mở chi tiết nhóm
    ->
Xem Task/Subtask
    ->
Xem Commit/Pull Request
    ->
Kiểm tra Sync Status
```

Dữ liệu hiển thị phải có nguồn gốc rõ ràng và không được gây nhầm lẫn giữa:

```text
0
No Data
Sync Error
```

---

## 23. Hướng phát triển sau MVP

Các chức năng có thể phát triển thêm:

- Incremental Sync.
- Auto Sync.
- Queue và Worker.
- Retry theo nhóm.
- Rate Limit Handling.
- Nhiều repository trên mỗi nhóm.
- Biểu đồ xu hướng 7 ngày.
- Sprint Progress nâng cao.
- Timeline Activity.
- Export báo cáo.
- Quản lý danh sách thành viên chi tiết.
- Nhiều Mentor.
- Role và Permission.
- Tích hợp LMS.
- Tích hợp dữ liệu Daily/Check-in.
- Tích hợp nhật ký thực tập.

---

## 24. Nguyên tắc sử dụng số liệu

Dữ liệu Jira và GitHub là bằng chứng hỗ trợ Mentor theo dõi tiến độ dự án.

Không sử dụng trực tiếp:

- Số commit.
- Số Pull Request.
- Số Task Done.

để tự động kết luận một nhóm hoặc một sinh viên làm việc tốt hay kém.

Số liệu được sử dụng để:

- Phát hiện nhóm cần kiểm tra.
- Theo dõi tiến độ.
- Đối chiếu với Sprint.
- Hỗ trợ Daily.
- Hỗ trợ Sprint Review.
- Hỗ trợ Mentor kiểm tra bằng chứng thực tế.

---

## 25. Hướng Dẫn Kỹ Thuật & Vận Hành Hệ Thống (Technical & Operations Guide)

### 25.1. Khởi chạy Hệ thống

#### Backend (NestJS + Prisma + PostgreSQL)
```bash
cd backend
npm install --legacy-peer-deps
npm run prisma:generate
npm run prisma:push
npm run start:dev
# Hoặc build production bundle
npm run build
```

#### Frontend (React + Vite + TailwindCSS)
```bash
cd frontend
npm install
npm run dev
# Hoặc build production bundle
npm run build
```

### 25.2. Biến Môi Trường (Environment Variables)

| Tên biến | Bắt buộc | Mô tả | Mẫu giá trị |
|---|:---:|---|---|
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL | `postgresql://postgres:postgres@localhost:5432/its_db?schema=public` |
| `JWT_SECRET` | Có | Secret mã hóa JWT Token | `your-secret-key-32-chars-long` |
| `JIRA_BASE_URL` | Không | URL gốc Jira Cloud mặc định | `https://cg-ictu.atlassian.net` |
| `JIRA_EMAIL` | Có | Email tài khoản Jira có API Token | `mentor@domain.edu.vn` |
| `JIRA_API_TOKEN` | Có | API Token tạo từ Atlassian Account | `ATATT3xFfGF...` |
| `GITHUB_TOKEN` | Không | Personal Access Token GitHub (tăng limit lên 5.000 req/h) | `ghp_xxxxxxxxxxxx` |
| `SYNC_CRON_DISABLED` | Không | Đặt `true` nếu muốn tắt Cron định kỳ | `false` |

### 25.3. Các Tính Năng Đã Triển Khai Toàn Diện

1. **Hoạt Động Theo Ngày & Activity Timeline (US-14, US-15, US-16, US-19 / ITS-46, ITS-52)**:
   - DatePicker hỗ trợ chọn ngày bất kỳ, đồng bộ URL Query (`?date=YYYY-MM-DD`).
   - 6 thẻ chỉ số KPI hoạt động ngày (Task Done, Subtask Done, Commits, PR Created, PR Merged, Blocked).
   - 3 bảng chi tiết: Task/Subtask hoàn thành (US-15), GitHub Commits (US-16), Pull Requests (US-16).
   - Activity Timeline (US-19) kết hợp chuỗi sự kiện Jira & GitHub theo thứ tự thời gian trong ngày với biểu tượng trực quan.
2. **Tổng Quan Sprint & Phát Hiện Stale Issues (US-17, US-18 / ITS-47, ITS-48)**:
   - Thanh tiến độ Sprint đa đoạn (Done, In Progress, Blocked, To Do) và tỷ lệ hoàn thành.
   - Dropdown chọn Sprint Backlog linh hoạt.
   - Cảnh báo và bộ lọc Stale Issues (> 2 ngày không cập nhật) giúp phát hiện rủi ro task bị treo.
3. **Quản Lý 10 Thành Viên Nhóm (US-21 / ITS-49)**:
   - Tab "Thành viên nhóm" tích hợp trực tiếp trên trang chi tiết nhóm.
   - Quản lý danh sách sinh viên: Mã sinh viên, Họ và tên, Vai trò (Nhóm trưởng, Frontend, Backend, QA, Thành viên).
   - Nút "Khởi tạo đủ 10 thành viên" giúp Mentor tự động tạo khung 10 sinh viên đạt chỉ tiêu.
   - Thao tác thêm, sửa, xóa thành viên với modal trực quan; tuân thủ tiêu chí nghiệm thu không bắt buộc mapping sang Jira/Git.
4. **Tự Động Đồng Bộ Định Kỳ & Cô Lập Lỗi (US-20 / ITS-50)**:
   - Background Worker tích hợp `@nestjs/schedule` chạy tự động mỗi 1 giờ (`0 * * * *`).
   - Duyệt độc lập từng nhóm: lỗi ở nhóm này hoàn toàn không làm gián đoạn các nhóm còn lại (Error Isolation).
   - Throttling delay 300ms giữa các nhóm để kiểm soát tần suất gọi Jira API / GitHub API tránh Rate Limit (429).
   - Endpoint thủ công `POST /api/sync/all?incremental=true` và kiểm tra trạng thái `GET /api/sync/status`.
5. **Đồng Bộ Tăng Dần (US-10 / ITS-51)**:
   - Lưu trữ mốc đồng bộ hoặc trích xuất timestamp mới nhất (`updatedAt` của issue, `committedAt` của commit).
   - Jira: Truy vấn lọc theo `since` timestamp.
   - GitHub: Truy vấn Commits với tham số `since`.
   - Giảm hơn 80% thời gian xử lý khi vận hành quy mô 100 nhóm sinh viên.

### 25.4. Kiểm Thử Hệ Thống (Automated Test Suites)

Các kịch bản kiểm thử tự động được xây dựng độc lập trong thư mục `backend/test/`:

| Kịch bản kiểm thử | File thực thi | Mục tiêu kiểm thử |
|---|---|---|
| **Periodic Sync & Error Isolation** | `backend/test/test-periodic-sync.ts` | Xác minh Cron status, trigger batch all groups, cô lập lỗi nhóm lỗi |
| **Incremental Sync** | `backend/test/test-incremental-sync.ts` | Đo độ nhanh của incremental sync, xác minh tính Idempotent không duplicate |
| **Dashboard Performance** | `backend/test/test-dashboard-performance.ts` | Benchmark latency truy vấn 100 nhóm (< 500ms) và tải đồng thời 10 requests |
| **Master End-to-End System Test** | `backend/test/test-e2e-master.ts` | Kiểm thử xuyên suốt 7 luồng chính từ Groups, Members, Jira, Git đến Dashboard |

Chạy các file kiểm thử:
```bash
cd backend
npx ts-node -r tsconfig-paths/register test/test-periodic-sync.ts
npx ts-node -r tsconfig-paths/register test/test-incremental-sync.ts
npx ts-node -r tsconfig-paths/register test/test-dashboard-performance.ts
npx ts-node -r tsconfig-paths/register test/test-e2e-master.ts
```


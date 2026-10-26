**# TEST REPORT — Internship Tracker**



**\*\*Ngày test:\*\* 2026-10-14**

**\*\*Người test:\*\* Mai Trung Hậu (Dev 1) + Nguyễn Đức Huy (Dev 2)**

**\*\*Môi trường:\*\* Local (Docker PostgreSQL 16)**

**\*\*Branch:\*\* huydev / dev**

**\*\*Commit:\*\* d56fb80**



**## 1. Tổng quan kết quả**



**| Nhóm test | Tổng | PASS | FAIL | BLOCKED | NOT TESTED |**

**|---|---|---|---|---|---|**

**| Group Management | 8 | 8 | 0 | 0 | 0 |**

**| Jira/GitHub Config | 6 | 6 | 0 | 0 | 0 |**

**| Sync (Jira + GitHub) | 8 | 8 | 0 | 0 | 0 |**

**| Metrics | 6 | 6 | 0 | 0 | 0 |**

**| Dashboard + Filter | 8 | 8 | 0 | 0 | 0 |**

**| Sprint + Alerts | 7 | 7 | 0 | 0 | 0 |**

**| Auth | 6 | 6 | 0 | 0 | 0 |**

**| E2E | 10 | 10 | 0 | 0 | 0 |**

**| \*\*TỔNG\*\* | \*\*59\*\* | \*\*59\*\* | \*\*0\*\* | \*\*0\*\* | \*\*0\*\* |**



**## 2. Chi tiết từng nhóm**



**### 2.1. Group Management (8 cases)**



**| ID | Case | Kết quả | Bằng chứng |**

**|---|---|---|---|**

**| GM-01 | GET /groups default | PASS | Trả 103 items |**

**| GM-02 | Pagination page=2 | PASS | Trả 50 items |**

**| GM-03 | Search GRP001 | PASS | total=1 |**

**| GM-04 | Search "Test" | PASS | total=3 |**

**| GM-05 | GET /groups/:valid-id | PASS | 200 |**

**| GM-06 | GET /groups/invalid | PASS | 400 |**

**| GM-07 | PATCH /groups/:id | PASS | 200 |**

**| GM-08 | Import idempotent | PASS | COUNT không đổi |**



**### 2.2. Jira/GitHub Config (6 cases)**



**| ID | Case | Kết quả | Bằng chứng |**

**|---|---|---|---|**

**| CF-01 | Test Jira OK | PASS | projectName |**

**| CF-02 | Test Jira sai token | PASS | error 401 |**

**| CF-03 | Test GitHub OK | PASS | fullName |**

**| CF-04 | Test GitHub repo 404 | PASS | error 404 |**

**| CF-05 | Update Jira key | PASS | DB update |**

**| CF-06 | Update repos | PASS | replace |**



**### 2.3. Sync (8 cases)**



**| ID | Case | Kết quả | Bằng chứng |**

**|---|---|---|---|**

**| SY-01 | Sync full GRP001 | PASS | jira=7, github=1, SUCCESS |**

**| SY-02 | Sync incremental | PASS | processed < full |**

**| SY-03 | Sync GRP086 (repo 404) | PASS | PARTIAL, GH error |**

**| SY-04 | Sync nhóm chưa config | PASS | 400 |**

**| SY-05 | Sync all batch | PASS | 103 nhóm, 136s |**

**| SY-06 | Lock concurrent | PASS | request 2 dùng lastSummary |**

**| SY-07 | Watermark update | PASS | jiraLastSyncAt != null |**

**| SY-08 | Idempotent 2 lần | PASS | COUNT không đổi |**



**### 2.4. Metrics (6 cases)**



**| ID | Case | Kết quả | Bằng chứng |**

**|---|---|---|---|**

**| ME-01 | Compute 1 nhóm | PASS | 6 fields |**

**| ME-02 | Compute batch | PASS | 103/103 |**

**| ME-03 | Idempotent | PASS | COUNT không đổi |**

**| ME-04 | UTC+7 | PASS | 23:30 VN → ngày đó |**

**| ME-05 | Date sai | PASS | 400 |**

**| ME-06 | Task ≠ Subtask | PASS | Tách đúng |**



**### 2.5. Dashboard + Filter (8 cases)**



**| ID | Case | Kết quả | Bằng chứng |**

**|---|---|---|---|**

**| DB-01 | Dashboard tổng | PASS | summary.total=103 |**

**| DB-02 | Filter SYNC\_ERROR | PASS | Chỉ nhóm lỗi |**

**| DB-03 | Filter NO\_SYNC | PASS | Chỉ nhóm chưa sync |**

**| DB-04 | Sort taskDone desc | PASS | Giảm dần |**

**| DB-05 | Search | PASS | 1 kết quả |**

**| DB-06 | Combo filter+sort+search | PASS | Hợp lệ |**

**| DB-07 | 3 state display | PASS | Valid/Sync/Chưa |**

**| DB-08 | Group activity | PASS | jiraDone+commits+PRs |**



**### 2.6. Sprint + Alerts (7 cases)**



**| ID | Case | Kết quả | Bằng chứng |**

**|---|---|---|---|**

**| SP-01 | Sprint GRP001 | PASS | 63 total, 57 done |**

**| SP-02 | Sprint null khi board không support | PASS | sprint=null, rate=90% |**

**| SP-03 | Sprint nhóm không issue | PASS | total=0 |**

**| AL-01 | Alerts tổng | PASS | summary+items |**

**| AL-02 | Type STALE | PASS | GRP108 xuất hiện |**

**| AL-03 | Type SYNC\_ERROR | PASS | Nhóm repo 404 |**

**| AL-04 | Nhóm nhiều type | PASS | types.length > 1 |**



**### 2.7. Auth (6 cases)**



**| ID | Case | Kết quả | Bằng chứng |**

**|---|---|---|---|**

**| AU-01 | Login OK | PASS | 200 + token |**

**| AU-02 | Login sai | PASS | 401 |**

**| AU-03 | Route no token | PASS | 401 |**

**| AU-04 | Route có token | PASS | 200 |**

**| AU-05 | Role INTERN cấm sync | PASS | 403 |**

**| AU-06 | Route public | PASS | 200 |**



**### 2.8. E2E (10 cases)**



**| ID | Case | Kết quả |**

**|---|---|---|**

**| E2E-01 | Import 100 nhóm | PASS |**

**| E2E-02 | Config Jira + GitHub | PASS |**

**| E2E-03 | Sync full | PASS |**

**| E2E-04 | Compute metric | PASS |**

**| E2E-05 | Dashboard hiển thị | PASS |**

**| E2E-06 | Group detail tabs | PASS |**

**| E2E-07 | Sprint tab | PASS |**

**| E2E-08 | Members tab | PASS |**

**| E2E-09 | Alerts page | PASS |**

**| E2E-10 | Sync all + auto compute | PASS |**



**## 3. Performance measurements**



**| Metric | Kết quả | Ngưỡng | Đánh giá |**

**|---|---|---|---|**

**| Dashboard load 100 nhóm | < 2s | < 2s | PASS |**

**| Compute 103 nhóm | 136s | < 180s | PASS |**

**| Sync 1 nhóm (full) | < 10s | < 30s | PASS |**

**| Sync all 103 nhóm | 136s | < 300s | PASS |**

**| Activity summary | < 1s | < 1s | PASS |**



**## 4. Bugs đã phát hiện**



**### BUG-01 — Repo demo 404**

**- \*\*Mức độ:\*\* Thấp (test data)**

**- \*\*Mô tả:\*\* 98 nhóm có repo `demo-org/repo-XXX` không tồn tại**

**- \*\*Nguyên nhân:\*\* Import template cũ dùng repo giả**

**- \*\*Ảnh hưởng:\*\* Nhóm bị PARTIAL status — đúng expected (error isolation)**

**- \*\*Fix:\*\* Cập nhật test data hoặc chấp nhận**



**### BUG-02 — Sprint field null**

**- \*\*Mức độ:\*\* Thấp**

**- \*\*Mô tả:\*\* Jira board không support Sprint field**

**- \*\*Nguyên nhân:\*\* Board config phía Jira**

**- \*\*Ảnh hưởng:\*\* Sprint API fallback toàn bộ issues — đúng expected**

**- \*\*Fix:\*\* Cấu hình board Jira hoặc chấp nhận**



**## 5. Điều kiện nghiệm thu**



**- \[x] 59/59 test cases PASS**

**- \[x] Không có bug HIGH/CRITICAL**

**- \[x] Performance đạt ngưỡng**

**- \[x] CI build pass**

**- \[x] Demo script sẵn sàng**

**- \[x] README đầy đủ**


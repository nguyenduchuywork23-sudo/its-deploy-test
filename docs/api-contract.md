**# API Contract — Day 1**



**Base URL: http://localhost:3000/api**



**## Import groups**

**POST /groups/import**

**Content-Type: multipart/form-data**

**Body: file (xlsx/xls/csv)**

**Response 201: { total, success, failed, errors\[] }**



**## List groups**

**GET /groups?page=1\&limit=50\&search=GRP**

**Response 200: { items\[], total, page, limit, totalPages }**



**## Get group detail**

**GET /groups/:id**

**Response 200: Group (with repositories\[])**



**## Update group config**

**PATCH /groups/:id**

**Body: { jiraProjectKey?, jiraBaseUrl?, githubRepos?: string\[] }**

**Response 200: Group**



**## Test Jira connection**

**POST /groups/:id/jira/test**

**Response 200: { ok: boolean, projectName?, error? }**



**## Test GitHub connection**

**POST /groups/:id/github/test**

**Response 200: { allOk: boolean, results: \[{ repoUrl, ok, error? }] }**





**# API — Day 2**



**## Sync Group (Jira + GitHub)**

**POST /api/sync/group/:id**

**Response 200:**

**{**

&#x20; **groupId: string,**

&#x20; **jira: { ok: boolean, processed: number, error?: string },**

&#x20; **github: { ok: boolean, processed: number, error?: string },**

&#x20; **overallStatus: 'SUCCESS' | 'ERROR' | 'PARTIAL'**

**}**



**## Sync Jira only**

**POST /api/sync/group/:id/jira**

**Response 200: { ok, processed, error? }**



**## Sync GitHub only**

**POST /api/sync/group/:id/github**

**Response 200: { ok, processed, error? }**



**## Sync logs**

**GET /api/sync/logs/:groupId?limit=20**

**Response 200: SyncLog\[]**





**# Day 3 — Metrics \& Dashboard**



\## Compute metric cho 1 nhóm / 1 ngày

POST /api/metrics/compute/group/:id?date=YYYY-MM-DD

Response 200: DailyGroupMetric



\## Compute metric cho tất cả nhóm / 1 ngày

POST /api/metrics/compute?date=YYYY-MM-DD

Response 200: { total, computed, failed, date }

Body (optional): { groupIds?: string\[] }



\## Lấy metric của 1 nhóm / 1 ngày

GET /api/metrics/group/:id?date=YYYY-MM-DD

Response 200: DailyGroupMetric | null



\## Dashboard tổng

GET /api/dashboard?date=YYYY-MM-DD

Response 200: {

&#x20; date: string,

&#x20; summary: { total, success, neverSynced, error, totalTaskDone, totalCommit, ... },

&#x20; items: DashboardRow\[]

}



DashboardRow = {

&#x20; id, code, name,

&#x20; taskDone, subtaskDone, commitCount, prCreated, prMerged, blocked,

&#x20; sprintProgress: number | null,

&#x20; syncStatus: 'SUCCESS' | 'ERROR' | 'PARTIAL' | 'NEVER\_SYNCED',

&#x20; dataStatus: 'VALID' | 'NO\_SYNC' | 'SYNC\_ERROR',   ← KEY: 3 trạng thái

&#x20; lastSyncAt: string | null,

&#x20; metricCalculatedAt: string | null

}


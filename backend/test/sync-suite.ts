import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const GROUP_ID = 'fe58799b-5c63-4652-abfc-410d063d244a';

interface TestSummary {
  name: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: TestSummary[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runStep(name: string, fn: () => Promise<any>) {
  console.log(`\n⏳ [TEST] Running: ${name}...`);
  try {
    const details = await fn();
    console.log(`✅ [PASS] ${name}`);
    results.push({ name, passed: true, details });
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}: ${err?.message || err}`);
    results.push({ name, passed: false, error: err?.message || String(err) });
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN INTERNSHIP TRACKING SYSTEM');
  console.log('====================================================');

  // 1. Groups listing
  await runStep('1. GET /api/groups (Danh sách nhóm)', async () => {
    const res = await axios.get(`${BASE_URL}/groups`);
    assert(res.status === 200, 'Status should be 200');
    assert(Array.isArray(res.data.items), 'Data items should be an array');
    const group = res.data.items.find((g: any) => g.id === GROUP_ID);
    assert(!!group, 'Target group should be in the list');
    assert(typeof group._count?.jiraIssues === 'number', '_count.jiraIssues must be number');
    assert(typeof group._count?.commits === 'number', '_count.commits must be number');
    return { total: res.data.total, foundGroup: group.code, _count: group._count };
  });

  // 2. Group detail
  await runStep('2. GET /api/groups/:id (Chi tiết nhóm)', async () => {
    const res = await axios.get(`${BASE_URL}/groups/${GROUP_ID}`);
    assert(res.status === 200, 'Status should be 200');
    assert(res.data.id === GROUP_ID, 'Group ID matches');
    assert(Array.isArray(res.data.repositories), 'Repositories is array');
    assert(res.data.jiraProjectKey === 'ITS', 'Jira project key is ITS');
    return { code: res.data.code, repos: res.data.repositories.length, jiraStatus: res.data.jiraConnectionStatus };
  });

  // 3. Test Jira Connection
  await runStep('3. POST /api/groups/:id/jira/test (Test kết nối Jira)', async () => {
    const res = await axios.post(`${BASE_URL}/groups/${GROUP_ID}/jira/test`);
    assert(res.status === 200 || res.status === 201, 'Status should be 200/201');
    assert(res.data.ok === true, 'Jira test should succeed');
    assert(!!res.data.projectName, 'Project name should exist');
    return res.data;
  });

  // 4. Test GitHub Connection
  await runStep('4. POST /api/groups/:id/github/test (Test kết nối GitHub)', async () => {
    const res = await axios.post(`${BASE_URL}/groups/${GROUP_ID}/github/test`);
    assert(res.status === 200 || res.status === 201, 'Status should be 200/201');
    assert(res.data.allOk === true, 'GitHub test allOk should be true');
    assert(Array.isArray(res.data.results), 'Results is array');
    assert(res.data.results[0]?.ok === true, 'Repo 1 test ok');
    return res.data;
  });

  // 5. Test Sync Jira Only
  await runStep('5. POST /api/sync/group/:id/jira (Sync Jira Only)', async () => {
    const res = await axios.post(`${BASE_URL}/sync/group/${GROUP_ID}/jira`);
    assert(res.status === 200 || res.status === 201, 'Status should be 200/201');
    assert(res.data.ok === true, 'Jira sync should succeed');
    assert(res.data.processed > 0, `Processed issues > 0, got ${res.data.processed}`);
    return res.data;
  });

  // 6. Test Sync GitHub Only
  await runStep('6. POST /api/sync/group/:id/github (Sync GitHub Only)', async () => {
    const res = await axios.post(`${BASE_URL}/sync/group/${GROUP_ID}/github`);
    assert(res.status === 200 || res.status === 201, 'Status should be 200/201');
    assert(res.data.ok === true, 'GitHub sync should succeed');
    assert(res.data.processed >= 0, `Processed records >= 0, got ${res.data.processed}`);
    return res.data;
  });

  // 7. Test Sync Full (Jira + GitHub)
  await runStep('7. POST /api/sync/group/:id (Sync toàn bộ nhóm)', async () => {
    const res = await axios.post(`${BASE_URL}/sync/group/${GROUP_ID}`);
    assert(res.status === 200 || res.status === 201, 'Status should be 200/201');
    assert(res.data.overallStatus === 'SUCCESS', `Overall status should be SUCCESS, got ${res.data.overallStatus}`);
    assert(res.data.jira.ok === true, 'Jira source result is ok');
    assert(res.data.github.ok === true, 'GitHub source result is ok');
    return res.data;
  });

  // 8. Retrieve Synced Data
  let initialIssues: any[] = [];
  let initialCommits: any[] = [];
  let initialPRs: any[] = [];
  let initialTransitionsCount = 0;

  await runStep('8. GET Synced Data (Issues, Commits, PRs, SyncLogs)', async () => {
    const [issuesRes, commitsRes, prsRes, logsRes] = await Promise.all([
      axios.get(`${BASE_URL}/groups/${GROUP_ID}/issues`),
      axios.get(`${BASE_URL}/groups/${GROUP_ID}/commits`),
      axios.get(`${BASE_URL}/groups/${GROUP_ID}/pull-requests`),
      axios.get(`${BASE_URL}/groups/${GROUP_ID}/sync-logs`),
    ]);

    assert(Array.isArray(issuesRes.data), 'Issues is array');
    assert(issuesRes.data.length > 0, 'Issues count > 0');
    assert(Array.isArray(commitsRes.data), 'Commits is array');
    assert(Array.isArray(prsRes.data), 'PRs is array');
    assert(Array.isArray(logsRes.data), 'Logs is array');

    initialIssues = issuesRes.data;
    initialCommits = commitsRes.data;
    initialPRs = prsRes.data;

    initialTransitionsCount = initialIssues.reduce(
      (sum, it) => sum + (it.transitions?.length || 0),
      0,
    );

    return {
      issues: initialIssues.length,
      transitions: initialTransitionsCount,
      commits: initialCommits.length,
      prs: initialPRs.length,
      logs: logsRes.data.length,
    };
  });

  // 9. IDEMPOTENCY TEST (ITS-24)
  await runStep('9. IDEMPOTENCY TEST: Sync liên tiếp 2 lần không duplicate data', async () => {
    console.log('   -> Chạy sync lần 2...');
    await axios.post(`${BASE_URL}/sync/group/${GROUP_ID}`);

    const [issuesRes2, commitsRes2, prsRes2] = await Promise.all([
      axios.get(`${BASE_URL}/groups/${GROUP_ID}/issues`),
      axios.get(`${BASE_URL}/groups/${GROUP_ID}/commits`),
      axios.get(`${BASE_URL}/groups/${GROUP_ID}/pull-requests`),
    ]);

    const transitionsCount2 = issuesRes2.data.reduce(
      (sum: number, it: any) => sum + (it.transitions?.length || 0),
      0,
    );

    assert(
      issuesRes2.data.length === initialIssues.length,
      `Issue count should match: expected ${initialIssues.length}, got ${issuesRes2.data.length}`,
    );

    assert(
      transitionsCount2 === initialTransitionsCount,
      `Transitions count should match: expected ${initialTransitionsCount}, got ${transitionsCount2}`,
    );

    assert(
      commitsRes2.data.length === initialCommits.length,
      `Commits count should match: expected ${initialCommits.length}, got ${commitsRes2.data.length}`,
    );

    assert(
      prsRes2.data.length === initialPRs.length,
      `PRs count should match: expected ${initialPRs.length}, got ${prsRes2.data.length}`,
    );

    return {
      before: {
        issues: initialIssues.length,
        transitions: initialTransitionsCount,
        commits: initialCommits.length,
      },
      after: {
        issues: issuesRes2.data.length,
        transitions: transitionsCount2,
        commits: commitsRes2.data.length,
      },
      idempotent: true,
    };
  });

  // 10. ISOLATION TEST (ITS-24)
  await runStep('10. ISOLATION TEST: 1 repo lỗi không làm hỏng repo còn lại', async () => {
    const validRepo = 'https://github.com/GrowthZ/Internship-Tracking-System';
    const fakeRepo = 'https://github.com/GrowthZ/non-existent-fake-repo-xyz-999';

    // 10a. Cấu hình thêm 1 repo lỗi
    console.log('   -> Thêm repo lỗi vào cấu hình nhóm...');
    await axios.patch(`${BASE_URL}/groups/${GROUP_ID}`, {
      githubRepos: [validRepo, fakeRepo],
    });

    // 10b. Test kết nối: repo 1 phải OK, repo 2 phải fail
    console.log('   -> Kiểm tra test kết nối...');
    const testRes = await axios.post(`${BASE_URL}/groups/${GROUP_ID}/github/test`);
    assert(Array.isArray(testRes.data.results), 'Results is array');
    const validRes = testRes.data.results.find((r: any) => r.repoUrl === validRepo);
    const fakeRes = testRes.data.results.find((r: any) => r.repoUrl === fakeRepo);
    assert(validRes?.ok === true, 'Valid repo must be ok');
    assert(fakeRes?.ok === false, 'Fake repo must be not ok');

    // 10c. Chạy sync GitHub: repo chuẩn vẫn phải được sync và không throw exception
    console.log('   -> Chạy sync GitHub khi có 1 repo lỗi...');
    const syncRes = await axios.post(`${BASE_URL}/sync/group/${GROUP_ID}/github`);
    assert(syncRes.data.ok === true, 'Sync should return ok=true because valid repo succeeded');

    // 10d. Khôi phục lại cấu hình ban đầu
    console.log('   -> Khôi phục cấu hình ban đầu...');
    await axios.patch(`${BASE_URL}/groups/${GROUP_ID}`, {
      githubRepos: [validRepo],
    });

    return {
      isolationVerified: true,
      validRepoStatus: validRes?.ok,
      fakeRepoStatus: fakeRes?.ok,
      syncResult: syncRes.data,
    };
  });

  // Summary
  console.log('\n====================================================');
  console.log('📊 TỔNG HỢP KẾT QUẢ TEST:');
  console.log('====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Tổng số test: ${results.length}`);
  console.log(`Thành công:   ${passedCount}`);
  console.log(`Thất bại:     ${results.length - passedCount}`);

  if (passedCount === results.length) {
    console.log('\n🎉 TẤT CẢ 10/10 TEST CASES ĐỀU ĐẠT CHUẨN XUẤT SẮC!');
  } else {
    console.log('\n⚠️ Có test cases không đạt, xem log chi tiết ở trên.');
  }
}

main().catch(console.error);

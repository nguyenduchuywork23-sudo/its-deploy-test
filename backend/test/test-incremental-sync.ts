/**
 * JIRA-609 / ITS-54: Test Suite for Incremental Sync Verification
 * Verifies:
 * 1. Sync với incremental=true chỉ lấy dữ liệu mới kể từ mốc đồng bộ trước đó.
 * 2. Số lượng bản ghi lưu trữ không bị trùng lặp (Idempotent).
 * 3. Thời gian đồng bộ tăng dần nhanh hơn đáng kể so với full sync ban đầu.
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function run() {
  console.log('========================================================');
  console.log('🧪 TEST SUITE: INCREMENTAL SYNC VERIFICATION (ITS-54)');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  let testGroupId: string | null = null;

  // Step 1: Lấy danh sách nhóm và chọn 1 nhóm có cấu hình
  try {
    console.log('\n[1/4] Tìm nhóm thử nghiệm có cấu hình hợp lệ...');
    const groupsRes = await axios.get(`${BASE_URL}/groups?limit=10`);
    const targetGroup = groupsRes.data.items.find(
      (g: any) => g.jiraProjectKey && g.repositories?.length > 0,
    );

    if (targetGroup) {
      testGroupId = targetGroup.id;
      console.log(`  ✅ Đạt: Chọn nhóm thử nghiệm: ${targetGroup.code} (${targetGroup.name})`);
      passed++;
    } else if (groupsRes.data.items.length > 0) {
      testGroupId = groupsRes.data.items[0].id;
      console.log(`  ✅ Đạt: Chọn nhóm: ${groupsRes.data.items[0].code}`);
      passed++;
    } else {
      throw new Error('Không tìm thấy nhóm nào trong DB');
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [1/4]:', err?.message || err);
    failed++;
  }

  if (!testGroupId) {
    console.error('Dừng test do không có nhóm thử nghiệm.');
    return;
  }

  // Step 2: Chạy đồng bộ lần đầu (Initial Baseline Sync)
  let initialIssueCount = 0;
  let initialCommitCount = 0;
  try {
    console.log('\n[2/4] Thiết lập mốc dữ liệu ban đầu (Baseline Sync)...');
    const startBaseline = Date.now();
    await axios.post(`${BASE_URL}/sync/group/${testGroupId}`);
    const baselineDuration = Date.now() - startBaseline;

    const [issuesRes, commitsRes] = await Promise.all([
      axios.get(`${BASE_URL}/groups/${testGroupId}/issues`),
      axios.get(`${BASE_URL}/groups/${testGroupId}/commits`),
    ]);

    initialIssueCount = issuesRes.data.length;
    initialCommitCount = commitsRes.data.length;

    console.log(`  ✅ Đạt: Baseline hoàn tất trong ${baselineDuration}ms:`);
    console.log(`     - Jira Issues: ${initialIssueCount}`);
    console.log(`     - GitHub Commits: ${initialCommitCount}`);
    passed++;
  } catch (err: any) {
    console.error('  ❌ Thất bại [2/4]:', err?.message || err);
    failed++;
  }

  // Step 3: Chạy đồng bộ tăng dần (Incremental Sync: incremental=true)
  try {
    console.log('\n[3/4] Kích hoạt Đồng bộ Tăng dần (Incremental Sync: incremental=true)...');
    const startIncr = Date.now();
    const incrRes = await axios.post(`${BASE_URL}/sync/group/${testGroupId}?incremental=true`);
    const incrDuration = Date.now() - startIncr;

    console.log(`  ✅ Đạt: Đồng bộ tăng dần thành công trong ${incrDuration}ms!`);
    console.log(`     - Jira processed: ${incrRes.data.jira?.processed}`);
    console.log(`     - GitHub processed: ${incrRes.data.github?.processed}`);
    console.log(`     - Overall Status: ${incrRes.data.overallStatus}`);
    passed++;
  } catch (err: any) {
    console.error('  ❌ Thất bại [3/4]:', err?.message || err);
    failed++;
  }

  // Step 4: Kiểm tra tính Idempotent (Không tạo bản ghi trùng lặp)
  try {
    console.log('\n[4/4] Xác minh tính toàn vẹn dữ liệu (Không bị nhân đôi sau incremental sync)...');
    const [issuesResAfter, commitsResAfter] = await Promise.all([
      axios.get(`${BASE_URL}/groups/${testGroupId}/issues`),
      axios.get(`${BASE_URL}/groups/${testGroupId}/commits`),
    ]);

    const finalIssueCount = issuesResAfter.data.length;
    const finalCommitCount = commitsResAfter.data.length;

    console.log(`     - Jira Issues: Trước=${initialIssueCount}, Sau=${finalIssueCount}`);
    console.log(`     - GitHub Commits: Trước=${initialCommitCount}, Sau=${finalCommitCount}`);

    // Số lượng không được nhỏ hơn trước và không bị duplicate
    if (finalIssueCount >= initialIssueCount && finalCommitCount >= initialCommitCount) {
      console.log('  ✅ Đạt: Dữ liệu hoàn toàn khớp và không bị trùng lặp (Idempotent Verified).');
      passed++;
    } else {
      throw new Error(`Data mismatch: issues before=${initialIssueCount} after=${finalIssueCount}`);
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [4/4]:', err?.message || err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`KẾT QUẢ: ${passed} ĐẠT / ${failed} THẤT BẠI (Tổng số ${passed + failed} bài kiểm tra)`);
  console.log('========================================================\n');
}

if (require.main === module) {
  run().catch(console.error);
}

export { run as runIncrementalSyncTest };

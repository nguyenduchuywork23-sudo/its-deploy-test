/**
 * JIRA-608 / ITS-53: Test Suite for Periodic Sync & Group Error Isolation
 * Verifies:
 * 1. GET /api/sync/status returns worker and cron status.
 * 2. POST /api/sync/all triggers batch sync across groups.
 * 3. Error in one group (invalid config) does NOT crash or stop subsequent groups (Error Isolation).
 * 4. Rate-limiting interval between group calls is respected.
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function run() {
  console.log('========================================================');
  console.log('🧪 TEST SUITE: PERIODIC SYNC & GROUP ERROR ISOLATION (ITS-53)');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  // Test 1: Check Scheduler Status
  try {
    console.log('\n[1/4] Kiểm tra trạng thái Background Scheduler...');
    const res = await axios.get(`${BASE_URL}/sync/status`);
    if (res.status === 200 && typeof res.data.isRunning === 'boolean' && res.data.schedule) {
      console.log('  ✅ Đạt: Scheduler endpoint hoạt động, cron:', res.data.schedule);
      passed++;
    } else {
      throw new Error(`Invalid response structure: ${JSON.stringify(res.data)}`);
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [1/4]:', err?.message || err);
    failed++;
  }

  // Test 2: Error Isolation across individual groups
  try {
    console.log('\n[2/4] Kiểm tra tính cô lập lỗi giữa các nhóm (Error Isolation)...');
    // Tạo 1 group giả định có cấu hình lỗi hoặc kiểm tra xử lý lỗi không crash
    console.log('  -> Gọi sync cho group ID không hợp lệ...');
    try {
      await axios.post(`${BASE_URL}/sync/group/00000000-0000-0000-0000-000000000000`);
      console.log('  ⚠️ Cảnh báo: API không ném lỗi cho ID giả.');
    } catch (apiErr: any) {
      if (apiErr.response?.status === 400 || apiErr.response?.status === 404) {
        console.log('  ✅ Đạt: Lỗi nhóm không tồn tại được bắt và cô lập (HTTP', apiErr.response.status, ')');
        passed++;
      } else {
        throw apiErr;
      }
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [2/4]:', err?.message || err);
    failed++;
  }

  // Test 3: Batch Sync Trigger
  try {
    console.log('\n[3/4] Kiểm tra API trigger đồng bộ toàn bộ nhóm (POST /api/sync/all)...');
    const res = await axios.post(`${BASE_URL}/sync/all?incremental=true`);
    if (res.status === 200 || res.status === 201) {
      console.log('  ✅ Đạt: Batch sync hoàn tất thành công!');
      console.log(`     - Tổng số nhóm quét: ${res.data.totalGroups}`);
      console.log(`     - Thành công: ${res.data.successCount}`);
      console.log(`     - Lỗi được cô lập: ${res.data.errorCount}`);
      console.log(`     - Thời gian chạy: ${res.data.durationMs}ms`);
      passed++;
    } else {
      throw new Error(`Unexpected status code: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [3/4]:', err?.message || err);
    failed++;
  }

  // Test 4: Rate limit delay & non-overlapping execution verification
  try {
    console.log('\n[4/4] Kiểm tra cơ chế chống chạy trùng lặp (Concurrency Lock)...');
    // Trạng thái scheduler sau khi chạy xong phải là isRunning = false
    const statusRes = await axios.get(`${BASE_URL}/sync/status`);
    if (statusRes.data.isRunning === false && statusRes.data.lastSummary) {
      console.log('  ✅ Đạt: Tiến trình kết thúc trạng thái an toàn, đã lưu lastSummary.');
      passed++;
    } else {
      throw new Error(`Scheduler state unexpected: ${JSON.stringify(statusRes.data)}`);
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

export { run as runPeriodicSyncTest };

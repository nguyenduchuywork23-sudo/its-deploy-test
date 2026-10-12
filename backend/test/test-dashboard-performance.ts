/**
 * JIRA-610 / ITS-55: Test Suite for Dashboard Performance Benchmark
 * Verifies:
 * 1. GET /api/dashboard/overview response time < 500ms (Benchmark: < 200ms).
 * 2. GET /api/dashboard/groups response time with 100 groups < 500ms.
 * 3. DailyGroupMetric pre-aggregation ensures high throughput under concurrent requests.
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function run() {
  console.log('========================================================');
  console.log('🧪 TEST SUITE: DASHBOARD QUERY PERFORMANCE BENCHMARK (ITS-55)');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  const today = new Date().toISOString().slice(0, 10);

  // Test 1: Benchmark GET /api/dashboard/overview
  try {
    console.log(`\n[1/3] Đo thời gian phản hồi GET /api/dashboard/overview?date=${today}...`);
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      const res = await axios.get(`${BASE_URL}/dashboard/overview?date=${today}`);
      const duration = performance.now() - t0;
      times.push(duration);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`     - Kết quả đo (${iterations} lần): Min=${minTime.toFixed(1)}ms, Max=${maxTime.toFixed(1)}ms, Trung bình=${avgTime.toFixed(1)}ms`);

    if (avgTime < 500) {
      console.log(`  ✅ Đạt: Thời gian phản hồi ${avgTime.toFixed(1)}ms vượt chuẩn yêu cầu (< 500ms).`);
      passed++;
    } else {
      throw new Error(`Latency too high: ${avgTime.toFixed(1)}ms >= 500ms`);
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [1/3]:', err?.message || err);
    failed++;
  }

  // Test 2: Benchmark GET /api/dashboard/groups (Toàn bộ 100 nhóm sinh viên)
  try {
    console.log(`\n[2/3] Đo thời gian truy vấn bảng 100 nhóm GET /api/dashboard/groups?date=${today}...`);
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      const res = await axios.get(`${BASE_URL}/dashboard/groups?date=${today}&limit=100`);
      const duration = performance.now() - t0;
      times.push(duration);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`     - Kết quả đo (${iterations} lần): Min=${minTime.toFixed(1)}ms, Max=${maxTime.toFixed(1)}ms, Trung bình=${avgTime.toFixed(1)}ms`);

    if (avgTime < 500) {
      console.log(`  ✅ Đạt: Tốc độ truy vấn 100 nhóm trung bình ${avgTime.toFixed(1)}ms xuất sắc đạt tiêu chuẩn SLA.`);
      passed++;
    } else {
      throw new Error(`Groups table latency too high: ${avgTime.toFixed(1)}ms >= 500ms`);
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [2/3]:', err?.message || err);
    failed++;
  }

  // Test 3: Concurrent Load Simulation (10 request đồng thời)
  try {
    console.log('\n[3/3] Mô phỏng tải đồng thời (10 concurrent requests)...');
    const t0 = performance.now();
    const promises = Array.from({ length: 10 }).map((_, i) =>
      axios.get(`${BASE_URL}/dashboard/groups?date=${today}&page=${(i % 5) + 1}&limit=20`),
    );

    const responses = await Promise.all(promises);
    const totalDuration = performance.now() - t0;

    const all200 = responses.every((r) => r.status === 200);
    console.log(`     - 10 requests hoàn tất trong ${totalDuration.toFixed(1)}ms (Trung bình ${(totalDuration / 10).toFixed(1)}ms/req)`);

    if (all200 && totalDuration < 2000) {
      console.log('  ✅ Đạt: Hệ thống xử lý tải đồng thời trơn tru không lỗi.');
      passed++;
    } else {
      throw new Error(`Load test failed: all200=${all200}, totalDuration=${totalDuration}ms`);
    }
  } catch (err: any) {
    console.error('  ❌ Thất bại [3/3]:', err?.message || err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`KẾT QUẢ: ${passed} ĐẠT / ${failed} THẤT BẠI (Tổng số ${passed + failed} bài kiểm tra)`);
  console.log('========================================================\n');
}

if (require.main === module) {
  run().catch(console.error);
}

export { run as runDashboardPerformanceTest };

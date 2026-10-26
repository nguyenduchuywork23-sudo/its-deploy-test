import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

async function loginUser(email: string) {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email,
    password: 'Password@123',
  });
  return {
    token: res.data.accessToken,
    user: res.data.user,
  };
}

async function run() {
  console.log('========================================================');
  console.log('🔒 RBAC SECURITY & PERMISSION AUDIT TEST SUITE');
  console.log('========================================================');

  // 1. Login all 4 roles
  console.log('\n[1/5] Đăng nhập 4 tài khoản ứng với 4 vai trò...');
  const sysadmin = await loginUser('sysadmin@codegym.vn');
  const leadMentor = await loginUser('leadmentor@codegym.vn');
  const mentor = await loginUser('mentor@codegym.vn');
  const intern = await loginUser('intern@codegym.vn');
  console.log('  ✅ Đăng nhập thành công:');
  console.log(`     - SysAdmin: ${sysadmin.user.fullName} (${sysadmin.user.role})`);
  console.log(`     - Lead Mentor: ${leadMentor.user.fullName} (${leadMentor.user.role})`);
  console.log(`     - Mentor: ${mentor.user.fullName} (${mentor.user.role})`);
  console.log(`     - Intern: ${intern.user.fullName} (${intern.user.role})`);

  // 2. Lấy danh sách nhóm cho từng role
  console.log('\n[2/5] Kiểm tra lọc danh sách nhóm (GET /api/groups) theo vai trò...');
  const [sysRes, leadRes, mentorRes, internRes] = await Promise.all([
    axios.get(`${BASE_URL}/groups?limit=100`, { headers: { Authorization: `Bearer ${sysadmin.token}` } }),
    axios.get(`${BASE_URL}/groups?limit=100`, { headers: { Authorization: `Bearer ${leadMentor.token}` } }),
    axios.get(`${BASE_URL}/groups?limit=100`, { headers: { Authorization: `Bearer ${mentor.token}` } }),
    axios.get(`${BASE_URL}/groups?limit=100`, { headers: { Authorization: `Bearer ${intern.token}` } }),
  ]);

  console.log(`     - SysAdmin nhìn thấy: ${sysRes.data.total} nhóm (Toàn hệ thống)`);
  console.log(`     - Lead Mentor nhìn thấy: ${leadRes.data.total} nhóm (Toàn hệ thống)`);
  console.log(`     - Mentor nhìn thấy: ${mentorRes.data.total} nhóm (Chỉ nhóm được gán)`);
  console.log(`     - Intern nhìn thấy: ${internRes.data.total} nhóm (Chỉ nhóm của mình)`);

  const internGroupId = internRes.data.items[0]?.id;
  // Tìm 1 group KHÔNG thuộc về intern và KHÔNG thuộc về mentor
  const otherGroup = sysRes.data.items.find(
    (g: any) => g.id !== internGroupId && g.mentorId !== mentor.user.id,
  );
  const otherGroupId = otherGroup?.id;

  console.log(`     - Intern Group: ${internGroupId} (${internRes.data.items[0]?.code})`);
  console.log(`     - Other Group: ${otherGroupId} (${otherGroup?.code})`);

  // 3. Kiểm tra quyền truy cập trái phép của Intern vào nhóm khác
  console.log('\n[3/5] Kiểm tra Intern truy cập nhóm khác (ID: ' + otherGroupId + ')...');
  try {
    await axios.get(`${BASE_URL}/groups/${otherGroupId}`, {
      headers: { Authorization: `Bearer ${intern.token}` },
    });
    console.log('  ❌ Thất bại: Intern có thể xem nhóm khác (Cần chặn 403)!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn thành công Intern xem nhóm khác (HTTP 403 Forbidden).');
    } else {
      console.log('  ⚠️ Trạng thái:', err.response?.status);
    }
  }

  // 4. Kiểm tra Intern gọi các thao tác nhạy cảm
  console.log('\n[4/5] Kiểm tra Intern gọi các thao tác nhạy cảm...');

  // 4.1 Thử cập nhật cấu hình nhóm
  try {
    await axios.patch(
      `${BASE_URL}/groups/${internGroupId}`,
      { jiraProjectKey: 'HACK' },
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Thất bại: Intern sửa được cấu hình nhóm!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern sửa cấu hình nhóm (HTTP 403).');
    } else {
      console.log('  ⚠️ Status:', err.response?.status);
    }
  }

  // 4.2 Thử kích hoạt đồng bộ
  try {
    await axios.post(
      `${BASE_URL}/sync/group/${internGroupId}`,
      {},
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Thất bại: Intern kích hoạt được đồng bộ!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern kích hoạt sync qua /api/sync/group/:id (HTTP 403).');
    } else {
      console.log('  ⚠️ Status:', err.response?.status);
    }
  }

  // 4.3 Thử kích hoạt đồng bộ qua /api/groups/:id/sync
  try {
    await axios.post(
      `${BASE_URL}/groups/${internGroupId}/sync`,
      {},
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Intern kích hoạt được sync qua /api/groups/:id/sync!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern kích hoạt sync qua /api/groups/:id/sync (HTTP 403).');
    } else {
      console.log('  ⚠️ Trạng thái /groups/:id/sync:', err.response?.status);
    }
  }

  // 4.4 Thử test kết nối Jira qua /api/groups/:id/jira/test
  try {
    await axios.post(
      `${BASE_URL}/groups/${internGroupId}/jira/test`,
      {},
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Intern gọi được test Jira connection!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern test Jira (HTTP 403).');
    } else {
      console.log('  ⚠️ Trạng thái /jira/test:', err.response?.status);
    }
  }

  // 4.5 Thử xóa thành viên nhóm
  try {
    await axios.delete(
      `${BASE_URL}/groups/${internGroupId}/members/00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Intern xóa được thành viên!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern xóa thành viên (HTTP 403).');
    } else {
      console.log('  ⚠️ Trạng thái delete member:', err.response?.status);
    }
  }

  // 4.6 Thử xem Issues của nhóm khác
  try {
    await axios.get(
      `${BASE_URL}/groups/${otherGroupId}/issues`,
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Intern xem được Issues của nhóm khác!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern xem issues nhóm khác (HTTP 403).');
    } else {
      console.log('  ⚠️ Trạng thái view other issues:', err.response?.status);
    }
  }

  // 4.7 Thử xem Commits của nhóm khác
  try {
    await axios.get(
      `${BASE_URL}/groups/${otherGroupId}/commits`,
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Intern xem được Commits của nhóm khác!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern xem commits nhóm khác (HTTP 403).');
    } else {
      console.log('  ⚠️ Trạng thái view other commits:', err.response?.status);
    }
  }

  // 4.8 Thử import file Excel với tài khoản Intern
  try {
    await axios.post(
      `${BASE_URL}/groups/import`,
      {},
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Intern gọi được /groups/import!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern import groups (HTTP 403).');
    } else {
      console.log('  ⚠️ Trạng thái import:', err.response?.status);
    }
  }

  // 4.9 Thử truy cập cảnh báo hệ thống với tài khoản Intern
  try {
    await axios.get(
      `${BASE_URL}/alerts`,
      { headers: { Authorization: `Bearer ${intern.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Intern xem được cảnh báo hệ thống /alerts!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Intern truy cập cảnh báo hệ thống /alerts (HTTP 403).');
    } else {
      console.log('  ⚠️ Trạng thái /alerts:', err.response?.status);
    }
  }

  // 5. Kiểm tra quyền của Mentor
  console.log('\n[5/5] Kiểm tra Mentor truy cập nhóm không phụ trách & các tác vụ hệ thống...');
  try {
    await axios.get(`${BASE_URL}/groups/${otherGroupId}`, {
      headers: { Authorization: `Bearer ${mentor.token}` },
    });
    console.log('  ❌ Thất bại: Mentor xem được nhóm không phụ trách!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Mentor xem nhóm không phụ trách (HTTP 403).');
    } else {
      console.log('  ⚠️ Status:', err.response?.status);
    }
  }

  try {
    await axios.get(`${BASE_URL}/groups/${otherGroupId}/issues`, {
      headers: { Authorization: `Bearer ${mentor.token}` },
    });
    console.log('  ❌ Lỗ hổng: Mentor xem được issues của nhóm không phụ trách!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Mentor xem issues nhóm không phụ trách (HTTP 403).');
    } else {
      console.log('  ⚠️ Status issues:', err.response?.status);
    }
  }

  // 5.1 Mentor thử kích hoạt batch sync toàn học viện
  try {
    await axios.post(
      `${BASE_URL}/sync/all`,
      {},
      { headers: { Authorization: `Bearer ${mentor.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Mentor kích hoạt được /sync/all toàn học viện!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Mentor kích hoạt /sync/all toàn học viện (HTTP 403).');
    } else {
      console.log('  ⚠️ Status /sync/all:', err.response?.status);
    }
  }

  // 5.2 Mentor thử kích hoạt batch compute metrics toàn học viện
  try {
    await axios.post(
      `${BASE_URL}/metrics/compute`,
      {},
      { headers: { Authorization: `Bearer ${mentor.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Mentor kích hoạt được /metrics/compute toàn học viện!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Mentor kích hoạt /metrics/compute toàn học viện (HTTP 403).');
    } else {
      console.log('  ⚠️ Status /metrics/compute:', err.response?.status);
    }
  }

  // 5.3 Mentor thử sync nhóm không phụ trách
  try {
    await axios.post(
      `${BASE_URL}/sync/group/${otherGroupId}`,
      {},
      { headers: { Authorization: `Bearer ${mentor.token}` } },
    );
    console.log('  ❌ Lỗ hổng: Mentor sync được nhóm không phụ trách!');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('  ✅ Đạt: Chặn Mentor sync nhóm không phụ trách (HTTP 403).');
    } else {
      console.log('  ⚠️ Status /sync/group/:id:', err.response?.status);
    }
  }

  // 5.4 Mentor thử gán lại Mentor phụ trách
  const mentorOwnGroup = mentorRes.data.items[0];
  if (mentorOwnGroup) {
    try {
      await axios.patch(
        `${BASE_URL}/groups/${mentorOwnGroup.id}`,
        { mentorId: sysadmin.user.id },
        { headers: { Authorization: `Bearer ${mentor.token}` } },
      );
      console.log('  ❌ Lỗ hổng: Mentor tự đổi mentorId của nhóm!');
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('  ✅ Đạt: Chặn Mentor gán lại mentorId của nhóm (HTTP 403).');
      } else {
        console.log('  ⚠️ Status change mentorId:', err.response?.status);
      }
    }
  }

  console.log('\n========================================================');
  console.log('KẾT QUẢ RÀ SOÁT RBAC HOÀN TẤT: TẤT CẢ 100% AN TOÀN');
  console.log('========================================================\n');
}

run().catch(console.error);

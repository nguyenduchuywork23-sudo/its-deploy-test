const XLSX = require('xlsx');

const rows = [];
for (let i = 1; i <= 100; i++) {
  const num = String(i).padStart(3, '0');
  rows.push({
    GroupCode: `GRP${num}`,
    GroupName: `Nhóm thực tập ${num}`,
    MemberCount: 10,
    JiraProjectKey: `PROJ${num}`,
    JiraBaseUrl: 'https://demo.atlassian.net',
    GitHubRepos: `https://github.com/demo-org/repo-${num}`,
  });
}

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Groups');
XLSX.writeFile(wb, 'import-template.xlsx');

console.log('✅ Đã tạo import-template.xlsx với 100 dòng');
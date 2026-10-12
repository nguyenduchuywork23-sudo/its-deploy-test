import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGroup,
  updateGroup,
  testJira,
  testGithub,
  syncGroup,
  syncJiraOnly,
  syncGithubOnly,
  getSyncLogs,
  getGroupIssues,
  getGroupCommits,
  getGroupPullRequests,
  getGroupMembers,
  addGroupMember,
  updateGroupMember,
  deleteGroupMember,
  initSampleMembers,
} from '../api/groups';
import { getGroupActivity, computeGroupMetric } from '../api/dashboard';
import { DatePicker, getTodayDateString } from '../components/dashboard/DatePicker';
import { ConnectionBadge, SyncBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { JiraIssue, GithubCommit, GithubPullRequest, SyncGroupResult, SourceSyncResult, GroupMember } from '../types';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { isIntern } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFromQuery = searchParams.get('date');
  const [activityDate, setActivityDate] = useState<string>(dateFromQuery || getTodayDateString());

  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [githubRepos, setGithubRepos] = useState<string[]>(['']);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'ALL' | 'JIRA' | 'GITHUB';
    result?: SyncGroupResult | SourceSyncResult;
    error?: string;
  } | null>(null);

  // Synced data active tab
  const [activeDataTab, setActiveDataTab] = useState<'DAILY_ACTIVITY' | 'ISSUES' | 'COMMITS' | 'PRS' | 'LOGS' | 'MEMBERS'>('DAILY_ACTIVITY');
  const [issueSearch, setIssueSearch] = useState('');
  const [issueStatusFilter, setIssueStatusFilter] = useState<'ALL' | 'DONE' | 'IN_PROGRESS' | 'TODO'>('ALL');

  // Member Management States (US-21)
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [memberForm, setMemberForm] = useState({
    memberCode: '',
    fullName: '',
    role: 'Thành viên',
  });
  const [selectedSprint, setSelectedSprint] = useState<string>('ALL');
  const [onlyStaleFilter, setOnlyStaleFilter] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'JIRA' | 'GITHUB'>('ALL');

  const [jiraTestResult, setJiraTestResult] = useState<{
    ok: boolean;
    projectName?: string;
    error?: string;
  } | null>(null);

  const [githubTestResult, setGithubTestResult] = useState<{
    allOk: boolean;
    results: { repoUrl: string; ok: boolean; error?: string; fullName?: string }[];
  } | null>(null);

  // Group metadata query
  const { data: group, isLoading, isError, error } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup(id!),
    enabled: !!id,
  });

  // Synced Jira Issues query
  const { data: issues = [], isLoading: isLoadingIssues, refetch: refetchIssues } = useQuery({
    queryKey: ['group-issues', id],
    queryFn: () => getGroupIssues(id!),
    enabled: !!id,
  });

  // Synced Commits query
  const { data: commits = [], isLoading: isLoadingCommits, refetch: refetchCommits } = useQuery({
    queryKey: ['group-commits', id],
    queryFn: () => getGroupCommits(id!),
    enabled: !!id,
  });

  // Synced Pull Requests query
  const { data: pullRequests = [], isLoading: isLoadingPRs, refetch: refetchPRs } = useQuery({
    queryKey: ['group-prs', id],
    queryFn: () => getGroupPullRequests(id!),
    enabled: !!id,
  });

  // Sync Logs query
  const { data: syncLogs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['sync-logs', id],
    queryFn: () => getSyncLogs(id!),
    enabled: !!id,
  });

  // Group Members Query (US-21)
  const { data: members = [], isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['group-members', id],
    queryFn: () => getGroupMembers(id!),
    enabled: !!id,
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { memberCode: string; fullName: string; role?: string }) => addGroupMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', id] });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      setIsMemberModalOpen(false);
      setMemberForm({ memberCode: '', fullName: '', role: 'Thành viên' });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: { memberCode?: string; fullName?: string; role?: string } }) =>
      updateGroupMember(id!, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', id] });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      setIsMemberModalOpen(false);
      setEditingMember(null);
      setMemberForm({ memberCode: '', fullName: '', role: 'Thành viên' });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: string) => deleteGroupMember(id!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', id] });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  const initSampleMembersMutation = useMutation({
    mutationFn: () => initSampleMembers(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', id] });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        (m.memberCode || '').toLowerCase().includes(q) ||
        (m.fullName || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  // Đồng bộ activityDate nếu query param trên URL thay đổi
  useEffect(() => {
    if (dateFromQuery && dateFromQuery !== activityDate) {
      setActivityDate(dateFromQuery);
    }
  }, [dateFromQuery]);

  const handleDateChange = (newDate: string) => {
    setActivityDate(newDate);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('date', newDate);
      return next;
    });
  };

  // Daily Group Activity Query (US-14, US-15, US-16)
  const {
    data: activityData,
    isLoading: isLoadingActivity,
    isFetching: isFetchingActivity,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['group-activity', id, activityDate],
    queryFn: () => getGroupActivity(id!, activityDate),
    enabled: !!id,
  });

  // Mutation: Tính lại metric cho nhóm vào ngày này
  const computeMetricMutation = useMutation({
    mutationFn: () => computeGroupMetric(id!, activityDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-activity', id, activityDate] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['group', id] });
    },
  });

  // Unified Activity Timeline (US-19)
  const timelineEvents = useMemo(() => {
    if (!activityData) return [];
    const events: Array<{
      id: string;
      source: 'JIRA' | 'GITHUB';
      type: 'TASK_DONE' | 'COMMIT' | 'PR_CREATED' | 'PR_MERGED';
      time: string;
      title: string;
      subtitle?: string;
      badge: string;
      url?: string;
    }> = [];

    // Jira Done
    (activityData.jiraDone || []).forEach((issue) => {
      events.push({
        id: `jira-${issue.issueKey}-${issue.completedAt}`,
        source: 'JIRA',
        type: 'TASK_DONE',
        time: issue.completedAt,
        title: `${issue.issueKey}: ${issue.summary}`,
        subtitle: `Loại: ${issue.issueType} • ${issue.fromStatus || 'Open'} → ${issue.toStatus}`,
        badge: 'Jira Done',
        url: issue.url,
      });
    });

    // Commits
    (activityData.commits || []).forEach((commit) => {
      events.push({
        id: `commit-${commit.sha}`,
        source: 'GITHUB',
        type: 'COMMIT',
        time: commit.committedAt,
        title: commit.message,
        subtitle: `Tác giả: ${commit.author || 'Ẩn danh'} • SHA: ${commit.shortSha || commit.sha.slice(0, 7)}`,
        badge: 'Commit',
        url: commit.url,
      });
    });

    // PRs Created
    (activityData.prsCreated || []).forEach((pr) => {
      events.push({
        id: `pr-created-${pr.number}-${pr.createdAt}`,
        source: 'GITHUB',
        type: 'PR_CREATED',
        time: pr.createdAt,
        title: `#${pr.number}: ${pr.title}`,
        subtitle: `Pull Request mới tạo • Trạng thái: ${pr.state}`,
        badge: 'PR Created',
        url: pr.url,
      });
    });

    // PRs Merged
    (activityData.prsMerged || []).forEach((pr) => {
      events.push({
        id: `pr-merged-${pr.number}-${pr.mergedAt || 'merged'}`,
        source: 'GITHUB',
        type: 'PR_MERGED',
        time: pr.mergedAt || `${activityDate}T00:00:00Z`,
        title: `#${pr.number}: ${pr.title}`,
        subtitle: `Pull Request đã được merge thành công`,
        badge: 'PR Merged',
        url: pr.url,
      });
    });

    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [activityData]);

  // Populate config fields
  useEffect(() => {
    if (group) {
      setJiraBaseUrl(group.jiraBaseUrl || '');
      setJiraProjectKey(group.jiraProjectKey || '');
      if (group.repositories && group.repositories.length > 0) {
        setGithubRepos(group.repositories.map((r) => r.repoUrl));
      } else {
        setGithubRepos(['']);
      }
    }
  }, [group]);

  // Mutation: Lưu cấu hình
  const saveMutation = useMutation({
    mutationFn: () =>
      updateGroup(id!, {
        jiraBaseUrl: jiraBaseUrl.trim() || undefined,
        jiraProjectKey: jiraProjectKey.trim() || undefined,
        githubRepos: githubRepos.map((r) => r.trim()).filter(Boolean),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['group', id], updated);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSaveSuccessMsg('Đã lưu cấu hình nhóm thành công!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
  });

  const invalidateAllSyncQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['group', id] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['sync-logs', id] });
    queryClient.invalidateQueries({ queryKey: ['group-issues', id] });
    queryClient.invalidateQueries({ queryKey: ['group-commits', id] });
    queryClient.invalidateQueries({ queryKey: ['group-prs', id] });
    queryClient.invalidateQueries({ queryKey: ['group-activity', id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Mutation: Đồng bộ toàn bộ (Jira + GitHub)
  const syncAllMutation = useMutation({
    mutationFn: () => syncGroup(id!),
    onSuccess: (res) => {
      invalidateAllSyncQueries();
      setSyncFeedback({ type: 'ALL', result: res });
    },
    onError: (err: any) => {
      setSyncFeedback({ type: 'ALL', error: err?.message || 'Đồng bộ thất bại' });
    },
  });

  // Mutation: Đồng bộ Jira Only
  const syncJiraMutation = useMutation({
    mutationFn: () => syncJiraOnly(id!),
    onSuccess: (res) => {
      invalidateAllSyncQueries();
      setSyncFeedback({ type: 'JIRA', result: res });
    },
    onError: (err: any) => {
      setSyncFeedback({ type: 'JIRA', error: err?.message || 'Đồng bộ Jira thất bại' });
    },
  });

  // Mutation: Đồng bộ GitHub Only
  const syncGithubMutation = useMutation({
    mutationFn: () => syncGithubOnly(id!),
    onSuccess: (res) => {
      invalidateAllSyncQueries();
      setSyncFeedback({ type: 'GITHUB', result: res });
    },
    onError: (err: any) => {
      setSyncFeedback({ type: 'GITHUB', error: err?.message || 'Đồng bộ GitHub thất bại' });
    },
  });

  // Mutation: Test Jira
  const testJiraMutation = useMutation({
    mutationFn: () => testJira(id!),
    onSuccess: (res) => {
      setJiraTestResult(res);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // Mutation: Test GitHub
  const testGithubMutation = useMutation({
    mutationFn: () => testGithub(id!),
    onSuccess: (res) => {
      setGithubTestResult(res);
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const isAnySyncPending =
    syncAllMutation.isPending || syncJiraMutation.isPending || syncGithubMutation.isPending;

  const handleAddRepo = () => {
    setGithubRepos([...githubRepos, '']);
  };

  const handleRemoveRepo = (index: number) => {
    const updated = githubRepos.filter((_, i) => i !== index);
    setGithubRepos(updated.length > 0 ? updated : ['']);
  };

  const handleRepoChange = (index: number, val: string) => {
    const updated = [...githubRepos];
    updated[index] = val;
    setGithubRepos(updated);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(null);
    saveMutation.mutate();
  };

  const handleCopyCode = () => {
    if (!group?.code) return;
    navigator.clipboard.writeText(group.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Chưa ghi nhận';
    try {
      return new Date(dateStr).toLocaleString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (startStr: string, finishStr: string | null) => {
    if (!finishStr) return 'Đang xử lý...';
    try {
      const diff = new Date(finishStr).getTime() - new Date(startStr).getTime();
      if (diff < 1000) return `${diff}ms`;
      return `${(diff / 1000).toFixed(1)}s`;
    } catch {
      return '—';
    }
  };

  // Danh sách các Sprint duy nhất từ Jira issues (US-17)
  const sprintList = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((it) => {
      if (it.sprint && it.sprint.trim()) set.add(it.sprint.trim());
    });
    return Array.from(set);
  }, [issues]);

  // Tự động chọn Sprint đầu tiên nếu có
  useEffect(() => {
    if (sprintList.length > 0 && selectedSprint === 'ALL') {
      setSelectedSprint(sprintList[0]);
    }
  }, [sprintList, selectedSprint]);

  // Thống kê chi tiết Sprint hiện tại (US-17, US-18)
  const sprintStats = useMemo(() => {
    const targetIssues =
      selectedSprint === 'ALL'
        ? issues
        : issues.filter((it) => it.sprint?.trim() === selectedSprint);

    let done = 0;
    let inProgress = 0;
    let blocked = 0;
    let todo = 0;
    let stale = 0;
    const twoDaysAgo = Date.now() - 2 * 24 * 3600 * 1000;

    targetIssues.forEach((it) => {
      const st = (it.status || '').toLowerCase();
      const isDone = st.includes('done') || st.includes('closed') || st.includes('resolved') || st.includes('hoàn thành');
      const isBlocked = st.includes('blocked') || st.includes('chặn') || st.includes('tắc');
      const isInProgress = !isDone && !isBlocked && (st.includes('progress') || st.includes('review') || st.includes('đang làm'));

      if (isDone) done++;
      else if (isBlocked) blocked++;
      else if (isInProgress) inProgress++;
      else todo++;

      // Stale issue: Chưa xong và hơn 2 ngày không cập nhật (US-18)
      if (!isDone && it.updatedAt) {
        const updatedTime = new Date(it.updatedAt).getTime();
        if (updatedTime < twoDaysAgo) {
          stale++;
        }
      }
    });

    const total = targetIssues.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, inProgress, blocked, todo, stale, completionRate };
  }, [issues, selectedSprint]);

  // Filtered issues có hỗ trợ lọc theo Sprint và Stale Issue
  const filteredIssues = useMemo(() => {
    const twoDaysAgo = Date.now() - 2 * 24 * 3600 * 1000;
    return issues.filter((it: JiraIssue) => {
      if (selectedSprint !== 'ALL' && it.sprint?.trim() !== selectedSprint) {
        return false;
      }

      const st = (it.status || '').toLowerCase();
      const isDone = st.includes('done') || st.includes('closed') || st.includes('resolved') || st.includes('hoàn thành');
      const isBlocked = st.includes('blocked') || st.includes('chặn') || st.includes('tắc');
      const isInProgress = !isDone && !isBlocked && (st.includes('progress') || st.includes('review') || st.includes('đang làm'));
      const isTodo = !isDone && !isBlocked && !isInProgress;

      if (onlyStaleFilter) {
        if (isDone || !it.updatedAt || new Date(it.updatedAt).getTime() >= twoDaysAgo) {
          return false;
        }
      }

      const query = issueSearch.toLowerCase().trim();
      const matchSearch =
        !query ||
        it.issueKey.toLowerCase().includes(query) ||
        it.summary.toLowerCase().includes(query) ||
        (it.sprint && it.sprint.toLowerCase().includes(query));

      if (!matchSearch) return false;

      if (issueStatusFilter === 'ALL') return true;
      if (issueStatusFilter === 'DONE') return isDone;
      if (issueStatusFilter === 'IN_PROGRESS') return isInProgress;
      if (issueStatusFilter === 'TODO') return isTodo;
      return true;
    });
  }, [issues, issueSearch, issueStatusFilter, selectedSprint, onlyStaleFilter]);

  // Issue status counters cho toàn bộ issues
  const issueStats = useMemo(() => {
    let done = 0;
    let inProgress = 0;
    let todo = 0;
    issues.forEach((it) => {
      const st = (it.status || '').toLowerCase();
      if (st.includes('done') || st.includes('closed') || st.includes('resolved')) done++;
      else if (st.includes('progress') || st.includes('review')) inProgress++;
      else todo++;
    });
    return { done, inProgress, todo, total: issues.length };
  }, [issues]);

  const filteredLogs = useMemo(() => {
    return syncLogs.filter((log) => {
      if (sourceFilter === 'ALL') return true;
      return log.source === sourceFilter;
    });
  }, [syncLogs, sourceFilter]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-6 bg-slate-200/70 rounded-lg w-48 animate-pulse"></div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-100 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
            </div>
          </div>
          <div className="h-32 bg-slate-50/70 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Không tìm thấy thông tin nhóm thực tập</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          {error instanceof Error ? error.message : 'ID nhóm không hợp lệ hoặc dữ liệu nhóm này đã bị gỡ khỏi hệ thống.'}
        </p>
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-sm transition active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Quay lại danh sách nhóm</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition group"
        >
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-300 shadow-2xs">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span>Quay lại danh sách nhóm</span>
        </Link>

        {/* Quick status summary */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Trạng thái đồng bộ:</span>
          <SyncBadge status={group.syncStatus} />
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              {group.code.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || 'NH'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{group.name}</h1>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/70 border border-slate-200 font-mono text-xs font-bold text-slate-700 transition"
                  title="Nhấn để copy mã nhóm"
                >
                  <span>{group.code}</span>
                  {copiedCode ? (
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Quy mô: <strong className="font-bold text-slate-700">{group.memberCount} sinh viên</strong>
                </span>
                <span>•</span>
                <span>Khởi tạo: {formatDate(group.createdAt)}</span>
              </div>

              {/* Direct links */}
              <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                {group.jiraProjectKey && (
                  <a
                    href={`https://cg-ictu.atlassian.net/jira/software/projects/${group.jiraProjectKey}/boards`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-xs font-semibold border border-blue-200/80 transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zM2.82 10.7c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.82z" />
                    </svg>
                    <span>Jira Board: {group.jiraProjectKey}</span>
                    <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {group.repositories && group.repositories.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {group.repositories.map((repo, i) => (
                      <a
                        key={i}
                        href={repo.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold border border-slate-200 transition"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          />
                        </svg>
                        <span>{repo.repoUrl.replace(/^https?:\/\/github\.com\//i, '')}</span>
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Operations Multi-Button */}
          <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
            {isIntern ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold shadow-xs">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Chế độ Thực tập sinh (Chỉ xem)</span>
              </div>
            ) : (
              <div className="inline-flex rounded-xl shadow-sm border border-slate-900 overflow-hidden bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => syncAllMutation.mutate()}
                  disabled={isAnySyncPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition active:scale-95 disabled:opacity-50"
                  title="Đồng bộ cả Jira và GitHub ngay bây giờ"
                >
                  <svg
                    className={`w-4 h-4 ${syncAllMutation.isPending ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>{syncAllMutation.isPending ? 'Đang đồng bộ tất cả...' : 'Đồng bộ toàn bộ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => syncJiraMutation.mutate()}
                  disabled={isAnySyncPending || !group.jiraProjectKey}
                  className="px-2.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border-l border-slate-800 transition disabled:opacity-40"
                  title="Chỉ đồng bộ Jira issues"
                >
                  {syncJiraMutation.isPending ? '...' : 'Jira'}
                </button>

                <button
                  type="button"
                  onClick={() => syncGithubMutation.mutate()}
                  disabled={isAnySyncPending || !group.repositories?.length}
                  className="px-2.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border-l border-slate-800 transition disabled:opacity-40"
                  title="Chỉ đồng bộ GitHub commits & PRs"
                >
                  {syncGithubMutation.isPending ? '...' : 'GitHub'}
                </button>
              </div>
            )}

            <span className="text-[11px] text-slate-400 text-center md:text-right">
              {group.lastSyncAt ? `Đồng bộ lần cuối: ${formatDate(group.lastSyncAt)}` : 'Chưa từng đồng bộ'}
            </span>
          </div>
        </div>

        {/* 4 Synced Metrics KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div
            onClick={() => setActiveDataTab('ISSUES')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeDataTab === 'ISSUES'
                ? 'bg-blue-50/60 border-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Jira Issues</span>
              <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zM2.82 10.7c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.82z" />
              </svg>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {issues.length}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">{issueStats.done} đã xong</span>
            </div>
          </div>

          <div
            onClick={() => setActiveDataTab('COMMITS')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeDataTab === 'COMMITS'
                ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-800/10 shadow-xs'
                : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Commits</span>
              <svg className="w-3.5 h-3.5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {commits.length}
              </span>
              <span className="text-[11px] text-slate-400">bản ghi</span>
            </div>
          </div>

          <div
            onClick={() => setActiveDataTab('PRS')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeDataTab === 'PRS'
                ? 'bg-indigo-50/60 border-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Pull Requests</span>
              <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {pullRequests.length}
              </span>
              <span className="text-[11px] text-slate-400">PRs</span>
            </div>
          </div>

          <div
            onClick={() => setActiveDataTab('LOGS')}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              activeDataTab === 'LOGS'
                ? 'bg-amber-50/60 border-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Nhật ký Sync</span>
              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {syncLogs.length}
              </span>
              <span className="text-[11px] text-slate-400">phiên</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Feedback Result Banner */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-xs border ${
          syncFeedback.error
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              syncFeedback.error ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {syncFeedback.error ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-bold text-sm">
                {syncFeedback.error ? 'Đồng bộ gặp lỗi' : 'Đồng bộ hoàn tất thành công!'}
              </p>
              <div className="text-[11px] opacity-90 mt-0.5 flex items-center gap-3 flex-wrap">
                {syncFeedback.error && <span>{syncFeedback.error}</span>}
                {syncFeedback.result && 'jira' in syncFeedback.result && (
                  <>
                    <span>Jira: <strong>{syncFeedback.result.jira?.processed ?? 0} issues</strong></span>
                    <span>•</span>
                    <span>GitHub: <strong>{syncFeedback.result.github?.processed ?? 0} records</strong></span>
                    <span>•</span>
                    <span>Trạng thái: <strong>{syncFeedback.result.overallStatus}</strong></span>
                  </>
                )}
                {syncFeedback.result && 'processed' in syncFeedback.result && (
                  <span>Đã xử lý: <strong>{syncFeedback.result.processed} bản ghi</strong></span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="p-1 hover:opacity-75 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSaveSubmit} className="space-y-6">
        {/* Section 1: Jira Cloud */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zM2.82 10.7c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.82z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Cấu hình Jira Cloud</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý issues, sprint backlog và tiến độ công việc trên Atlassian Jira
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <ConnectionBadge status={group.jiraConnectionStatus} />
              <button
                type="button"
                onClick={() => testJiraMutation.mutate()}
                disabled={testJiraMutation.isPending || !jiraProjectKey.trim()}
                className="px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
              >
                {testJiraMutation.isPending && (
                  <svg className="animate-spin h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                <span>Test kết nối Jira</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jira Base URL <span className="text-slate-400 font-normal">(tùy chọn)</span>
              </label>
              <input
                type="text"
                value={jiraBaseUrl}
                onChange={(e) => setJiraBaseUrl(e.target.value)}
                placeholder="https://cg-ictu.atlassian.net"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mã dự án Jira (Project Key)
              </label>
              <input
                type="text"
                value={jiraProjectKey}
                onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                placeholder="VD: ITS, CRM, PROJ1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono uppercase"
              />
            </div>
          </div>

          {/* Test Jira Result Box */}
          {jiraTestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                jiraTestResult.ok
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/60 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {jiraTestResult.ok ? '✓ Kết nối Jira thành công:' : '✕ Lỗi kết nối Jira:'}
                </span>
                <span>{jiraTestResult.ok ? jiraTestResult.projectName : jiraTestResult.error}</span>
              </div>
            </div>
          )}

          {group.jiraLastTestedAt && (
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Lần kiểm tra gần nhất: {formatDate(group.jiraLastTestedAt)}</span>
              {group.jiraErrorMessage && (
                <span className="text-rose-500 font-medium">Lỗi: {group.jiraErrorMessage}</span>
              )}
            </div>
          )}
        </div>

        {/* Section 2: GitHub Repositories */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200 shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Cấu hình kho mã nguồn GitHub</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi hoạt động commits, pull requests và đóng góp mã nguồn của sinh viên
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <ConnectionBadge status={group.githubConnectionStatus} />
              <button
                type="button"
                onClick={() => testGithubMutation.mutate()}
                disabled={
                  testGithubMutation.isPending ||
                  githubRepos.filter((r) => r.trim()).length === 0
                }
                className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
              >
                {testGithubMutation.isPending && (
                  <svg className="animate-spin h-3.5 w-3.5 text-slate-700" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                <span>Test kết nối GitHub</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {githubRepos.map((repo, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={repo}
                    onChange={(e) => handleRepoChange(idx, e.target.value)}
                    placeholder="https://github.com/organization/repo-name"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300/80 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRepo(idx)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
                  title="Xóa repository này"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddRepo}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 py-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Thêm kho lưu trữ (Repository)</span>
            </button>
          </div>

          {/* Test GitHub Result Box */}
          {githubTestResult && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kết quả kiểm tra ({githubTestResult.results.length} kho lưu trữ):
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                {githubTestResult.results.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3 text-xs flex items-center justify-between ${
                      r.ok ? 'bg-emerald-50/40' : 'bg-rose-50/40'
                    }`}
                  >
                    <span className="font-mono text-slate-800 truncate max-w-md">{r.repoUrl}</span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
                        r.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.ok ? '✓ Hợp lệ' : r.error || 'Lỗi kết nối'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {group.githubLastTestedAt && (
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Lần kiểm tra gần nhất: {formatDate(group.githubLastTestedAt)}</span>
              {group.githubErrorMessage && (
                <span className="text-rose-500 font-medium">Lỗi gần nhất: {group.githubErrorMessage}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          <Link
            to="/groups"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            Quay lại danh sách
          </Link>

          {isIntern ? (
            <span className="text-xs text-amber-800 bg-amber-50 px-3.5 py-1.5 rounded-lg border border-amber-200 font-medium">
              Tài khoản thực tập sinh chỉ có quyền đọc (Read-only)
            </span>
          ) : (
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
            >
              {saveMutation.isPending && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              <span>{saveMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
            </button>
          )}
        </div>
      </form>

      {/* Synced Data Explorer with Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Khám phá Dữ liệu Đồng bộ</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xem chi tiết toàn bộ Jira tasks, Git commits, PRs và lịch sử đồng bộ đã kéo về cơ sở dữ liệu
            </p>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveDataTab('DAILY_ACTIVITY')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeDataTab === 'DAILY_ACTIVITY' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Hoạt động theo ngày</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeDataTab === 'DAILY_ACTIVITY' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {activityDate.slice(5)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDataTab('ISSUES')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeDataTab === 'ISSUES' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>Jira Issues</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeDataTab === 'ISSUES' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {issues.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDataTab('COMMITS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeDataTab === 'COMMITS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>Commits</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeDataTab === 'COMMITS' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {commits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDataTab('PRS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeDataTab === 'PRS' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>Pull Requests</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeDataTab === 'PRS' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {pullRequests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDataTab('LOGS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeDataTab === 'LOGS' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <span>Sync Logs</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeDataTab === 'LOGS' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {syncLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDataTab('MEMBERS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeDataTab === 'MEMBERS' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Thành viên nhóm</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                US-21
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeDataTab === 'MEMBERS' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {members.length > 0 ? members.length : (group?.memberCount || 10)}
              </span>
            </button>
          </div>
        </div>

        {/* TAB CONTENT 0: HOẠT ĐỘNG THEO NGÀY (US-14, US-15, US-16) */}
        {activeDataTab === 'DAILY_ACTIVITY' && (
          <div className="space-y-6">
            {/* Top Toolbar: Date Picker + Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ngày theo dõi:
                </span>
                <DatePicker value={activityDate} onChange={handleDateChange} />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => computeMetricMutation.mutate()}
                  disabled={computeMetricMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition disabled:opacity-50"
                  title="Tính toán lại số liệu cho ngày này từ dữ liệu Jira và GitHub hiện có"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${computeMetricMutation.isPending ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>{computeMetricMutation.isPending ? 'Đang tính...' : 'Tính lại metric ngày'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => refetchActivity()}
                  disabled={isFetchingActivity}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition border border-transparent hover:border-slate-300"
                  title="Làm mới hoạt động ngày"
                >
                  <svg className={`w-4 h-4 ${isFetchingActivity ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isLoadingActivity ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <svg className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang tải dữ liệu hoạt động ngày {activityDate}...
              </div>
            ) : (
              <>
                {/* 6 Metric KPI Cards cho ngày được chọn */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Task Done */}
                  <div className="bg-blue-50/60 border border-blue-200/70 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Task Done</div>
                    <div className="text-2xl font-black text-blue-900 mt-1 font-mono">
                      {activityData?.metric?.taskDone ?? activityData?.jiraDone.filter((t) => t.issueType.toLowerCase() !== 'subtask').length ?? 0}
                    </div>
                    <div className="text-[10px] text-blue-600 mt-0.5">Jira task hoàn thành</div>
                  </div>

                  {/* Subtask Done */}
                  <div className="bg-sky-50/60 border border-sky-200/70 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Subtask Done</div>
                    <div className="text-2xl font-black text-sky-900 mt-1 font-mono">
                      {activityData?.metric?.subtaskDone ?? activityData?.jiraDone.filter((t) => t.issueType.toLowerCase() === 'subtask').length ?? 0}
                    </div>
                    <div className="text-[10px] text-sky-600 mt-0.5">Jira subtask hoàn thành</div>
                  </div>

                  {/* Commits */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Commits</div>
                    <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                      {activityData?.metric?.commitCount ?? activityData?.commits.length ?? 0}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Commit mã nguồn</div>
                  </div>

                  {/* PR Created */}
                  <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">PR Created</div>
                    <div className="text-2xl font-black text-indigo-900 mt-1 font-mono">
                      {activityData?.metric?.prCreated ?? activityData?.prsCreated.length ?? 0}
                    </div>
                    <div className="text-[10px] text-indigo-600 mt-0.5">Tạo mới trong ngày</div>
                  </div>

                  {/* PR Merged */}
                  <div className="bg-purple-50/60 border border-purple-200/70 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">PR Merged</div>
                    <div className="text-2xl font-black text-purple-900 mt-1 font-mono">
                      {activityData?.metric?.prMerged ?? activityData?.prsMerged.length ?? 0}
                    </div>
                    <div className="text-[10px] text-purple-600 mt-0.5">Merge thành công</div>
                  </div>

                  {/* Blocked */}
                  <div className="bg-rose-50/60 border border-rose-200/70 rounded-2xl p-3.5">
                    <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Blocked</div>
                    <div className="text-2xl font-black text-rose-900 mt-1 font-mono">
                      {activityData?.metric?.blocked ?? 0}
                    </div>
                    <div className="text-[10px] text-rose-600 mt-0.5">Issue bị tắc nghẽn</div>
                  </div>
                </div>

                {/* Section 1: US-15 - Task / Subtask hoàn thành trong ngày */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Jira Task / Subtask hoàn thành trong ngày (US-15)
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                        {activityData?.jiraDone.length || 0} issues
                      </span>
                    </div>
                  </div>

                  {!activityData?.jiraDone || activityData.jiraDone.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Không ghi nhận Jira Task hoặc Subtask nào chuyển sang trạng thái Done trong ngày {activityDate}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-2.5">Key</th>
                            <th className="px-4 py-2.5">Loại</th>
                            <th className="px-4 py-2.5">Tóm tắt công việc</th>
                            <th className="px-4 py-2.5">Chuyển trạng thái</th>
                            <th className="px-4 py-2.5">Hoàn thành lúc</th>
                            <th className="px-4 py-2.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activityData.jiraDone.map((issue) => (
                            <tr key={issue.issueKey} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                                <a href={issue.url} target="_blank" rel="noreferrer" className="hover:underline">
                                  {issue.issueKey}
                                </a>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  issue.issueType.toLowerCase() === 'subtask'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {issue.issueType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-medium max-w-md">
                                <div className="line-clamp-2">{issue.summary}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-mono">
                                  <span>{issue.fromStatus || 'Open'}</span>
                                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {issue.toStatus}
                                  </span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                                {formatDate(issue.completedAt)}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <a
                                  href={issue.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <span>Mở Jira</span>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 2: US-16 AC1 - Commits trong ngày */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        GitHub Commits trong ngày (US-16)
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-200 text-slate-800 rounded-full font-bold">
                        {activityData?.commits.length || 0} commits
                      </span>
                    </div>
                  </div>

                  {!activityData?.commits || activityData.commits.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Không có commit nào được đẩy lên repository trong ngày {activityDate}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-2.5">SHA</th>
                            <th className="px-4 py-2.5">Commit Message</th>
                            <th className="px-4 py-2.5">Tác giả</th>
                            <th className="px-4 py-2.5">Thời gian</th>
                            <th className="px-4 py-2.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activityData.commits.map((c) => (
                            <tr key={c.sha} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                                <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                  {c.shortSha}
                                </a>
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-medium max-w-lg">
                                <div className="line-clamp-2">{c.message}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center uppercase">
                                    {(c.author || 'U')[0]}
                                  </span>
                                  <span>{c.author || 'Unknown'}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                                {formatDate(c.committedAt)}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                                >
                                  <span>Xem Git</span>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 3: US-16 AC2, AC3 - Pull Requests trong ngày */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        GitHub Pull Requests trong ngày (US-16)
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] font-mono">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                          {activityData?.prsCreated.length || 0} tạo mới
                        </span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold">
                          {activityData?.prsMerged.length || 0} đã merge
                        </span>
                      </div>
                    </div>
                  </div>

                  {(!activityData?.prsCreated || activityData.prsCreated.length === 0) &&
                   (!activityData?.prsMerged || activityData.prsMerged.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Không có Pull Request nào được tạo hoặc merge trong ngày {activityDate}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-2.5">PR #</th>
                            <th className="px-4 py-2.5">Tiêu đề Pull Request</th>
                            <th className="px-4 py-2.5">Phân loại</th>
                            <th className="px-4 py-2.5">Trạng thái</th>
                            <th className="px-4 py-2.5">Thời điểm</th>
                            <th className="px-4 py-2.5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activityData?.prsCreated.map((pr) => (
                            <tr key={`created-${pr.number}`} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3 font-mono font-bold text-indigo-600 whitespace-nowrap">
                                <a href={pr.url} target="_blank" rel="noreferrer" className="hover:underline">
                                  #{pr.number}
                                </a>
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-medium max-w-lg">
                                <div className="line-clamp-2">{pr.title}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Tạo trong ngày
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  pr.mergedAt ? 'bg-purple-100 text-purple-800' : pr.state === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {pr.mergedAt ? 'MERGED' : pr.state.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                                {formatDate(pr.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <a
                                  href={pr.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                  <span>Mở PR</span>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </td>
                            </tr>
                          ))}

                          {activityData?.prsMerged
                            .filter((m) => !activityData?.prsCreated.some((c) => c.number === m.number))
                            .map((pr) => (
                              <tr key={`merged-${pr.number}`} className="hover:bg-slate-50/60 transition">
                                <td className="px-4 py-3 font-mono font-bold text-purple-600 whitespace-nowrap">
                                  <a href={pr.url} target="_blank" rel="noreferrer" className="hover:underline">
                                    #{pr.number}
                                  </a>
                                </td>
                                <td className="px-4 py-3 text-slate-800 font-medium max-w-lg">
                                  <div className="line-clamp-2">{pr.title}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    Merge trong ngày
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                    MERGED
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                                  {pr.mergedAt ? formatDate(pr.mergedAt) : '—'}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <a
                                    href={pr.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline"
                                  >
                                    <span>Mở PR</span>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 4: US-19 - Timeline trực quan hoạt động của nhóm trong ngày */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <span>Dòng thời gian hoạt động trong ngày (Activity Timeline)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold">
                          US-19
                        </span>
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      {timelineEvents.length} sự kiện
                    </span>
                  </div>

                  {timelineEvents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Chưa ghi nhận sự kiện hoạt động nào từ Jira hay GitHub trong ngày {activityDate}.
                    </div>
                  ) : (
                    <div className="p-4 sm:p-6">
                      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                        {timelineEvents.map((evt) => (
                          <div key={evt.id} className="relative group">
                            {/* Dot on timeline */}
                            <div
                              className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                                evt.source === 'JIRA' ? 'bg-blue-600' : 'bg-slate-900'
                              }`}
                            />

                            <div className="bg-slate-50 hover:bg-slate-100/80 transition rounded-xl p-3.5 border border-slate-200/70 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono ${
                                      evt.source === 'JIRA'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-800 text-white'
                                    }`}
                                  >
                                    {evt.badge}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 line-clamp-1">
                                    {evt.title}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono font-medium text-slate-500 shrink-0">
                                  {formatDate(evt.time)}
                                </span>
                              </div>

                              {evt.subtitle && (
                                <p className="text-xs text-slate-600 font-medium">
                                  {evt.subtitle}
                                </p>
                              )}

                              {evt.url && (
                                <div className="pt-1">
                                  <a
                                    href={evt.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                  >
                                    <span>Xem chi tiết trên {evt.source === 'JIRA' ? 'Jira' : 'GitHub'}</span>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB CONTENT 1: JIRA ISSUES */}
        {activeDataTab === 'ISSUES' && (
          <div className="space-y-4">
            {/* Widget Tổng quan Sprint (US-17) & Cảnh báo Stale Issues (US-18) */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    SP
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Tổng quan Sprint Backlog</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                        US-17
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Theo dõi tiến độ, số lượng issue và tỷ lệ hoàn thành theo từng Sprint
                    </p>
                  </div>
                </div>

                {/* Sprint Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Sprint:</label>
                  <select
                    value={selectedSprint}
                    onChange={(e) => setSelectedSprint(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="ALL">Toàn bộ Issues ({issues.length})</option>
                    {sprintList.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress Bar & KPI Numbers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {selectedSprint === 'ALL' ? 'Toàn bộ dự án' : selectedSprint}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-mono font-semibold">
                      {sprintStats.done}/{sprintStats.total} hoàn thành
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                    {sprintStats.completionRate}% Done
                  </span>
                </div>

                {/* Multi-segment Progress Bar */}
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                  {sprintStats.total > 0 ? (
                    <>
                      <div
                        style={{ width: `${(sprintStats.done / sprintStats.total) * 100}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={`Done: ${sprintStats.done} issues`}
                      />
                      <div
                        style={{ width: `${(sprintStats.inProgress / sprintStats.total) * 100}%` }}
                        className="bg-amber-400 transition-all duration-500"
                        title={`In Progress: ${sprintStats.inProgress} issues`}
                      />
                      <div
                        style={{ width: `${(sprintStats.blocked / sprintStats.total) * 100}%` }}
                        className="bg-rose-500 transition-all duration-500"
                        title={`Blocked: ${sprintStats.blocked} issues`}
                      />
                      <div
                        style={{ width: `${(sprintStats.todo / sprintStats.total) * 100}%` }}
                        className="bg-slate-300 transition-all duration-500"
                        title={`To Do: ${sprintStats.todo} issues`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-200" />
                  )}
                </div>
              </div>

              {/* 4 Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIssueStatusFilter(issueStatusFilter === 'DONE' ? 'ALL' : 'DONE');
                    setOnlyStaleFilter(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    issueStatusFilter === 'DONE' && !onlyStaleFilter
                      ? 'bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-400'
                      : 'bg-white border-slate-200/80 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Done</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">{sprintStats.done}</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIssueStatusFilter(issueStatusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS');
                    setOnlyStaleFilter(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    issueStatusFilter === 'IN_PROGRESS' && !onlyStaleFilter
                      ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400'
                      : 'bg-white border-slate-200/80 hover:bg-amber-50/40'
                  }`}
                >
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>In Progress</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">{sprintStats.inProgress}</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIssueStatusFilter('ALL');
                    setOnlyStaleFilter(false);
                  }}
                  className="p-2.5 rounded-xl border text-left bg-white border-slate-200/80 hover:bg-rose-50/40 transition"
                >
                  <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Blocked</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">{sprintStats.blocked}</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIssueStatusFilter(issueStatusFilter === 'TODO' ? 'ALL' : 'TODO');
                    setOnlyStaleFilter(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    issueStatusFilter === 'TODO' && !onlyStaleFilter
                      ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-400'
                      : 'bg-white border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>To Do</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">{sprintStats.todo}</div>
                </button>
              </div>

              {/* Cảnh báo Stale Issues (US-18) */}
              {sprintStats.stale > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-xs text-amber-800 gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      Phát hiện <strong>{sprintStats.stale} issue</strong> chưa hoàn thành và không có cập nhật trong hơn 2 ngày qua (Stale Issues).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyStaleFilter(!onlyStaleFilter)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition shrink-0 ${
                      onlyStaleFilter
                        ? 'bg-amber-700 text-white'
                        : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {onlyStaleFilter ? 'Đang lọc Stale' : 'Lọc Stale Issues'}
                  </button>
                </div>
              )}
            </div>
            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  placeholder="Tìm task theo mã (ITS-1), tên..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIssueStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    issueStatusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({issues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueStatusFilter('DONE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    issueStatusFilter === 'DONE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Done ({issueStats.done})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueStatusFilter('IN_PROGRESS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    issueStatusFilter === 'IN_PROGRESS' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  In Progress ({issueStats.inProgress})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueStatusFilter('TODO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    issueStatusFilter === 'TODO' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  To Do ({issueStats.todo})
                </button>

                <button
                  type="button"
                  onClick={() => refetchIssues()}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                  title="Làm mới danh sách Jira issues"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {isLoadingIssues ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách Jira issues...</div>
            ) : filteredIssues.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V2h-10.48zm-4.35 4.35c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V6.35H7.18zM2.82 10.7c0 2.4 1.97 4.35 4.35 4.35h1.78v1.74c0 2.4 1.97 4.35 4.35 4.35V10.7H2.82z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-700">Chưa có Jira issues nào được đồng bộ</p>
                <p className="text-[11px] text-slate-400">
                  Nhấn nút <strong>"Đồng bộ toàn bộ"</strong> hoặc <strong>"Jira"</strong> ở trên để kéo dữ liệu từ Jira Cloud.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Mã Task</th>
                      <th className="px-4 py-3">Loại</th>
                      <th className="px-4 py-3">Tóm tắt nội dung</th>
                      <th className="px-4 py-3">Sprint</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Changelog</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredIssues.map((it: JiraIssue) => {
                      const isExpanded = expandedIssueId === it.id;
                      const hasTransitions = it.transitions && it.transitions.length > 0;
                      return (
                        <tr key={it.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                            <a
                              href={it.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                              title="Mở issue trên Jira Cloud"
                            >
                              <span>{it.issueKey}</span>
                              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {it.issueType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium max-w-md">
                            <div className="line-clamp-2">{it.summary}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {it.sprint || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              (it.status || '').toLowerCase().includes('done')
                                ? 'bg-emerald-100 text-emerald-800'
                                : (it.status || '').toLowerCase().includes('progress')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {it.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {hasTransitions ? (
                              <button
                                type="button"
                                onClick={() => setExpandedIssueId(isExpanded ? null : it.id)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{it.transitions?.length} lượt chuyển</span>
                                <svg
                                  className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Chưa chuyển</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal / Panel for Expanded Transitions */}
            {expandedIssueId && (
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Lịch sử chuyển trạng thái (Jira Changelog Transitions)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setExpandedIssueId(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-900 font-bold"
                  >
                    Đóng
                  </button>
                </div>
                <div className="space-y-2">
                  {issues
                    .find((it) => it.id === expandedIssueId)
                    ?.transitions?.map((tr, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-lg border border-indigo-100/80 text-xs flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                            {tr.fromStatus || 'Khởi tạo'}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                            {tr.toStatus}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {formatDate(tr.changedAt)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 2: GITHUB COMMITS */}
        {activeDataTab === 'COMMITS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Tổng cộng <strong className="text-slate-800 font-bold">{commits.length}</strong> commits từ kho GitHub
              </span>
              <button
                type="button"
                onClick={() => refetchCommits()}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                title="Làm mới danh sách commits"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {isLoadingCommits ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách Commits...</div>
            ) : commits.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-700">Chưa có Commits nào được đồng bộ</p>
                <p className="text-[11px] text-slate-400">
                  Nhấn nút <strong>"Đồng bộ toàn bộ"</strong> hoặc <strong>"GitHub"</strong> ở trên để nạp commits.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Mã SHA</th>
                      <th className="px-4 py-3">Nội dung commit</th>
                      <th className="px-4 py-3">Tác giả</th>
                      <th className="px-4 py-3">Thời gian commit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {commits.map((c: GithubCommit) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                          >
                            {c.sha.slice(0, 7)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium max-w-lg">
                          <div className="line-clamp-2">{c.message}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium">
                          {c.author || 'Ẩn danh'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {formatDate(c.committedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 3: PULL REQUESTS */}
        {activeDataTab === 'PRS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Tổng cộng <strong className="text-slate-800 font-bold">{pullRequests.length}</strong> Pull Requests
              </span>
              <button
                type="button"
                onClick={() => refetchPRs()}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                title="Làm mới Pull Requests"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            {isLoadingPRs ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách Pull Requests...</div>
            ) : pullRequests.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-700">Chưa có Pull Requests nào</p>
                <p className="text-[11px] text-slate-400">
                  Kho lưu trữ hiện tại chưa tạo PR hoặc chưa có PR nào được đồng bộ về DB.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Số PR</th>
                      <th className="px-4 py-3">Tiêu đề PR</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ngày tạo</th>
                      <th className="px-4 py-3">Ngày Merge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pullRequests.map((pr: GithubPullRequest) => (
                      <tr key={pr.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold"
                          >
                            #{pr.number}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium max-w-lg">
                          <div className="line-clamp-2">{pr.title}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              pr.mergedAt
                                ? 'bg-purple-100 text-purple-800'
                                : pr.state === 'open'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {pr.mergedAt ? 'MERGED' : pr.state.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {formatDate(pr.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {pr.mergedAt ? formatDate(pr.mergedAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 4: SYNC LOGS */}
        {activeDataTab === 'LOGS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setSourceFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    sourceFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  Tất cả ({syncLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFilter('JIRA')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    sourceFilter === 'JIRA' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  Jira
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFilter('GITHUB')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    sourceFilter === 'GITHUB' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  GitHub
                </button>
              </div>

              <button
                type="button"
                onClick={() => refetchLogs()}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                title="Làm mới lịch sử"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch sử đồng bộ...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-700">Chưa có nhật ký đồng bộ nào</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Nhấn nút <strong>"Đồng bộ toàn bộ"</strong> ở trên để tiến hành đồng bộ dữ liệu.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Nguồn</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Số bản ghi</th>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Thời lượng</th>
                      <th className="px-4 py-3">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                              log.source === 'JIRA'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {log.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <SyncBadge status={log.status} />
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {log.recordsProcessed} bản ghi
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(log.startedAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {formatDuration(log.startedAt, log.finishedAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.errorMessage || 'Hoàn tất không lỗi'}>
                          {log.errorMessage ? (
                            <span className="text-rose-600 font-semibold">{log.errorMessage}</span>
                          ) : (
                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Thành công</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 5: THÀNH VIÊN NHÓM (US-21) */}
        {activeDataTab === 'MEMBERS' && (
          <div className="space-y-4">
            {/* Header / KPI card */}
            <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    SV
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Danh sách thành viên nhóm sinh viên</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                        US-21
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Hiển thị danh sách 10 thành viên của nhóm để Mentor đối chiếu thông tin quản lý (mã SV, họ tên, vai trò)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {members.length < 10 && !isIntern && (
                    <button
                      type="button"
                      onClick={() => initSampleMembersMutation.mutate()}
                      disabled={initSampleMembersMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition disabled:opacity-50"
                      title="Tự động khởi tạo đủ 10 thành viên sinh viên mẫu cho nhóm"
                    >
                      <svg className={`w-3.5 h-3.5 ${initSampleMembersMutation.isPending ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>{initSampleMembersMutation.isPending ? 'Đang tạo...' : 'Khởi tạo đủ 10 thành viên'}</span>
                    </button>
                  )}

                  {!isIntern && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(null);
                        setMemberForm({
                          memberCode: `${(group?.code || 'GRP').toUpperCase()}${String(members.length + 1).padStart(2, '0')}`,
                          fullName: '',
                          role: members.length === 0 ? 'Nhóm trưởng' : 'Thành viên',
                        });
                        setIsMemberModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-2xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Thêm thành viên</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => refetchMembers()}
                    disabled={isLoadingMembers}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition border border-transparent hover:border-slate-300"
                    title="Làm mới danh sách thành viên"
                  >
                    <svg className={`w-4 h-4 ${isLoadingMembers ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 4 Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng thành viên</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">
                    {members.length} <span className="text-xs font-normal text-slate-400">/ 10 chỉ tiêu</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Nhóm trưởng</div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {members.find((m) => (m.role || '').toLowerCase().includes('trưởng'))?.fullName || 'Chưa chỉ định'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Nhóm thực tập</div>
                  <div className="text-xs font-bold text-blue-800 mt-1 font-mono truncate">
                    {group?.code} - {group?.name}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Tiêu chuẩn AC</div>
                  <div className="text-[11px] font-semibold text-emerald-800 mt-1">
                    Độc lập với Jira/Git
                  </div>
                </div>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Tìm theo mã sinh viên, họ tên, vai trò..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="text-xs text-slate-500 font-semibold">
                Hiển thị <strong>{filteredMembers.length}</strong> / {members.length} thành viên
              </div>
            </div>

            {/* Member Table */}
            {isLoadingMembers ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách thành viên...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-10 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 p-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-800">Chưa có thành viên nào trong danh sách</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Nhóm hiện chưa được nhập danh sách thành viên cụ thể. Bạn có thể nhấn nút <strong>"Khởi tạo đủ 10 thành viên"</strong> để tự động tạo danh sách theo chỉ tiêu.
                </p>
                {!isIntern && (
                  <button
                    type="button"
                    onClick={() => initSampleMembersMutation.mutate()}
                    disabled={initSampleMembersMutation.isPending}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span>Khởi tạo 10 thành viên mẫu ngay</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">STT</th>
                      <th className="px-4 py-3">Mã sinh viên</th>
                      <th className="px-4 py-3">Họ và tên</th>
                      <th className="px-4 py-3">Vai trò</th>
                      <th className="px-4 py-3">Ngày thêm</th>
                      {!isIntern && <th className="px-4 py-3 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredMembers.map((member: GroupMember, idx: number) => {
                      const isLeader = (member.role || '').toLowerCase().includes('trưởng');
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                              {member.memberCode || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isLeader
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {(member.fullName || 'S').slice(0, 1).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900 text-xs">
                                {member.fullName || 'Chưa đặt tên'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isLeader
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {isLeader && (
                                <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                              <span>{member.role || 'Thành viên'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {formatDate(member.createdAt)}
                          </td>
                          {!isIntern && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMember(member);
                                    setMemberForm({
                                      memberCode: member.memberCode || '',
                                      fullName: member.fullName || '',
                                      role: member.role || 'Thành viên',
                                    });
                                    setIsMemberModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Bạn có chắc muốn xóa thành viên ${member.fullName || member.memberCode}?`)) {
                                      deleteMemberMutation.mutate(member.id);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA THÀNH VIÊN (US-21) */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingMember ? 'Chỉnh sửa thông tin thành viên' : 'Thêm thành viên sinh viên mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!memberForm.fullName.trim() || !memberForm.memberCode.trim()) return;
                if (editingMember) {
                  updateMemberMutation.mutate({
                    memberId: editingMember.id,
                    data: memberForm,
                  });
                } else {
                  addMemberMutation.mutate(memberForm);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã sinh viên (MSSV) *</label>
                <input
                  type="text"
                  required
                  value={memberForm.memberCode}
                  onChange={(e) => setMemberForm({ ...memberForm, memberCode: e.target.value })}
                  placeholder="Ví dụ: DTE2001"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
                >
                  <option value="Nhóm trưởng">Nhóm trưởng (Team Leader)</option>
                  <option value="Thành viên">Thành viên (Member)</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="QA / Tester">QA / Tester</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending || updateMemberMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {addMemberMutation.isPending || updateMemberMutation.isPending ? 'Đang lưu...' : 'Lưu thành viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

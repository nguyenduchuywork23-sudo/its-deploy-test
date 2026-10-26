import { api } from './client';
import type { Group, ImportResult } from '../types';

export interface ListGroupsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListGroupsResponse {
  items: Group[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getGroups(params: ListGroupsParams): Promise<ListGroupsResponse> {
  const { data } = await api.get('/groups', { params });
  return data;
}

export async function getGroup(id: string): Promise<Group> {
  const { data } = await api.get(`/groups/${id}`);
  return data;
}

export async function importGroups(file: File): Promise<ImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/groups/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateGroup(
  id: string,
  payload: { jiraProjectKey?: string; jiraBaseUrl?: string; githubRepos?: string[]; mentorId?: string | null },
): Promise<Group> {
  const { data } = await api.patch(`/groups/${id}`, payload);
  return data;
}

export async function getMentors(): Promise<{ id: string; email: string; fullName: string | null; role: string }[]> {
  const { data } = await api.get('/groups/mentors/list');
  return data;
}

export async function testJira(id: string) {
  const { data } = await api.post(`/groups/${id}/jira/test`);
  return data as { ok: boolean; projectName?: string; error?: string };
}

export async function testGithub(id: string) {
  const { data } = await api.post(`/groups/${id}/github/test`);
  return data as {
    allOk: boolean;
    results: { repoUrl: string; ok: boolean; error?: string; fullName?: string }[];
  };
}

export async function syncGroup(id: string): Promise<import('../types').SyncGroupResult> {
  const { data } = await api.post(`/groups/${id}/sync`);
  return data;
}

export async function syncJiraOnly(id: string): Promise<import('../types').SourceSyncResult> {
  const { data } = await api.post(`/sync/group/${id}/jira`);
  return data;
}

export async function syncGithubOnly(id: string): Promise<import('../types').SourceSyncResult> {
  const { data } = await api.post(`/sync/group/${id}/github`);
  return data;
}

export async function getSyncLogs(id: string): Promise<import('../types').SyncLog[]> {
  const { data } = await api.get(`/groups/${id}/sync-logs`);
  return data;
}

export async function getGroupIssues(id: string): Promise<import('../types').JiraIssue[]> {
  const { data } = await api.get(`/groups/${id}/issues`);
  return data;
}

export async function getGroupCommits(id: string): Promise<import('../types').GithubCommit[]> {
  const { data } = await api.get(`/groups/${id}/commits`);
  return data;
}

export async function getGroupPullRequests(id: string): Promise<import('../types').GithubPullRequest[]> {
  const { data } = await api.get(`/groups/${id}/pull-requests`);
  return data;
}

export async function getGroupMembers(id: string): Promise<import('../types').GroupMember[]> {
  const { data } = await api.get(`/groups/${id}/members`);
  return data;
}

export async function addGroupMember(
  groupId: string,
  payload: { memberCode: string; fullName: string; role?: string },
): Promise<import('../types').GroupMember> {
  const { data } = await api.post(`/groups/${groupId}/members`, payload);
  return data;
}

export async function updateGroupMember(
  groupId: string,
  memberId: string,
  payload: { memberCode?: string; fullName?: string; role?: string },
): Promise<import('../types').GroupMember> {
  const { data } = await api.patch(`/groups/${groupId}/members/${memberId}`, payload);
  return data;
}

export async function deleteGroupMember(
  groupId: string,
  memberId: string,
): Promise<{ id: string }> {
  const { data } = await api.delete(`/groups/${groupId}/members/${memberId}`);
  return data;
}

export async function initSampleMembers(
  groupId: string,
): Promise<import('../types').GroupMember[]> {
  const { data } = await api.post(`/groups/${groupId}/members/init-sample`);
  return data;
}

export async function syncMembersFromSources(
  groupId: string,
): Promise<{
  success: boolean;
  addedCount: number;
  totalMembers: number;
  members: import('../types').GroupMember[];
  message: string;
}> {
  const { data } = await api.post(`/groups/${groupId}/members/sync-sources`);
  return data;
}



import apiClient from './client';

// --- Types ---

export interface Group {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
}

export interface GroupCreate {
  name: string;
  description?: string;
}

export interface GroupUpdate {
  name?: string;
  description?: string;
}

export interface SetProfileGroupRequest {
  group_id?: string | null;
}

// --- API ---

export const groupsAPI = {
  list: () =>
    apiClient.get<GroupListResponse>('/groups'),

  get: (id: string) =>
    apiClient.get<Group>(`/groups/${id}`),

  create: (data: GroupCreate) =>
    apiClient.post<{ group: Group }>('/groups', data),

  update: (id: string, data: GroupUpdate) =>
    apiClient.put<{ group: Group }>(`/groups/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/groups/${id}`),

  /** 设置单个环境的分组 */
  setProfileGroup: (profileId: string, groupId: string | null) =>
    apiClient.post(`/groups/profiles/${profileId}/group`, { group_id: groupId }),

  /** 批量设置环境的分组 */
  batchSetProfileGroup: (profileIds: string[], groupId: string | null) =>
    apiClient.post<{ success: number; failed: number; errors: Array<{ id: string; error: string }> }>(
      '/profiles/batch/set-group',
      { profile_ids: profileIds, group_id: groupId }
    ),
};

import apiClient from './client';

// --- Types matching backend API ---

export interface ProfileFingerprint {
  platform: string;
  timezone?: string;
  locale?: string;
  screen_width: number;
  screen_height: number;
  gpu_vendor: string;
  gpu_renderer?: string;
  fingerprint_seed: number;
  humanize: boolean;
  headless: boolean;
  geoip?: boolean;
  [key: string]: unknown;
}

export interface Profile {
  id: string;
  name: string;
  group: string;
  group_id?: string | null;
  platform?: string;
  platform_account_id?: string;
  proxy_id?: string;
  status: string;
  runtime_status?: string;
  tags?: string[];
  notes?: string;
  creator_id?: string;
  created_at: string;
  updated_at: string;
  last_launched_at?: string;
  proxy_info?: string;
  proxy_url?: string;
  account_username?: string;
  account_platform?: string;
  fingerprint?: ProfileFingerprint;
}

export interface ProfileResponse {
  profile: Profile;
}

export interface ProfileListResponse {
  profiles: Profile[];
  total: number;
}

export interface ProfileCreate {
  name: string;
  group?: string;
  platform?: string;
  platform_account_id?: string;
  proxy_id?: string;
  tags?: string[];
  notes?: string;
  fingerprint?: {
    platform: string;
    timezone?: string;
    locale?: string;
    screen_width: number;
    screen_height: number;
    gpu_vendor: string;
    fingerprint_seed: number;
    humanize: boolean;
    headless: boolean;
    geoip: boolean;
    [key: string]: unknown;
  };
}

export interface ProfileUpdate {
  name?: string;
  group?: string;
  platform?: string;
  platform_account_id?: string;
  proxy_id?: string;
  status?: string;
  runtime_status?: string;
  tags?: string[];
  notes?: string;
}

export interface ProfileBatchAction {
  profile_ids: string[];
  action: 'start' | 'stop' | 'authorize' | 'share' | 'transfer' | 'change_proxy' | 'delete' | 'move_to_group';
  params?: Record<string, unknown>;
}

export interface BatchImportError {
  row: number;
  reason: string;
}

export interface BatchImportResponse {
  total: number;
  succeeded: number;
  failed: number;
  errors: BatchImportError[];
}

// --- API ---

export const profilesAPI = {
  list: (params?: { skip?: number; limit?: number; status?: string; search?: string; tag?: string; group?: string; group_id?: string }) =>
    apiClient.get<ProfileListResponse>('/profiles', { params }),

  get: (id: string) =>
    apiClient.get<Profile>(`/profiles/${id}`),

  create: (data: ProfileCreate) =>
    apiClient.post<Profile>('/profiles', data),

  update: (id: string, data: ProfileUpdate) =>
    apiClient.put<Profile>(`/profiles/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/profiles/${id}`),

  batchAction: (data: ProfileBatchAction) =>
    apiClient.post<{ results: Record<string, string> }>('/profiles/batch', data),

  start: (id: string, headless?: boolean) =>
    apiClient.post(`/profiles/${id}/start`, { headless: headless ?? true }),

  stop: (id: string) =>
    apiClient.post(`/profiles/${id}/stop`),

  /**
   * 批量获取多个 profile 的实时运行状态（从 BeehiveBrowser 同步）
   * @param ids profile_id 列表
   * Returns: { [profile_id]: { status: string, pid: number|null, vnc_url: string|null } }
   */
  getStatuses: (ids: string[]) =>
    apiClient.get<Record<string, { status: string; pid: number | null; vnc_url: string | null }>>(
      '/profiles/status',
      { params: { ids: ids.join(',') } }
    ),

  /**
   * 批量导入环境（CSV文件）
   * @param file CSV文件 (multipart/form-data)
   * Returns: { total: number, succeeded: number, failed: number, errors: [{row, reason}] }
   */
  batchImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<BatchImportResponse>('/profiles/batch-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

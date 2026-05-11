import apiClient from './client';

export interface AutomationTask {
  id: string;
  name: string;
  action: string;
  status: string;
  profile_id?: string;
  schedule?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  next_run_at?: string;
  last_run_at?: string;
  run_count?: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface TaskListResponse {
  tasks: AutomationTask[];
  total: number;
}

export interface AutomationLog {
  id: string;
  task_id: string;
  level: string;
  message: string;
  timestamp: string;
}

export interface LogListResponse {
  logs: AutomationLog[];
  total: number;
}

export interface TaskCreate {
  name: string;
  action: string;
  account_id?: string;
  profile_id?: string;
  params?: Record<string, unknown>;
  schedule?: string;
}

export interface BatchPublishRequest {
  profile_ids: string[];
  platform: string;
  content: string;
  media_urls?: string[];
  schedule?: string;
}

export interface BatchPublishResultItem {
  profile_id: string;
  task_id?: string;
  status: string;
  tweet_url?: string;
  error?: string;
}

export interface BatchPublishResponse {
  total: number;
  scheduled: number;
  immediate: number;
  results: BatchPublishResultItem[];
}

export const automationsAPI = {
  listTasks: (params?: { skip?: number; limit?: number; status?: string }) =>
    apiClient.get<TaskListResponse>('/automations/tasks', { params }),

  getTask: (id: string) =>
    apiClient.get<AutomationTask>(`/automations/tasks/${id}`),

  createTask: (data: TaskCreate) =>
    apiClient.post<AutomationTask>('/automations/tasks', data),

  cancelTask: (id: string) =>
    apiClient.post(`/automations/tasks/${id}/cancel`),

  deleteTask: (id: string) =>
    apiClient.delete(`/automations/tasks/${id}`),

  listLogs: (params?: { skip?: number; limit?: number; task_id?: string; level?: string }) =>
    apiClient.get<LogListResponse>('/automations/logs', { params }),

  batchPublish: (data: BatchPublishRequest) =>
    apiClient.post<BatchPublishResponse>('/automations/batch-publish', data),
};

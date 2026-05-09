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
};

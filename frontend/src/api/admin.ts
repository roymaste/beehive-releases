import client from './client';

export interface DashboardStats {
  total_clients: number;
  active_clients: number;
  total_environments: number;
  running_environments: number;
  total_proxies: number;
  total_automations: number;
}

export interface AdminClient {
  id: string;
  name: string;
  email: string;
  company?: string;
  is_active: boolean;
  status: string;
  plan_type: string;
  quota_environments: number;
  quota_members: number;
  environment_count: number;
  created_at: string;
}

export interface AdminClientListResponse {
  clients: AdminClient[];
  total: number;
}

export const adminAPI = {
  getDashboard: () => client.get<DashboardStats>('/admin/dashboard'),
  listClients: () => client.get<AdminClientListResponse>('/admin/clients'),
  getClient: (id: string) => client.get<AdminClient>(`/admin/clients/${id}`),
  createClient: (data: {
    name: string;
    email: string;
    company?: string;
    plan_type?: string;
    quota_environments?: number;
    quota_members?: number;
  }) => client.post<AdminClient>('/admin/clients', data),
  updateClient: (id: string, data: {
    name?: string;
    email?: string;
    company?: string;
    is_active?: boolean;
    status?: string;
    plan_type?: string;
    quota_environments?: number;
    quota_members?: number;
  }) => client.put<AdminClient>(`/admin/clients/${id}`, data),
  deleteClient: (id: string) => client.delete(`/admin/clients/${id}`),
};

// ── Content Policy API ────────────────────────────────────────

export interface ContentRule {
  id: string;
  rule_type: string;
  pattern: string;
  is_regex: boolean;
  enabled: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemPromptConfig {
  id: number;
  base_prompt: string;
  prohibited_behaviors: string[];
  enabled: boolean;
  updated_at?: string;
}

const listRules = () => client.get<{ rules: ContentRule[]; total: number }>('/admin/content-policy/rules');
const createRule = (data: { rule_type: string; pattern: string; is_regex?: boolean; description?: string }) =>
  client.post<ContentRule>('/admin/content-policy/rules', data);
const updateRule = (id: string, data: Partial<{ rule_type: string; pattern: string; is_regex: boolean; enabled: boolean; description: string }>) =>
  client.put<ContentRule>(`/admin/content-policy/rules/${id}`, data);
const deleteRule = (id: string) => client.delete(`/admin/content-policy/rules/${id}`);
const getSystemPrompt = () => client.get<SystemPromptConfig>('/admin/content-policy/system-prompt');
const updateSystemPrompt = (data: { base_prompt?: string; prohibited_behaviors?: string[]; enabled?: boolean }) =>
  client.put<SystemPromptConfig>('/admin/content-policy/system-prompt', data);

export const contentPolicyAPI = {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  getSystemPrompt,
  updateSystemPrompt,
};

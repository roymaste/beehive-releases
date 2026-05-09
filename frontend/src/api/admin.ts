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

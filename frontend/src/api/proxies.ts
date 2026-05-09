import apiClient from './client';

export interface Proxy {
  id: string;
  type: string;
  provider?: string;
  protocol: string;
  server: string;
  port: string;
  username?: string;
  location?: string;
  status: string;
  bound_count?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProxyListResponse {
  proxies: Proxy[];
  total: number;
}

export interface ProxyCreate {
  type?: string;
  provider?: string;
  protocol?: string;
  server: string;
  port: string;
  username?: string;
  password?: string;
  location?: string;
  notes?: string;
}

export interface ProxyUpdate {
  type?: string;
  provider?: string;
  protocol?: string;
  server?: string;
  port?: string;
  username?: string;
  password?: string;
  location?: string;
  status?: string;
  notes?: string;
}

export const proxiesAPI = {
  list: (params?: { skip?: number; limit?: number; status?: string; protocol?: string }) =>
    apiClient.get<ProxyListResponse>('/proxies', { params }),

  get: (id: string) =>
    apiClient.get<Proxy>(`/proxies/${id}`),

  create: (data: ProxyCreate) =>
    apiClient.post<Proxy>('/proxies', data),

  update: (id: string, data: ProxyUpdate) =>
    apiClient.put<Proxy>(`/proxies/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/proxies/${id}`),

  check: (id: string) =>
    apiClient.post<{ reachable: boolean; exit_ip?: string; latency_ms?: number }>(`/proxies/${id}/check`),
};

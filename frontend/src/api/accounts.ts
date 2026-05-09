import apiClient from './client';

export interface Account {
  id: string;
  tenant_id: string;
  platform: string;
  account_username: string;
  account_email?: string;
  status: string;
  notes?: string;
  profile_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountListResponse {
  accounts: Account[];
  total: number;
}

export const accountsAPI = {
  list: (params?: { skip?: number; limit?: number; platform?: string; status?: string }) =>
    apiClient.get<AccountListResponse>('/accounts', { params }),

  get: (id: string) =>
    apiClient.get<Account>(`/accounts/${id}`),

  create: (data: {
    platform: string;
    account_username: string;
    account_password: string;
    account_email?: string;
    notes?: string;
  }) => apiClient.post<Account>('/accounts', data),

  update: (id: string, data: {
    platform?: string;
    account_username?: string;
    account_password?: string;
    account_email?: string;
    status?: string;
    notes?: string;
  }) => apiClient.put<Account>(`/accounts/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/accounts/${id}`),

  login: (id: string) =>
    apiClient.post(`/accounts/${id}/login`),

  post: (id: string, content: string, mediaUrls?: string[]) =>
    apiClient.post(`/accounts/${id}/post`, {
      content,
      ...(mediaUrls ? { media_urls: mediaUrls } : {}),
    }),
};

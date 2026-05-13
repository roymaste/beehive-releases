import apiClient from './client';

// --- Types matching backend API ---

export interface BrowserKernel {
  id: string;
  version: string;
  display_name: string;
  chromium_version?: string | null;
  platform: string;
  download_url: string;
  is_active: boolean;
  created_at: string;
}

export interface BrowserKernelListResponse {
  kernels: BrowserKernel[];
}

export const browserKernelsAPI = {
  list: (platform?: string) =>
    apiClient.get<BrowserKernelListResponse>('/browser-kernels', { params: platform ? { platform } : undefined }),
  sync: () => apiClient.post<{ success: boolean; message: string }>('/browser-kernels/sync'),
  reportInstall: (version: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/browser-kernels/${version}/report-install`),
  delete: (version: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/browser-kernels/${version}`),
};

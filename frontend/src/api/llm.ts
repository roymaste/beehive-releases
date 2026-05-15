import apiClient from './client';

export interface AvailableModel {
  model_name: string;
  display_name: string;
  provider_name: string;
  provider_display: string;
  context_window: number | null;
  capabilities: string[];
}

export const llmAPI = {
  listAvailableModels: () =>
    apiClient.get<{ models: AvailableModel[] }>('/agent/models'),
};

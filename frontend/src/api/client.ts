import axios from 'axios';

// 检测是否在 Tauri 桌面端运行
// Tauri 下相对路径指向 tauri://localhost，API 请求会失败
// 所以 desktop 模式下强制指向 VPS 后端
const DESKTOP_MODE = typeof window !== 'undefined' && (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__
);
const API_BASE = DESKTOP_MODE
  ? 'http://107.173.70.124:8000/api/v1'
  : '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach admin JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Determine if this is a true auth failure vs. a permission/validation error.
      // We do NOT clear localStorage here — that destroys the session for ALL tabs
      // and causes "logged-in users redirected to /login" on ANY 401 from any API.
      // The token is only cleared on explicit logout(), or when the backend signals
      // token invalidation via a dedicated /auth/logout endpoint.
      //
      // Instead, dispatch a custom event so AuthContext / ProtectedRoute can
      // react appropriately without a full-page reload.
      console.warn('[API 401]', error.config?.url, error.response?.data);
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new CustomEvent('auth:401', { detail: error.response?.data }));
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

// --- Types ---

export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan_type: string;
  status: string;
  created_at: string;
}

export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
}

export interface TenantCreate {
  name: string;
  email: string;
  plan_type?: string;
  status?: string;
}

export interface TenantUpdate {
  name?: string;
  email?: string;
  plan_type?: string;
  status?: string;
}

export interface PlatformAccount {
  id: string;
  tenant_id: string;
  platform: string;
  account_username: string;
  account_email?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformAccountListResponse {
  platforms: PlatformAccount[];
  total: number;
}

export interface PlatformAccountCreate {
  platform: string;
  account_username: string;
  account_password: string;
  account_email?: string;
  notes?: string;
}

export interface PlatformAccountUpdate {
  platform?: string;
  account_username?: string;
  account_password?: string;
  account_email?: string;
  status?: string;
  notes?: string;
}

export interface IPAsset {
  id: string;
  tenant_id: string;
  type: string;
  provider?: string;
  protocol: string;
  server: string;
  port: string;
  username?: string;
  location?: string;
  status: string;
  bound_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IPAssetListResponse {
  ips: IPAsset[];
  total: number;
}

export interface IPAssetCreate {
  type?: string;
  provider?: string;
  protocol?: string;
  server: string;
  port: string;
  username?: string;
  password?: string;
  location?: string;
  bound_to?: string;
  notes?: string;
}

export interface IPAssetUpdate {
  type?: string;
  provider?: string;
  protocol?: string;
  server?: string;
  port?: string;
  username?: string;
  password?: string;
  location?: string;
  status?: string;
  bound_to?: string;
  notes?: string;
}

export interface APIKeyResponse {
  tenant_id: string;
  api_key: string;
  name: string;
  created_at: string;
}

export interface AgentStatus {
  service: string;
  version: string;
  tenant_id: string;
  tenant_name: string;
  tenant_plan: string;
  api_version: string;
  endpoints: Record<string, string>;
}

export interface AgentAccount {
  id: string;
  platform: string;
  username: string;
  status: string;
}

export interface AgentAccountList {
  accounts: AgentAccount[];
  total: number;
}

export interface AgentAccountDetail {
  id: string;
  tenant_id: string;
  platform: string;
  username: string;
  password?: string;
  email?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface IPCheckResult {
  ip_id: string;
  server: string;
  reachable: boolean;
  exit_ip?: string;
  latency_ms?: number;
  error?: string;
}

export interface AgentIPBrief {
  id: string;
  type: string;
  provider?: string;
  protocol: string;
  server: string;
  port: string;
  location?: string;
  status: string;
  bound_to?: string;
}

export interface AgentIPList {
  ips: AgentIPBrief[];
  total: number;
}

export interface PostRequest {
  content: string;
  media_urls?: string[];
}

export interface PostResult {
  account_id: string;
  platform: string;
  status: string;
  post_url?: string;
  post_id?: string;
}

export interface AgentTask {
  task_id: string;
  action: string;
  account_id?: string;
  status: string;
  result?: Record<string, unknown>;
}

export interface TaskSubmit {
  action: string;
  account_id?: string;
  params?: Record<string, unknown>;
}

export interface ContentGenerateRequest {
  topic: string;
  platform: string;
  style: string;
}

export interface ContentGenerateResponse {
  content: string;
  platform: string;
  style: string;
  word_count: number;
  tags: string[];
}

// --- Dashboard (tenant-level) ---
export interface DashboardStats {
  total_envs: number;
  running_envs: number;
  stopped_envs: number;
  total_proxies: number;
  bound_proxies: number;
  today_posts: number;
  success_rate: number;
  recent_profiles: RecentProfile[];
  tenant_count: number;
  platform_count: number;
  ip_count: number;
  active_tasks: number;
}
export interface RecentProfile {
  id: string;
  name: string;
  platform?: string;
  runtime_status: string;
  group: string;
  proxy_location?: string;
  updated_at: string;
}

// --- Admin Dashboard ---
export interface AdminDashboardStats {
  total_clients: number;
  active_clients: number;
  total_environments: number;
  running_environments: number;
  total_proxies: number;
  total_automations: number;
}

export interface AdminClientResponse {
  id: string;
  name: string;
  email: string;
  status: string;
  plan_type: string;
  environment_count: number;
  created_at: string;
}

// --- Auth API ---
export const authAPI = {
  login: (username: string, password: string) =>
    apiClient.post<{ access_token: string; token_type: string; is_admin: boolean }>(
      '/auth/login',
      { username, password },
    ),
  sendCode: (email: string) =>
    apiClient.post<{ message: string; dev_code?: string }>(
      '/auth/send-code',
      { email },
    ),
  register: (name: string, email: string, password: string, verificationCode: string, company?: string) =>
    apiClient.post<{ access_token: string; token_type: string; tenant_id: string; name: string; email: string; is_admin: boolean }>(
      '/auth/register',
      { name, email, password, verification_code: verificationCode, ...(company ? { company } : {}) },
    ),
  tenantLogin: (email: string, password: string) =>
    apiClient.post<{ access_token: string; token_type: string; is_admin: boolean }>(
      '/auth/tenant-login',
      { email, password },
    ),
  sendPassword: (account: string) =>
    apiClient.post<{ message: string; dev_password?: string }>(
      '/auth/send-password',
      { account_type: 'admin', account },
    ),
};

// --- Tenants API ---
export const tenantsAPI = {
  list: (skip = 0, limit = 50) =>
    apiClient.get<TenantListResponse>('/tenants', { params: { skip, limit } }),
  get: (id: string) =>
    apiClient.get<Tenant>(`/tenants/${id}`),
  create: (data: TenantCreate) =>
    apiClient.post<Tenant>('/tenants', data),
  update: (id: string, data: TenantUpdate) =>
    apiClient.put<Tenant>(`/tenants/${id}`, data),
  delete: (id: string) =>
    apiClient.delete(`/tenants/${id}`),
  generateApiKey: (id: string, name = 'default') =>
    apiClient.post<APIKeyResponse>(`/tenants/${id}/api-keys`, null, { params: { name } }),
};

// --- Platforms API ---
export const platformsAPI = {
  list: (tenantId: string, skip = 0, limit = 50, platform?: string) =>
    apiClient.get<PlatformAccountListResponse>(`/tenants/${tenantId}/platforms`, {
      params: { skip, limit, ...(platform ? { platform } : {}) },
    }),
  create: (tenantId: string, data: PlatformAccountCreate) =>
    apiClient.post<PlatformAccount>(`/tenants/${tenantId}/platforms`, data),
  update: (tenantId: string, platformId: string, data: PlatformAccountUpdate) =>
    apiClient.put<PlatformAccount>(`/tenants/${tenantId}/platforms/${platformId}`, data),
  delete: (tenantId: string, platformId: string) =>
    apiClient.delete(`/tenants/${tenantId}/platforms/${platformId}`),
};

// --- IPs API ---
export const ipsAPI = {
  list: (tenantId: string, skip = 0, limit = 50, status?: string) =>
    apiClient.get<IPAssetListResponse>(`/tenants/${tenantId}/ips`, {
      params: { skip, limit, ...(status ? { status } : {}) },
    }),
  create: (tenantId: string, data: IPAssetCreate) =>
    apiClient.post<IPAsset>(`/tenants/${tenantId}/ips`, data),
  update: (tenantId: string, ipId: string, data: IPAssetUpdate) =>
    apiClient.put<IPAsset>(`/tenants/${tenantId}/ips/${ipId}`, data),
  delete: (tenantId: string, ipId: string) =>
    apiClient.delete(`/tenants/${tenantId}/ips/${ipId}`),
};

// --- Agents API ---
export const agentsAPI = {
  status: () =>
    apiClient.get<AgentStatus>('/agents/status'),
  accounts: (platform?: string, status?: string) =>
    apiClient.get<AgentAccountList>('/agents/accounts', {
      params: { ...(platform ? { platform } : {}), ...(status ? { status } : {}) },
    }),
  accountDetail: (accountId: string, decrypt = true) =>
    apiClient.get<AgentAccountDetail>(`/agents/accounts/${accountId}`, {
      params: { decrypt },
    }),
  accountLogin: (accountId: string, headless = true, proxyId?: string) =>
    apiClient.post(`/agents/accounts/${accountId}/login`, {
      headless,
      ...(proxyId ? { proxy_id: proxyId } : {}),
    }),
  accountPost: (accountId: string, content: string, mediaUrls?: string[]) =>
    apiClient.post<PostResult>(`/agents/accounts/${accountId}/post`, {
      content,
      ...(mediaUrls ? { media_urls: mediaUrls } : {}),
    }),
  ips: (status?: string) =>
    apiClient.get<AgentIPList>('/agents/ips', {
      params: { ...(status ? { status } : {}) },
    }),
  ipCheck: (ipId: string) =>
    apiClient.post<IPCheckResult>(`/agents/ips/${ipId}/check`),
  submitTask: (data: TaskSubmit) =>
    apiClient.post<AgentTask>('/agents/tasks', data),
  taskStatus: (taskId: string) =>
    apiClient.get<AgentTask>(`/agents/tasks/${taskId}`),
};

// --- API Keys API ---
export const apiKeysAPI = {
  list: () =>
    apiClient.get<{ keys: any[] }>('/api-keys'),
  create: (data: { name: string; scopes?: string[]; rate_limit?: number; daily_quota?: number }) =>
    apiClient.post<any>('/api-keys', data),
  delete: (id: string) =>
    apiClient.delete(`/api-keys/${id}`),
};

// --- Admin API ---
export const adminAPI = {
  getDashboardStats: () =>
    apiClient.get<AdminDashboardStats>('/admin/dashboard'),
  listClients: (skip = 0, limit = 50) =>
    apiClient.get<{ clients: AdminClientResponse[]; total: number }>('/admin/clients', { params: { skip, limit } }),
};

// --- Agent Profile ---
export interface AgentProfile {
  id: string;
  name: string;
  writing_style?: string;
  tone?: string;
  knowledge_base: {
    domains?: string[];
    keywords?: string[];
  };
  custom_instructions?: string;
}

export interface AgentProfileUpdate {
  name?: string;
  writing_style?: string;
  tone?: string;
  knowledge_base?: {
    domains?: string[];
    keywords?: string[];
  };
  custom_instructions?: string;
}

export const agentProfileAPI = {
  get: () => apiClient.get<AgentProfile>('/agent/profile'),
  update: (data: AgentProfileUpdate) => apiClient.put<AgentProfile>('/agent/profile', data),
};

// --- Script Templates API ---
export interface ScriptTemplate {
  id: string;
  name: string;
  platform: string;
  description: string;
  steps: ScriptTemplateStep[];
}

export interface ScriptTemplateStep {
  action: string;
  params: Record<string, unknown>;
  then_steps?: ScriptTemplateStep[];
  else_steps?: ScriptTemplateStep[];
  for_each_steps?: ScriptTemplateStep[];
}

export const scriptTemplatesAPI = {
  list: () => apiClient.get<{ templates: ScriptTemplate[] }>('/script-templates'),
};

// --- AI Script Generation API ---
export interface GenerateScriptRequest {
  platform: string;
  goal: string;
}

export interface GenerateScriptResponse {
  steps: ScriptTemplateStep[];
  platform: string;
  goal: string;
  model: string;
}

export const aiScriptAPI = {
  generateScript: (data: GenerateScriptRequest) =>
    apiClient.post<GenerateScriptResponse>('/ai/generate-script', data),
};

// --- Dashboard (composite from multiple endpoints) ---
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const isAdmin = localStorage.getItem('is_admin') === 'true';

    if (isAdmin) {
      // Admin calls the dedicated admin stats endpoint
      const res = await apiClient.get<AdminDashboardStats>('/admin/dashboard');
      const data = res.data;
      return {
        total_envs: data.total_environments,
        running_envs: data.running_environments,
        stopped_envs: 0,
        total_proxies: data.total_proxies,
        bound_proxies: 0,
        today_posts: 0,
        success_rate: 0,
        recent_profiles: [],
        tenant_count: data.total_clients,
        platform_count: 0,
        ip_count: 0,
        active_tasks: data.total_automations,
      };
    }

    // Tenant calls the tenant-level stats endpoint
    const res = await apiClient.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },
};

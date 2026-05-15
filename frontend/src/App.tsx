import './i18n';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PageTransition } from './components/ui/page-transition';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth, isTokenExpired } from './context/AuthContext';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { AuthenticatedLayout } from './components/layout/authenticated-layout';
import LoginPage from './pages/sign-in';
import AdminLoginPage from './pages/AdminLoginPage';
import RegisterPage from './pages/sign-up';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import TenantDetailPage from './pages/TenantDetailPage';
import PlatformsSubPage from './pages/PlatformsSubPage';
import IPsSubPage from './pages/IPsSubPage';
import APIKeysSubPage from './pages/APIKeysSubPage';
import AgentConsolePage from './pages/AgentConsolePage';
import AIWorkflowPage from './pages/AIWorkflowPage';
import ProfileListPage from './pages/profiles/index';
import ProfileCreatePage from './pages/profiles/create';
import ProfileDetailPage from './pages/profiles/detail';
import ProxyListPage from './pages/proxies/index';
import AccountListPage from './pages/accounts/index';
import TaskListPage from './pages/automations/tasks';
import LogListPage from './pages/automations/logs';
import RpaEditorPage from './pages/automations/editor';
import RPASelectorPage from './pages/RPASelectorPage';
import TeamPage from './pages/team/index';
import SystemPage from './pages/system/index';
import PlaceholderPage from './components/PlaceholderPage';
import AgentManagementPage from './pages/AgentManagementPage';
import AddProxyPage from './pages/proxies/add';
import EditProxyPage from './pages/proxies/edit';
import BuyIPPage from './pages/proxies/buy';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminClientsPage from './pages/admin/ClientsPage';
import AdminClientDetailPage from './pages/admin/ClientDetailPage';
import WebhooksPage from './pages/webhooks';
import ExecutorListPage from './pages/executors';
import ReferralPage from './pages/referrals';
import GroupListPage from './pages/groups';
import BillingPage from './pages/billing';
import AdminBillingPage from './pages/admin/BillingPage';
import AdminLogsPage from './pages/admin/LogsPage';
import ContentPolicyPage from './pages/admin/ContentPolicyPage';
import ModelKeysPage from './pages/admin/ModelKeysPage';
import KernelsPage from './pages/KernelsPage';
import PricingPage from './pages/PricingPage';
import AnalyticsPage from './pages/analytics/index';
import MonitorPage from './pages/monitor/index';
import PostsNewPage from './pages/posts/NewPage';

// Auth guard wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  const localToken = localStorage.getItem('access_token');
  const effectiveToken = token || localToken;
  const isValid = effectiveToken ? !isTokenExpired(effectiveToken) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fafaf9' }}>
        <p style={{ color: '#78716c' }}>加载中...</p>
      </div>
    );
  }

  if (!isValid) {
    // Token missing or expired — clean up and redirect
    localStorage.removeItem('access_token');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('is_tenant');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const withLayout = (Page: React.FC) => (
  <ProtectedRoute>
    <AuthenticatedLayout>
      <Page />
    </AuthenticatedLayout>
  </ProtectedRoute>
);

const AppRoutes: React.FC = () => {
  return (
    <PageTransition>
      <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={withLayout(DashboardPage)} />

      {/* Agent Console as home page */}
      <Route path="/" element={withLayout(AgentConsolePage)} />

      {/* 环境管理 */}
      <Route path="/groups" element={withLayout(GroupListPage)} />
      <Route path="/profiles" element={withLayout(ProfileListPage)} />
      <Route path="/profiles/create" element={withLayout(ProfileCreatePage)} />
      <Route path="/profiles/:id" element={withLayout(ProfileDetailPage)} />

      {/* 代理管理 */}
      <Route path="/proxies" element={withLayout(ProxyListPage)} />
      <Route path="/proxies/add" element={withLayout(AddProxyPage)} />
      <Route path="/proxies/:id/edit" element={withLayout(EditProxyPage)} />
      <Route path="/proxies/buy" element={withLayout(BuyIPPage)} />

      {/* 账号管理 */}
      <Route path="/accounts" element={withLayout(AccountListPage)} />

      {/* 发帖 */}
      <Route path="/posts/new" element={withLayout(PostsNewPage)} />

      {/* AI 工作流 */}
      <Route path="/ai-workflow" element={withLayout(AIWorkflowPage)} />

      {/* 自动化 */}
      <Route path="/automations" element={withLayout(TaskListPage)} />
      <Route path="/automations/logs" element={withLayout(LogListPage)} />
      <Route path="/automations/editor" element={withLayout(RpaEditorPage)} />
      <Route path="/automations/editor/:id" element={withLayout(RpaEditorPage)} />
      <Route path="/rpa/selector" element={withLayout(RPASelectorPage)} />

      {/* 数据分析 & 监控 */}
      <Route path="/analytics" element={withLayout(AnalyticsPage)} />
      <Route path="/monitor" element={withLayout(MonitorPage)} />

      {/* 团队 */}
      <Route path="/team" element={withLayout(TeamPage)} />

      {/* 推广返利 */}
      <Route path="/referrals" element={withLayout(ReferralPage)} />

      {/* 系统 */}
      <Route path="/system" element={withLayout(SystemPage)} />

      {/* Webhook 通知 */}
      <Route path="/webhooks" element={withLayout(WebhooksPage)} />

      {/* 帮助中心 */}
      <Route path="/help" element={withLayout(() => <PlaceholderPage title="帮助中心" description="使用指南和常见问题即将上线。" />)} />

      {/* 占位页面 */}
      <Route path="/quick-launch" element={withLayout(() => <PlaceholderPage title="快速启动" />)} />
      <Route path="/cookies" element={withLayout(() => <PlaceholderPage title="Cookie 管理" />)} />
      <Route path="/security" element={withLayout(() => <PlaceholderPage title="安全设置" />)} />
      <Route path="/plugins" element={withLayout(() => <PlaceholderPage title="插件管理" />)} />
      <Route path="/cloud-browser" element={withLayout(() => <PlaceholderPage title="云浏览器" />)} />
      <Route path="/kernels" element={withLayout(KernelsPage)} />
      <Route path="/billing" element={withLayout(BillingPage)} />
      <Route path="/trash" element={withLayout(() => <PlaceholderPage title="回收站" />)} />

      {/* 住户管理 */}
      <Route path="/tenants" element={withLayout(TenantsPage)} />
      <Route path="/tenants/:id" element={<ProtectedRoute><AuthenticatedLayout><TenantDetailPage /></AuthenticatedLayout></ProtectedRoute>}>
        <Route path="platforms" element={<PlatformsSubPage />} />
        <Route path="ips" element={<IPsSubPage />} />
        <Route path="api-keys" element={<APIKeysSubPage />} />
      </Route>

      {/* AI智能体 */}
      <Route path="/agent/console" element={withLayout(AgentConsolePage)} />
      <Route path="/agent/management" element={withLayout(AgentManagementPage)} />
      <Route path="/agent/auto-reply" element={withLayout(() => <PlaceholderPage title="智能互动" description="自动回复和互动规则配置即将上线。" />)} />
      <Route path="/agent/logs" element={withLayout(() => <PlaceholderPage title="Agent日志" description="Agent操作记录和审计日志即将上线。" />)} />
      <Route path="/agent" element={<Navigate to="/agent/console" replace />} />

      {/* Admin */}
      <Route path="/admin" element={withLayout(AdminDashboardPage)} />
      <Route path="/admin/clients" element={withLayout(AdminClientsPage)} />
      <Route path="/admin/clients/:id" element={withLayout(AdminClientDetailPage)} />
      <Route path="/admin/executors" element={withLayout(ExecutorListPage)} />
      <Route path="/admin/billing" element={withLayout(AdminBillingPage)} />
      <Route path="/admin/logs" element={withLayout(AdminLogsPage)} />
      <Route path="/admin/content-policy" element={withLayout(ContentPolicyPage)} />
      <Route path="/admin/model-keys" element={withLayout(ModelKeysPage)} />

      {/* Public */}
      <Route path="/pricing" element={<PricingPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PageTransition>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // 桌面端 Tauri 环境：把 JWT token 传给 Rust 后端
    if ((window as any).__TAURI__) {
      const token = localStorage.getItem('access_token');
      if (token) {
        const { invoke } = (window as any).__TAURI__;
        invoke('set_auth_token', { token }).catch((err: any) => {
          console.error('Failed to set auth token in Tauri:', err);
        });
      }

      // ── 静默自动更新：监听 Rust 端下载完成事件 ──
      const { listen } = (window as any).__TAURI__;
      let unlisten: (() => void) | undefined;

      listen('update-available', (event: any) => {
        const { version, path } = event.payload;
        toast.success(
          `已下载更新 v${version}，请重启应用以完成更新`,
          {
            duration: 0, // 不自动消失
            icon: '🚀',
            action: {
              label: '立即重启',
              onClick: async () => {
                try {
                  // 调用 Rust 命令执行替换 + 重启
                  await invoke('apply_update_and_restart', { newPath: path });
                } catch (err) {
                  console.error('重启失败:', err);
                  toast.error('重启失败，请手动重启应用');
                }
              },
            },
          }
        );
      }).then((fn: () => void) => {
        unlisten = fn;
      });

      return () => {
        if (unlisten) unlisten();
      };
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'toast-apple',
            duration: 3000,
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

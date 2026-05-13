import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  RiLoginBoxLine,
  RiSendPlaneLine,
  RiDeleteBinLine,
  RiRefreshLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import { tenantsAPI, platformsAPI, PlatformAccount } from '../../api/client';
import DataTable, { Column } from '../../components/DataTable';

// Extended account type with tenant info and proxy status
interface AccountWithTenant extends PlatformAccount {
  tenant_name?: string;
  has_proxy?: boolean;
}

const AccountListPage: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountWithTenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      // 获取所有租户
      const tenantsRes = await tenantsAPI.list(0, 200);
      const tenants = tenantsRes.data.tenants || [];
      
      // 获取每个租户的账号
      const allAccounts: AccountWithTenant[] = [];
      await Promise.allSettled(
        tenants.map(async (tenant) => {
          try {
            const platformsRes = await platformsAPI.list(tenant.id, 0, 200);
            const platforms = platformsRes.data.platforms || [];
            platforms.forEach((p: PlatformAccount) => {
              // 假设has_proxy字段存在，如果没有proxy_id则视为无代理
              const hasProxy = !!(p as any).proxy_id;
              allAccounts.push({ ...p, tenant_name: tenant.name, has_proxy: hasProxy });
            });
          } catch {
            // 忽略单个租户获取失败
          }
        })
      );
      
      setAccounts(allAccounts);
    } catch {
      toast.error('获取账号列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // 检查是否有未绑定代理的账号
  const accountsWithoutProxy = accounts.filter(a => !a.has_proxy);

  const handleLogin = async (id: string) => {
    try {
      toast.loading('正在登录...', { id: `login-${id}` });
      // 调用 agent API 登录
      await fetch(`/api/v1/agents/accounts/${id}/login`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      toast.success('登录成功', { id: `login-${id}` });
    } catch {
      toast.error('登录失败', { id: `login-${id}` });
    }
  };

  const handlePost = async (id: string) => {
    const content = prompt('请输入发帖内容：');
    if (!content) return;
    try {
      toast.loading('正在发帖...', { id: `post-${id}` });
      await fetch(`/api/v1/agents/accounts/${id}/post`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ content })
      });
      toast.success('发帖成功', { id: `post-${id}` });
    } catch {
      toast.error('发帖失败', { id: `post-${id}` });
    }
  };

  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async (id: string, tenantId: string, username: string) => {
    confirm({
      title: '删除账号',
      description: `确定删除账号「${username}」？`,
      onConfirm: async () => {
        try {
          await platformsAPI.delete(tenantId, id);
          toast.success('已删除');
          fetchAccounts();
        } catch {
          toast.error('删除失败');
        }
      },
    });
  };

  const columns: Column<AccountWithTenant>[] = [
    { key: 'tenant_name', title: '住户', width: '120px',
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.tenant_name || '—'}</span>
      ),
    },
    { key: 'account_username', title: '账号名称', width: '160px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!row.has_proxy && (
            <span
              title="未绑定代理IP，有封号风险"
              style={{ color: 'var(--error)', cursor: 'help', display: 'flex', alignItems: 'center' }}
            >
              ⚠️
            </span>
          )}
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.account_username}</span>
        </div>
      ),
    },
    { key: 'platform', title: '平台', width: '90px',
      render: (row) => (
        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'var(--gray-800)', color: 'var(--text-primary)' }}>
          {row.platform}
        </span>
      ),
    },
    { key: 'account_email', title: '邮箱', width: '160px',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.account_email || '—'}</span>
      ),
    },
    { key: 'updated_at', title: '更新时间', width: '130px',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {new Date(row.updated_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    { key: 'status', title: '状态', width: '70px',
      render: (row) => (
        <span style={{
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 20,
          background: row.status === 'active' ? 'rgba(76,175,80,0.2)' : 'rgba(100,100,100,0.2)',
          color: row.status === 'active' ? 'var(--success)' : 'var(--text-secondary)',
        }}>
          {row.status === 'active' ? '正常' : row.status || '未知'}
        </span>
      ),
    },
    { key: 'actions', title: '操作', width: '150px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => handleLogin(row.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--error)' }}
            title="登录"
          >
            <RiLoginBoxLine size={17} />
          </button>
          <button
            onClick={() => handlePost(row.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--success)' }}
            title="发帖"
          >
            <RiSendPlaneLine size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.tenant_id, row.account_username)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--error)' }}
            title="删除"
          >
            <RiDeleteBinLine size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)', minHeight: '100vh', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-6">
            账号管理
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            共 {accounts.length} 个账号
            {accountsWithoutProxy.length > 0 && (
              <span style={{ color: 'var(--error)' }}>，{accountsWithoutProxy.length} 个未绑定代理</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchAccounts}
          style={{ background: 'var(--gray-800)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RiRefreshLine size={16} />
          刷新
        </button>
      </div>

      {/* 未绑定代理提示条 */}
      {accountsWithoutProxy.length > 0 && (
        <div style={{
          background: 'var(--error)',
          borderRadius: 14,
          padding: '14px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <RiErrorWarningLine size={20} color="'var(--text-primary)'" />
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)' }}>
            部分账号未绑定代理IP，请尽快配置以降低封号风险
          </p>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={accounts}
          rowKey={(r) => r.id}
          loading={loading}
          emptyText="暂无账号"
        />
      </div>
      {dialog}
    </div>
  );
};

export default AccountListPage;
